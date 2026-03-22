import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const db = getDb()
    const { metadata_json, read } = body

    if (metadata_json !== undefined) {
      db.prepare('UPDATE messages SET metadata_json = ? WHERE id = ?').run(metadata_json, params.id)
    }
    if (read !== undefined) {
      db.prepare('UPDATE messages SET read = ? WHERE id = ?').run(read ? 1 : 0, params.id)
    }

    const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(params.id)
    return NextResponse.json(msg)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    const msg = db.prepare(`
      SELECT msg.*,
        fa.name as from_agent_name, fa.sprite as from_agent_sprite,
        ta.name as to_agent_name, ta.sprite as to_agent_sprite
      FROM messages msg
      LEFT JOIN agents fa ON msg.from_agent = fa.id
      LEFT JOIN agents ta ON msg.to_agent = ta.id
      WHERE msg.id = ?
    `).get(params.id)
    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(msg)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
