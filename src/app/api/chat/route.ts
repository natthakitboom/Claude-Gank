import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// GET /api/chat — list all chats (optionally filter by agent_id)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const db = getDb()

    let query = `
      SELECT c.*, a.name as agent_name, a.sprite as agent_sprite, a.color as agent_color, a.role as agent_role,
             (SELECT COUNT(*) FROM chat_messages WHERE chat_id = c.id) as message_count,
             (SELECT content FROM chat_messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM chats c
      JOIN agents a ON c.agent_id = a.id
    `
    const params: string[] = []
    if (agentId) {
      query += ' WHERE c.agent_id = ?'
      params.push(agentId)
    }
    query += ' ORDER BY c.updated_at DESC LIMIT 50'

    const chats = db.prepare(query).all(...params)
    return NextResponse.json(chats)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST /api/chat — create a new chat
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const db = getDb()
    const id = `chat-${uuidv4().slice(0, 8)}`

    db.prepare(`
      INSERT INTO chats (id, agent_id, title)
      VALUES (?, ?, ?)
    `).run(id, body.agent_id, body.title || 'New Chat')

    const chat = db.prepare(`
      SELECT c.*, a.name as agent_name, a.sprite as agent_sprite, a.color as agent_color, a.role as agent_role
      FROM chats c JOIN agents a ON c.agent_id = a.id WHERE c.id = ?
    `).get(id)

    return NextResponse.json(chat, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
