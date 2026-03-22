import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const db = getDb()

    let query = `
      SELECT msg.*,
        fa.name as from_agent_name, fa.sprite as from_agent_sprite,
        ta.name as to_agent_name, ta.sprite as to_agent_sprite
      FROM messages msg
      LEFT JOIN agents fa ON msg.from_agent = fa.id
      LEFT JOIN agents ta ON msg.to_agent = ta.id
      WHERE 1=1
    `
    const params: string[] = []

    if (agentId) {
      query += ' AND (msg.from_agent = ? OR msg.to_agent = ?)'
      params.push(agentId, agentId)
    }

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200)
    query += ` ORDER BY msg.created_at DESC LIMIT ?`
    params.push(String(limit))

    const messages = db.prepare(query).all(...params)
    return NextResponse.json(messages)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const db = getDb()
    const id = `msg-${uuidv4().slice(0, 8)}`

    db.prepare(`
      INSERT INTO messages (id, from_agent, to_agent, mission_id, type, content, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, body.from_agent, body.to_agent || null, body.mission_id || null,
      body.type || 'message', body.content, body.metadata_json || '{}'
    )

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id)
    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
