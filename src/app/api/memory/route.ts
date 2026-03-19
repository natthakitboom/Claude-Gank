import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const db = getDb()

    let query = `
      SELECT mem.*, a.name as agent_name, a.sprite as agent_sprite, a.color as agent_color
      FROM memory mem JOIN agents a ON mem.agent_id = a.id WHERE 1=1
    `
    const params: string[] = []

    if (agentId) {
      query += ' AND mem.agent_id = ?'
      params.push(agentId)
    }

    query += ' ORDER BY mem.importance DESC, mem.created_at DESC LIMIT 50'

    const memories = db.prepare(query).all(...params)
    return NextResponse.json(memories)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const db = getDb()
    const id = `mem-${uuidv4().slice(0, 8)}`

    db.prepare(`
      INSERT INTO memory (id, agent_id, mission_id, content, summary, importance, tags_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, body.agent_id, body.mission_id || null,
      body.content, body.summary || null,
      body.importance || 5, body.tags_json || '[]'
    )

    const memory = db.prepare('SELECT * FROM memory WHERE id = ?').get(id)
    return NextResponse.json(memory, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const db = getDb()
    db.prepare('DELETE FROM memory WHERE id = ?').run(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
