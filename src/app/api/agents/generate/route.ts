import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import os from 'os'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getClaudeCLI(): string {
  try {
    const db = getDb()
    const row = db.prepare('SELECT claude_cli_path FROM system_config WHERE id = ?').get('default') as any
    if (row?.claude_cli_path) return row.claude_cli_path
  } catch {}
  return process.env.CLAUDE_CLI_PATH || 'claude'
}

const TEAM_DESC: Record<string, string> = {
  CORE: 'Core team — coordination, strategy, operations',
  TECH: 'Tech team — engineering, development, infrastructure',
  CREATIVE: 'Creative team — design, content, branding',
  BUSINESS: 'Business team — marketing, strategy, analysis',
  FINANCE: 'Finance team — accounting, trading, financial analysis',
}

export async function POST(req: Request) {
  try {
    const { name, role, team } = await req.json()
    if (!name || !role) return NextResponse.json({ error: 'name and role required' }, { status: 400 })

    const userMessage = `Generate a profile for this AI agent:
- Name (Thai): ${name}
- Role: ${role}
- Team: ${team} (${TEAM_DESC[team] || team})

Return ONLY valid JSON, no markdown fences, no explanation:
{
  "name_en": "concise English name 2-3 words",
  "personality": "2-4 personality traits in Thai comma separated",
  "system_prompt": "Full system prompt in Thai starting with คุณคือ... 3-5 sentences covering expertise and working style",
  "sprite": "single most relevant emoji",
  "color": "#hexcolor matching the role"
}`

    const systemPrompt = 'You are a JSON generator. Output ONLY valid JSON with no markdown, no explanation, no extra text.'

    const cli = getClaudeCLI()

    // Use os.homedir() so the CLI can find its OAuth token in ~/.claude/
    // Remove ANTHROPIC_API_KEY — if inherited from Claude Code session it's invalid
    // and causes the CLI to skip OAuth auth. Without it, CLI uses its stored OAuth token.
    const homeDir = os.homedir()
    const spawnEnv: NodeJS.ProcessEnv = {
      ...process.env,
      HOME: homeDir,
      PATH: process.env.PATH || `/usr/local/bin:/usr/bin:/bin:${homeDir}/.local/bin`,
      // Remove ANTHROPIC_API_KEY — if inherited from Claude Code it's invalid and
      // causes CLI to skip its stored OAuth token. Without it, OAuth auth is used.
      ANTHROPIC_API_KEY: undefined,
      CLAUDE_CODE_SSE_PORT: undefined,
    }

    const child = spawn(cli, [
      '--print',
      '--model', 'claude-haiku-4-5-20251001',
      '--no-session-persistence',
      '--dangerously-skip-permissions',
      '--append-system-prompt', systemPrompt,
    ], {
      env: spawnEnv,
      cwd: homeDir,
    })

    child.stdin.write(userMessage)
    child.stdin.end()

    let output = ''
    let errOutput = ''
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { errOutput += chunk.toString() })

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error('timeout after 30s')) }, 30000)
      child.on('close', (code) => {
        clearTimeout(timer)
        console.log(`[generate] exit ${code}, out=${output.length}b, err=${errOutput.length}b`)
        if (errOutput) console.error('[generate] stderr:', errOutput.slice(0, 200))
        if (output.length > 0) resolve()
        else reject(new Error(`CLI exit ${code} — ${errOutput.slice(0, 200)}`))
      })
      child.on('error', (err) => { clearTimeout(timer); reject(err) })
    })

    const jsonMatch = output.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[generate] no JSON in output:', output.slice(0, 300))
      return NextResponse.json({ error: `No JSON in response: ${output.slice(0, 200)}` }, { status: 500 })
    }

    const generated = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      name_en: generated.name_en || '',
      personality: generated.personality || '',
      system_prompt: generated.system_prompt || '',
      sprite: generated.sprite || '🤖',
      color: generated.color || '#3b82f6',
    })
  } catch (e: any) {
    console.error('[generate] error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
