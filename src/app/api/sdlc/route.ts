import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM sdlc_config WHERE id = ?').get('default') as any
    if (!row) return NextResponse.json({ error: 'No config' }, { status: 404 })
    return NextResponse.json({ ...row, config: JSON.parse(row.config_json) })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const db = getDb()
    db.prepare(`
      INSERT INTO sdlc_config (id, config_json, updated_at)
      VALUES ('default', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET config_json = ?, updated_at = CURRENT_TIMESTAMP
    `).run(JSON.stringify(body.config), JSON.stringify(body.config))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
