import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// GET /api/templates — list all mission templates
export async function GET() {
  try {
    const db = getDb()
    const templates = db.prepare(`
      SELECT t.*, a.name as agent_name, a.sprite as agent_sprite, a.team as agent_team
      FROM mission_templates t
      LEFT JOIN agents a ON t.default_agent_id = a.id
      ORDER BY t.usage_count DESC, t.created_at ASC
    `).all()
    return NextResponse.json(templates)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// PATCH /api/templates — increment usage count
export async function PATCH(request: Request) {
  try {
    const { id } = await request.json()
    const db = getDb()
    db.prepare('UPDATE mission_templates SET usage_count = usage_count + 1 WHERE id = ?').run(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
