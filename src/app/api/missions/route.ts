import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const dateRange = searchParams.get('date') // today, week, month, all
    const db = getDb()

    let query = `
      SELECT m.*, a.name as agent_name, a.sprite as agent_sprite, a.color as agent_color, a.team as agent_team
      FROM missions m
      JOIN agents a ON m.agent_id = a.id
      WHERE 1=1
    `
    const params: string[] = []

    if (agentId) {
      query += ' AND m.agent_id = ?'
      params.push(agentId)
    }
    if (status) {
      query += ' AND m.status = ?'
      params.push(status)
    }
    if (search) {
      query += ' AND (m.title LIKE ? OR m.description LIKE ? OR a.name LIKE ?)'
      const term = `%${search}%`
      params.push(term, term, term)
    }
    if (dateRange === 'today') {
      // Use last 24 hours to avoid timezone issues (SQLite uses UTC internally)
      query += " AND m.created_at >= datetime('now', '-24 hours')"
    } else if (dateRange === 'week') {
      query += " AND m.created_at >= date('now', '-7 days')"
    } else if (dateRange === 'month') {
      query += " AND m.created_at >= date('now', '-30 days')"
    }

    query += ' ORDER BY m.created_at DESC LIMIT 200'

    const missions = db.prepare(query).all(...params)
    return NextResponse.json(missions)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const db = getDb()
    const id = `mission-${uuidv4().slice(0, 8)}`

    db.prepare(`
      INSERT INTO missions (id, title, description, agent_id, priority, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, body.title, body.description, body.agent_id, body.priority || 'normal', body.scheduled_at || null)

    const mission = db.prepare(`
      SELECT m.*, a.name as agent_name, a.sprite as agent_sprite, a.color as agent_color
      FROM missions m JOIN agents a ON m.agent_id = a.id WHERE m.id = ?
    `).get(id)

    // auto_run: true → fire execute immediately in background (fire-and-forget)
    if (body.auto_run) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      fetch(`${baseUrl}/api/missions/${id}/execute`, { method: 'POST' }).catch((e) => console.error('[auto_run] spawn failed for mission', id, e.message))
    }

    return NextResponse.json(mission, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
