import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { execSync } from 'child_process'
import os from 'os'

// Common install locations to try when no path is saved yet
const CANDIDATE_PATHS = [
  'claude', // in PATH already
  `${os.homedir()}/.local/bin/claude`,
  '/usr/local/bin/claude',
  '/opt/homebrew/bin/claude',
  '/usr/bin/claude',
  `${os.homedir()}/.npm-global/bin/claude`,
  '/opt/local/bin/claude',
]

function detectClaudePath(): string | null {
  // First try: which claude
  try {
    const found = execSync('which claude', { timeout: 3000 }).toString().trim()
    if (found) return found
  } catch {}

  // Fallback: try known locations
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

    // Auto-detect: if not set yet (default 'claude'), try to find real path
    if (!saved || saved === 'claude') {
      const detected = detectClaudePath()
      if (detected && detected !== 'claude') {
        // Auto-save detected path
        db.prepare(`UPDATE system_config SET claude_cli_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'default'`).run(detected)
        return NextResponse.json({ ...row, claude_cli_path: detected, auto_detected: true })
      }
    }

    return NextResponse.json(row || { claude_cli_path: 'claude' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { claude_cli_path } = await req.json()
    if (!claude_cli_path) return NextResponse.json({ error: 'claude_cli_path required' }, { status: 400 })

    const db = getDb()
    db.prepare(`
      UPDATE system_config SET claude_cli_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'default'
    `).run(claude_cli_path.trim())

    // verify the path actually works
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
