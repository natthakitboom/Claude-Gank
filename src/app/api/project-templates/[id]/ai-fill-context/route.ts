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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params
    const body = await request.json() as {
      figma_url?: string
      name?: string
      description?: string
      tech_stack?: string
      figma_context?: string
    }

    const { figma_url, name, description, tech_stack, figma_context } = body

    const prompt = `You are a design system documenter. Generate a concise design context for an AI frontend development agent.

Project info:
- Name: ${name || '(not provided)'}
- Description: ${description || '(not provided)'}
- Tech Stack: ${tech_stack || '(not provided)'}
- Figma URL: ${figma_url || '(not provided)'}
${figma_context ? `\nExtracted Figma data:\n${figma_context}` : ''}

Write a practical design context that a frontend AI agent will use when building UI components. Include:
1. Visual style summary (colors, typography, spacing if known)
2. Component patterns and naming conventions
3. Design principles and tone
4. Any constraints or rules for the UI

Keep it under 400 words. Write in Thai mixed with English technical terms. Be specific and actionable, not generic.`

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
      const timer = setTimeout(() => { child.kill(); reject(new Error('timeout after 40s')) }, 40000)
      child.on('close', (code) => {
        clearTimeout(timer)
        if (output.length > 0) resolve()
        else reject(new Error(`CLI exit ${code} — ${errOutput.slice(0, 200)}`))
      })
      child.on('error', (err) => { clearTimeout(timer); reject(err) })
    })

    return NextResponse.json({ ok: true, context: output.trim() })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
