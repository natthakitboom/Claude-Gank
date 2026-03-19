import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// GET /api/chat/:id — get chat with all messages
export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const db = getDb()

    const chat = db.prepare(`
      SELECT c.*, a.name as agent_name, a.sprite as agent_sprite, a.color as agent_color,
             a.role as agent_role, a.model as agent_model
      FROM chats c JOIN agents a ON c.agent_id = a.id WHERE c.id = ?
    `).get(params.id) as Record<string, string> | undefined

    if (!chat) return new Response('Chat not found', { status: 404 })

    const messages = db.prepare(`
      SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC
    `).all(params.id)

    return NextResponse.json({ ...chat, messages })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// DELETE /api/chat/:id — delete chat and all messages
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    db.prepare('DELETE FROM chat_messages WHERE chat_id = ?').run(params.id)
    db.prepare('DELETE FROM chats WHERE id = ?').run(params.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
