import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import os from 'os'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getClaudeCLI(): string {
  try {
    const db = getDb()
    const row = db.prepare('SELECT claude_cli_path FROM system_config WHERE id = ?').get('default') as { claude_cli_path?: string } | undefined
    if (row?.claude_cli_path) return row.claude_cli_path
  } catch {}
  return process.env.CLAUDE_CLI_PATH || 'claude'
}

interface AgentInput {
  id: string
  name: string
  role: string
  team: string
  model: string
}

export async function POST(req: Request) {
  try {
    const { agents } = await req.json() as { agents: AgentInput[] }
    if (!agents?.length) return NextResponse.json({ error: 'agents required' }, { status: 400 })

    const agentList = agents.map(a =>
      `- ID: ${a.id} | Name: ${a.name} | Team: ${a.team} | Role: ${a.role}`
    ).join('\n')

    const prompt = `You are a Claude AI agent orchestration expert. Analyze each agent below and assign the most appropriate effort level.

Effort levels:
- "low" — งานง่าย, รายงาน, สรุป, ดึงข้อมูล, งานซ้ำ, support ทั่วไป
- "normal" — งานมาตรฐาน, coding ทั่วไป, วิเคราะห์ปานกลาง, coordination
- "high" — งานซับซ้อน, architecture, security, critical decisions, creative strategy, senior-level reasoning

Agents to analyze:
${agentList}

Rules:
- Core/Lead/Architect/Senior agents → "high"
- Security/DevOps/Database critical agents → "high"
- Standard Dev/QA/Analyst agents → "normal"
- Support/Report/Simple task agents → "low"
- Use agent name + role to decide, not just team

Respond ONLY with a valid JSON object mapping agent ID to effort. No explanation, no markdown, no code block. Example:
{"agent-id-1":"high","agent-id-2":"normal","agent-id-3":"low"}`

    const cli = getClaudeCLI()
    const homeDir = os.homedir()
    const spawnEnv: NodeJS.ProcessEnv = {
      ...process.env,
      HOME: homeDir,
      PATH: process.env.PATH || `/usr/local/bin:/usr/bin:/bin:${homeDir}/.local/bin`,
      ANTHROPIC_API_KEY: undefined,
      CLAUDE_CODE_SSE_PORT: undefined,
    }

    const child = spawn(cli, [
      '--print',
      '--model', 'claude-haiku-4-5-20251001',
      '--no-session-persistence',
      '--dangerously-skip-permissions',
    ], { env: spawnEnv, cwd: homeDir })

    child.stdin.write(prompt)
    child.stdin.end()

    let output = ''
    let errOutput = ''
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { errOutput += chunk.toString() })

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error('timeout after 30s')) }, 30000)
      child.on('close', (code) => {
        clearTimeout(timer)
        if (output.length > 0) resolve()
        else reject(new Error(`CLI exit ${code} — ${errOutput.slice(0, 200)}`))
      })
      child.on('error', (err) => { clearTimeout(timer); reject(err) })
    })

    // Extract JSON from output
    const jsonMatch = output.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'AI did not return valid JSON' }, { status: 500 })

    const recommendations = JSON.parse(jsonMatch[0]) as Record<string, string>

    // Validate effort values
    const valid = ['low', 'normal', 'high']
    for (const [id, effort] of Object.entries(recommendations)) {
      if (!valid.includes(effort)) {
        recommendations[id] = 'normal'
      }
    }

    return NextResponse.json({ ok: true, recommendations })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
