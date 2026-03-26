import { spawn } from 'child_process'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getClaudeCLI(db: any): string {
  try {
    const row = db.prepare('SELECT claude_cli_path FROM system_config WHERE id = ?').get('default') as any
    if (row?.claude_cli_path) return row.claude_cli_path
  } catch {}
  return process.env.CLAUDE_CLI_PATH || 'claude'
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const db = getDb()
  const body = await request.json()
  const userContent = body.message

  if (!userContent) return new Response('Message required', { status: 400 })

  const chat = db.prepare(`
    SELECT c.*, a.name as agent_name, a.model as agent_model,
           a.system_prompt as agent_system_prompt, a.personality as agent_personality
    FROM chats c JOIN agents a ON c.agent_id = a.id WHERE c.id = ?
  `).get(params.id) as Record<string, string> | undefined

  if (!chat) return new Response('Chat not found', { status: 404 })

  // Save user message
  const userMsgId = `msg-${uuidv4().slice(0, 8)}`
  db.prepare(`INSERT INTO chat_messages (id, chat_id, role, content) VALUES (?, ?, 'user', ?)`)
    .run(userMsgId, params.id, userContent)

  // Load conversation history
  const history = db.prepare(`
    SELECT role, content FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC
  `).all(params.id) as { role: string; content: string }[]

  // Load agent memories
  const memories = db.prepare(`
    SELECT content FROM memory WHERE agent_id = ? ORDER BY importance DESC, created_at DESC LIMIT 5
  `).all(chat.agent_id) as { content: string }[]

  const memoryContext = memories.length > 0
    ? `\n\n## ความทรงจำล่าสุดของคุณ:\n${memories.map((m, i) => `${i + 1}. ${m.content}`).join('\n')}`
    : ''

  const systemPrompt = `${chat.agent_system_prompt}${memoryContext}

## บุคลิก: ${chat.agent_personality}
## วันที่ปัจจุบัน: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}

คุณกำลังสนทนาแบบ interactive กับผู้ใช้ ตอบให้เป็นธรรมชาติและมีประโยชน์`

  // Build full conversation prompt
  const conversationPrompt = history
    .map(m => m.role === 'user' ? `[User]: ${m.content}` : `[${chat.agent_name}]: ${m.content}`)
    .join('\n\n')

  const encoder = new TextEncoder()
  let fullOutput = ''

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send({ type: 'start', chat_id: params.id })

      try {
        const modelArg = chat.agent_model || 'claude-haiku-4-5-20251001'

        const child = spawn(getClaudeCLI(db), [
          '--print',
          '--verbose',
          '--output-format', 'stream-json',
          '--include-partial-messages',
          '--model', modelArg,
          '--no-session-persistence',
          '--dangerously-skip-permissions',
          '--append-system-prompt', systemPrompt,
        ], {
          env: { ...process.env, HOME: process.env.HOME || '/tmp' },
          cwd: '/tmp',
        })

        child.stdin.write(conversationPrompt)
        child.stdin.end()

        let buffer = ''
        let lastTextLength = 0

        child.stdout.on('data', (chunk: Buffer) => {
          buffer += chunk.toString()
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            try {
              const evt = JSON.parse(trimmed)
              if (evt.type === 'assistant' && evt.message?.content) {
                for (const block of evt.message.content) {
                  if (block.type === 'text') {
                    const newText = (block.text as string).slice(lastTextLength)
                    if (newText) {
                      fullOutput += newText
                      send({ type: 'chunk', text: newText })
                      lastTextLength = (block.text as string).length
                    }
                  }
                }
              }
            } catch {}
          }
        })

        child.stderr.on('data', () => {})

        await new Promise<void>((resolve, reject) => {
          const killTimer = setTimeout(() => {
            child.kill('SIGTERM')
            setTimeout(() => child.kill('SIGKILL'), 3000)
            reject(new Error('Chat timed out after 5 minutes'))
          }, 5 * 60 * 1000)

          child.on('close', (code) => {
            clearTimeout(killTimer)
            if (fullOutput.length > 0 || code === 0 || code === null) resolve()
            else reject(new Error(`claude CLI exited with code ${code}`))
          })
          child.on('error', (err) => {
            clearTimeout(killTimer)
            reject(err)
          })
        })

        // Save assistant message
        const assistantMsgId = `msg-${uuidv4().slice(0, 8)}`
        const tokens = Math.round(fullOutput.length / 4)
        db.prepare(`INSERT INTO chat_messages (id, chat_id, role, content, tokens_used) VALUES (?, ?, 'assistant', ?, ?)`)
          .run(assistantMsgId, params.id, fullOutput, tokens)

        // Update chat title from first user message if still "New Chat"
        if (chat.title === 'New Chat') {
          const title = userContent.slice(0, 60) + (userContent.length > 60 ? '...' : '')
          db.prepare('UPDATE chats SET title = ? WHERE id = ?').run(title, params.id)
        }

        db.prepare('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(params.id)

        send({ type: 'done', chat_id: params.id, tokens_used: tokens })
        controller.close()
      } catch (error) {
        if (fullOutput.length > 0) {
          const assistantMsgId = `msg-${uuidv4().slice(0, 8)}`
          db.prepare(`INSERT INTO chat_messages (id, chat_id, role, content) VALUES (?, ?, 'assistant', ?)`)
            .run(assistantMsgId, params.id, fullOutput)
          db.prepare('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(params.id)
        }
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`)) } catch {}
        try { controller.close() } catch {}
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
