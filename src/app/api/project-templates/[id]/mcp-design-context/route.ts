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

function inferFileName(url: string): string {
  try {
    const u = new URL(url)
    const openFile = u.searchParams.get('open_file')
    if (openFile) return openFile.replace(/\.html$/i, '').replace(/[_+-]+/g, ' ').trim()
  } catch {}
  const match = url.match(/open_file=([^&]+)/)
  if (match) return decodeURIComponent(match[1]).replace(/\.html$/i, '').replace(/[_+-]+/g, ' ')
  return ''
}

function extractUrl(raw: string): string {
  const match = raw.match(/https?:\/\/\S+/)
  return match ? match[0] : raw.trim()
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params
    const body = await request.json() as {
      mcp_url?: string
      mcp_urls?: string[]
      name?: string
      description?: string
      tech_stack?: string
    }

    const rawEntries: string[] = body.mcp_urls?.filter(u => u.trim()) ??
      (body.mcp_url?.trim() ? [body.mcp_url] : [])

    if (rawEntries.length === 0) {
      return NextResponse.json({ error: 'mcp_url is required' }, { status: 400 })
    }

    const sources = rawEntries.map(raw => {
      const url = extractUrl(raw)
      return { url, name: inferFileName(url) || 'Design File' }
    })

    const projectName = body.name || sources.map(s => s.name).join(' + ')
    const techStack = body.tech_stack || 'Next.js + TypeScript'
    const description = body.description || ''

    // Generate a structured design context template using project metadata
    // (Claude Design URLs require browser session auth — cannot be fetched via API)
    const prompt = `You are a design system documenter for a Thai tech company.

Project: "${projectName}"
${description ? `Description: ${description}` : ''}
Tech Stack: ${techStack}
Design Files:
${sources.map(s => `- ${s.name} (${s.url})`).join('\n')}

Generate a practical **design context template** for a frontend AI agent working on this project.
Use the project/file names above to infer the likely design style (e.g. admin dashboard vs. customer-facing store).

Write in Thai mixed with English technical terms. Output exactly this structure:

## Design Context — ${projectName}

### Visual Style
**Primary Color:** [เช่น #1a1a2e หรือ brand color ที่เหมาะกับ ${projectName}]
**Secondary Color:** [accent / highlight color]
**Background:** [main bg color]
**Text:** [primary text color + secondary text color]
**Typography:** [font family + heading/body sizes]
**Spacing:** [base unit เช่น 8px, common patterns]
**Border Radius:** [card, button, input radius]

### Component Patterns
[อธิบาย UI components หลักสำหรับ ${projectName} — navbar, sidebar, cards, tables, forms, buttons]

### Design Principles
[tone, brand personality, UX philosophy ที่เหมาะกับ project นี้]

### Agent Rules
- [rule 1 — สิ่งที่ agent ต้องทำเสมอ]
- [rule 2]
- [rule 3]

---
> 📋 **วิธีใช้:** เปิด design URL ใน browser → copy spec จริง → แทนที่ placeholder ด้านบน
> Design sources: ${sources.map(s => s.url).join(', ')}

Be specific and realistic based on the project type. Don't be generic.`

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
        else reject(new Error(`CLI exit ${code} — ${errOutput.slice(0, 300)}`))
      })
      child.on('error', (err) => { clearTimeout(timer); reject(err) })
    })

    return NextResponse.json({ ok: true, context: output.trim() })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
