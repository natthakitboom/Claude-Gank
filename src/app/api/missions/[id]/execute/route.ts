import { spawn } from 'child_process'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { autoNotify } from '@/app/api/notify/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CLAUDE_CLI = '/Users/natthakit.s/.local/bin/claude'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const db = getDb()

  const mission = db.prepare(`
    SELECT m.*, a.name as agent_name, a.sprite as agent_sprite, a.model as agent_model,
           a.system_prompt as agent_system_prompt, a.personality as agent_personality
    FROM missions m JOIN agents a ON m.agent_id = a.id WHERE m.id = ?
  `).get(params.id) as Record<string, string> | undefined

  if (!mission) {
    return new Response('Mission not found', { status: 404 })
  }

  if (mission.status === 'running') {
    return new Response('Mission already running', { status: 400 })
  }

  db.prepare("UPDATE missions SET status = 'running' WHERE id = ?").run(params.id)
  db.prepare("UPDATE agents SET status = 'working' WHERE id = ?").run(mission.agent_id)

  const memories = db.prepare(`
    SELECT content FROM memory WHERE agent_id = ? ORDER BY importance DESC, created_at DESC LIMIT 5
  `).all(mission.agent_id) as { content: string }[]

  const memoryContext = memories.length > 0
    ? `\n\n## ความทรงจำล่าสุดของคุณ:\n${memories.map((m, i) => `${i + 1}. ${m.content}`).join('\n')}`
    : ''

  const systemPrompt = `${mission.agent_system_prompt}${memoryContext}

## บุคลิก: ${mission.agent_personality}
## วันที่ปัจจุบัน: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}

คุณกำลังทำงานในฐานะ AI Agent ในระบบ Multi-Agent Dashboard ตอบให้ครบถ้วนและมีประโยชน์`

  const userPrompt = `## ภารกิจ: ${mission.title}\n\n${mission.description}`

  const encoder = new TextEncoder()
  let fullOutput = ''

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send({ type: 'start', mission_id: params.id, agent: mission.agent_name })

      try {
        const modelArg = mission.agent_model || 'claude-haiku-4-5-20251001'

        const child = spawn(CLAUDE_CLI, [
          '--print',
          '--verbose',
          '--output-format', 'stream-json',
          '--include-partial-messages',
          '--model', modelArg,
          '--no-session-persistence',
          '--dangerously-skip-permissions',
          '--append-system-prompt', systemPrompt,
        ], {
          env: { ...process.env, HOME: '/Users/natthakit.s' },
          cwd: '/tmp',
        })

        child.stdin.write(userPrompt)
        child.stdin.end()

        let buffer = ''
        let lastTextLength = 0
        let lastSaveLength = 0

        const saveIncremental = () => {
          if (fullOutput.length - lastSaveLength > 200) {
            db.prepare("UPDATE missions SET output = ? WHERE id = ?").run(fullOutput, params.id)
            lastSaveLength = fullOutput.length
          }
        }

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
                      saveIncremental()
                    }
                  }
                }
              }
            } catch {}
          }
        })

        child.stderr.on('data', (chunk: Buffer) => {
          console.error('[claude-cli]', chunk.toString().trim())
        })

        await new Promise<void>((resolve, reject) => {
          child.on('close', (code) => {
            // ถ้ามี output แล้ว ถือว่าสำเร็จไม่ว่า exit code จะเป็นอะไร
            if (fullOutput.length > 0 || code === 0 || code === null) resolve()
            else reject(new Error(`claude CLI exited with code ${code}`))
          })
          child.on('error', reject)
        })

        const estimatedTokens = Math.round(fullOutput.length / 4)

        db.prepare(`
          UPDATE missions SET status = 'done', output = ?, tokens_used = ?, completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(fullOutput, estimatedTokens, params.id)

        db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(mission.agent_id)

        // --- Smart memory saving ---
        // For [Skill Update] missions: extract ---KEY LEARNINGS--- block, save with high importance
        // For regular missions: save first 200 chars as before
        const isSkillUpdate = mission.title?.includes('[Skill Update]')
        const keyLearnMatch = fullOutput.match(/---KEY LEARNINGS---\s*([\s\S]*?)(?:---END---|$)/)

        let memContent: string
        let memImportance: number

        if (keyLearnMatch && keyLearnMatch[1].trim().length > 0) {
          // Structured KEY LEARNINGS block found — save it fully (up to 2000 chars)
          memContent = `[Skill Update] ${mission.agent_name}:\n${keyLearnMatch[1].trim().slice(0, 2000)}`
          memImportance = 9
        } else if (isSkillUpdate) {
          // Skill update but no structured block — save more of the output
          memContent = `[Skill Update] ${mission.agent_name}:\n${fullOutput.slice(0, 1500)}`
          memImportance = 8
        } else {
          // Regular mission — save short summary as before
          memContent = `ภารกิจ: ${mission.title} - ${fullOutput.slice(0, 200)}...`
          memImportance = 7
        }

        const memId = `mem-${uuidv4().slice(0, 8)}`
        db.prepare(`
          INSERT INTO memory (id, agent_id, mission_id, content, summary, importance)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(memId, mission.agent_id, params.id, memContent, mission.title, memImportance)

        const msgId = `msg-${uuidv4().slice(0, 8)}`
        db.prepare(`
          INSERT INTO messages (id, from_agent, mission_id, type, content)
          VALUES (?, ?, ?, 'result', ?)
        `).run(msgId, mission.agent_id, params.id, `เสร็จสิ้นภารกิจ: ${mission.title}`)

        // Auto-notify with rich content
        const notifyEvent = isSkillUpdate ? 'skill_update' : 'done'
        const outputPreview = fullOutput.replace(/---KEY LEARNINGS---[\s\S]*/, '').trim().slice(0, 3000)
        const notifyMsg = [
          `✅ Mission completed successfully`,
          ``,
          `📊 Tokens: ${estimatedTokens.toLocaleString()} | Output: ${fullOutput.length.toLocaleString()} chars`,
          ``,
          `💬 Output:`,
          outputPreview + (fullOutput.length > 3000 ? '\n\n... (ดูต่อใน Dashboard)' : ''),
        ].join('\n')
        autoNotify(
          notifyEvent as 'done' | 'skill_update',
          mission.title,
          notifyMsg,
          mission.agent_name,
          mission.agent_id,
        )

        send({
          type: 'done',
          mission_id: params.id,
          tokens_used: estimatedTokens,
          output_length: fullOutput.length,
        })

        controller.close()
      } catch (error) {
        const errMsg = String(error)

        if (fullOutput.length > 0) {
          // Agent produced output — streaming error only, treat as success
          const estimatedTokens = Math.round(fullOutput.length / 4)
          db.prepare(`
            UPDATE missions SET status = 'done', output = ?, tokens_used = ?, completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(fullOutput, estimatedTokens, params.id)
          db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(mission.agent_id)

          const memId = `mem-${uuidv4().slice(0, 8)}`
          const isSkillUpdateErr = mission.title?.includes('[Skill Update]')
          const keyLearnMatchErr = fullOutput.match(/---KEY LEARNINGS---\s*([\s\S]*?)(?:---END---|$)/)
          let memContentErr: string
          let memImportanceErr: number
          if (keyLearnMatchErr && keyLearnMatchErr[1].trim().length > 0) {
            memContentErr = `[Skill Update] ${mission.agent_name}:\n${keyLearnMatchErr[1].trim().slice(0, 2000)}`
            memImportanceErr = 9
          } else if (isSkillUpdateErr) {
            memContentErr = `[Skill Update] ${mission.agent_name}:\n${fullOutput.slice(0, 1500)}`
            memImportanceErr = 8
          } else {
            memContentErr = `ภารกิจ: ${mission.title} - ${fullOutput.slice(0, 200)}...`
            memImportanceErr = 7
          }
          db.prepare(`
            INSERT INTO memory (id, agent_id, mission_id, content, summary, importance)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(memId, mission.agent_id, params.id, memContentErr, mission.title, memImportanceErr)

          const msgId = `msg-${uuidv4().slice(0, 8)}`
          db.prepare(`
            INSERT INTO messages (id, from_agent, mission_id, type, content)
            VALUES (?, ?, ?, 'result', ?)
          `).run(msgId, mission.agent_id, params.id, `เสร็จสิ้นภารกิจ: ${mission.title}`)
        } else {
          // No output — real failure, escalate
          db.prepare("UPDATE missions SET status = 'failed', error = ? WHERE id = ?").run(errMsg, params.id)
          db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(mission.agent_id)

          // Auto-notify failure
          const failNotifyMsg = [
            `❌ Mission failed!`,
            ``,
            `⚠️ Error:`,
            errMsg.slice(0, 500),
            ``,
            `💡 กด RETRY ใน dashboard เพื่อลองใหม่`,
          ].join('\n')
          autoNotify('failed', mission.title, failNotifyMsg, mission.agent_name, mission.agent_id)

          const escalationLevel = (mission as any).escalation_level || 0
          if (escalationLevel < 2) {
            fetch('http://localhost:3000/api/escalate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ missionId: params.id }),
            }).catch(() => {})
          }
        }

        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`)) } catch {}
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
