import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  try {
    const db = getDb()
    const agents = db.prepare('SELECT * FROM agents ORDER BY team, name').all() as any[]

    // Derive status from active missions — agent.status can get stale when missions
    // run in background (status='pending' + started_at set = actually executing)
    const activeAgentIds = new Set<string>(
      (db.prepare(`
        SELECT DISTINCT agent_id FROM missions
        WHERE status = 'running'
           OR (status = 'pending' AND started_at IS NOT NULL)
      `).all() as { agent_id: string }[]).map((r) => r.agent_id)
    )

    const result = agents.map((a) => ({
      ...a,
      status: activeAgentIds.has(a.id) ? 'working' : a.status === 'working' ? 'idle' : a.status,
    }))

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const db = getDb()
    const id = `agent-${uuidv4().slice(0, 8)}`

    db.prepare(`
      INSERT INTO agents (id, name, role, team, model, personality, system_prompt, effort, sprite, color, skills_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, body.name, body.role, body.team, body.model || 'claude-haiku-4-5-20251001',
      body.personality || '', body.system_prompt || '', body.effort || 'normal',
      body.sprite || '🤖', body.color || '#3b82f6', body.skills_json || '[]'
    )

    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id)
    return NextResponse.json(agent, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
