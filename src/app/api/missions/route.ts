import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// Throttle: run watchdog at most once every 2 minutes across all GET /api/missions calls
let _lastWatchdog = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const dateRange = searchParams.get('date') // today, week, month, all
    const db = getDb()

    // Inline watchdog — runs every 2 min, resets missions stuck running > 10 min
    const now = Date.now()
    if (now - _lastWatchdog > 2 * 60 * 1000) {
      _lastWatchdog = now

      // 1. Reset missions stuck in running > 10 min
      try {
        const stuck = db.prepare(`
          UPDATE missions
          SET status = 'failed',
              error  = 'Mission timed out (stuck in running > 10 minutes)'
          WHERE status = 'running'
            AND started_at IS NOT NULL
            AND datetime(started_at) < datetime('now', '-10 minutes')
        `).run()
        if (stuck.changes > 0) {
          console.log(`[watchdog] ⏱️ Reset ${stuck.changes} mission(s) stuck > 10 min`)
        }
      } catch {}

      // 2. Phase orphan rescue — find waiting_phase/waiting missions whose entire previous phase is done/failed
      //    Happens when server restart kills running missions and advanceProjectPhase never fires
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        const orphaned = db.prepare(`
          SELECT m.id, m.title, m.phase, m.parent_mission_id
          FROM missions m
          WHERE m.status IN ('waiting_phase', 'waiting')
            AND m.parent_mission_id IS NOT NULL
            AND m.phase > 0
            AND NOT EXISTS (
              SELECT 1 FROM missions prev
              WHERE prev.parent_mission_id = m.parent_mission_id
                AND prev.phase = m.phase - 1
                AND prev.status NOT IN ('done', 'failed')
            )
            AND EXISTS (
              SELECT 1 FROM missions prev
              WHERE prev.parent_mission_id = m.parent_mission_id
                AND prev.phase = m.phase - 1
            )
        `).all() as { id: string; title: string; phase: number; parent_mission_id: string }[]

        for (const m of orphaned) {
          console.log(`[watchdog] 🔄 Phase orphan: "${m.title.slice(0, 50)}" (phase ${m.phase}) — re-triggering`)
          db.prepare(`UPDATE missions SET status = 'pending' WHERE id = ?`).run(m.id)
          fetch(`${baseUrl}/api/missions/${m.id}/execute`, { method: 'POST' })
            .catch((e: Error) => console.error(`[watchdog] re-trigger failed for ${m.id}:`, e.message))
        }
        if (orphaned.length > 0) {
          console.log(`[watchdog] 🔄 Rescued ${orphaned.length} orphaned phase mission(s)`)
        }
      } catch {}
    }

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
