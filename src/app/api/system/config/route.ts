import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { execSync } from 'child_process'
import os from 'os'

const CANDIDATE_PATHS = [
  'claude',
  `${os.homedir()}/.local/bin/claude`,
  '/usr/local/bin/claude',
  '/opt/homebrew/bin/claude',
  '/usr/bin/claude',
  `${os.homedir()}/.npm-global/bin/claude`,
  '/opt/local/bin/claude',
]

function detectClaudePath(): string | null {
  try {
    const found = execSync('which claude', { timeout: 3000 }).toString().trim()
    if (found) return found
  } catch {}
  for (const p of CANDIDATE_PATHS.slice(1)) {
    try {
      execSync(`"${p}" --version`, { timeout: 3000 })
      return p
    } catch {}
  }
  return null
}

export async function GET() {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM system_config WHERE id = ?').get('default') as any
    const saved = row?.claude_cli_path || ''

    if (!saved || saved === 'claude') {
      const detected = detectClaudePath()
      if (detected && detected !== 'claude') {
        db.prepare(`UPDATE system_config SET claude_cli_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'default'`).run(detected)
        return NextResponse.json({ ...row, claude_cli_path: detected, auto_detected: true })
      }
    }

    // Fetch ollama models if URL is set
    const ollamaUrl = row?.ollama_base_url || 'http://localhost:11434'
    let ollamaModels: string[] = []
    try {
      const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json()
        ollamaModels = (data.models || []).map((m: any) => m.name)
      }
    } catch {}

    return NextResponse.json({
      ...(row || { claude_cli_path: 'claude' }),
      ollama_models: ollamaModels,
      jira_configured: !!(row?.jira_base_url && row?.jira_email && row?.jira_api_token),
      jira_api_token: undefined,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const db = getDb()

    // Handle Jira config save
    if ('jira_base_url' in body) {
      const { jira_base_url, jira_email, jira_api_token } = body as { jira_base_url: string; jira_email: string; jira_api_token: string }
      const baseUrl = (jira_base_url || '').trim().replace(/\/$/, '')
      const email = (jira_email || '').trim()
      const token = (jira_api_token || '').trim()

      db.prepare(`UPDATE system_config SET jira_base_url = ?, jira_email = ?, jira_api_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'default'`).run(baseUrl, email, token)

      if (!baseUrl || !email || !token) {
        return NextResponse.json({ ok: true, cleared: true })
      }

      try {
        const auth = Buffer.from(`${email}:${token}`).toString('base64')
        const res = await fetch(`${baseUrl}/rest/api/3/myself`, {
          headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) return NextResponse.json({ ok: false, error: `Jira responded ${res.status} — ตรวจสอบ URL, email, และ API token` })
        const data = await res.json()
        return NextResponse.json({ ok: true, display_name: data.displayName, account_id: data.accountId })
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: `Cannot reach Jira at ${baseUrl} — ${e.message}` })
      }
    }

    // Handle ollama config save
    if ('ollama_base_url' in body) {
      const url = (body.ollama_base_url as string).trim().replace(/\/$/, '')
      db.prepare(`UPDATE system_config SET ollama_base_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'default'`).run(url)

      // Test connection + return available models
      try {
        const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) })
        if (!res.ok) return NextResponse.json({ ok: false, error: `Ollama responded ${res.status}` })
        const data = await res.json()
        const models: string[] = (data.models || []).map((m: any) => m.name)
        return NextResponse.json({ ok: true, models })
      } catch (e: any) {
        return NextResponse.json({ ok: false, error: `Cannot reach Ollama at ${url} — is it running?` })
      }
    }

    // Handle claude CLI path save
    const { claude_cli_path } = body
    if (!claude_cli_path) return NextResponse.json({ error: 'claude_cli_path required' }, { status: 400 })

    db.prepare(`UPDATE system_config SET claude_cli_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'default'`).run(claude_cli_path.trim())

    let version = ''
    try {
      version = execSync(`"${claude_cli_path.trim()}" --version`, { timeout: 5000 }).toString().trim()
    } catch {
      return NextResponse.json({ ok: false, error: 'บันทึกแล้ว แต่รัน claude ไม่ได้ — ตรวจสอบ path อีกครั้ง' })
    }

    return NextResponse.json({ ok: true, version })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
