import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { execSync } from 'child_process'

export async function GET() {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM system_config WHERE id = ?').get('default') as any
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
