import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

// GET — โหลด chat history ของ project
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const messages = db.prepare(`
    SELECT id, agent_id, agent_name, role, text, created_at
    FROM ide_chat_messages
    WHERE project_id = ?
    ORDER BY created_at ASC
  `).all(params.id)
  return NextResponse.json({ messages })
}

// POST — บันทึก message เดียว หรือ bulk (array)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const body = await req.json()

  const msgs = Array.isArray(body) ? body : [body]
  const insert = db.prepare(`
    INSERT OR IGNORE INTO ide_chat_messages (id, project_id, agent_id, agent_name, role, text)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction((items: typeof msgs) => {
    for (const m of items) {
      insert.run(
        m.id || `chat-${uuidv4().slice(0, 8)}`,
        params.id,
        m.agent_id || null,
        m.agent_name || null,
        m.role,
        m.text,
      )
    }
  })
  insertMany(msgs)

  return NextResponse.json({ ok: true })
}

// DELETE — ล้าง chat ของ project นี้
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  db.prepare('DELETE FROM ide_chat_messages WHERE project_id = ?').run(params.id)
  return NextResponse.json({ ok: true })
}
