import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { calculateNextRun } from '@/lib/scheduler'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getDb()
  const jobs = db.prepare(`
    SELECT j.*, a.name as agent_name, a.team as agent_team
    FROM scheduled_jobs j JOIN agents a ON j.agent_id = a.id
    ORDER BY j.next_run_at ASC
  `).all()
  return NextResponse.json(jobs)
}

export async function POST(request: Request) {
  const db = getDb()
  const body = await request.json()
  const id = `job-${uuidv4().slice(0, 8)}`

  const next = calculateNextRun({
    frequency: body.frequency,
    run_time: body.run_time || null,
    day_of_week: body.day_of_week ?? null,
    interval_hours: body.interval_hours ?? null,
  })

  db.prepare(`
    INSERT INTO scheduled_jobs (id, title, description, agent_id, priority, frequency, run_time, day_of_week, interval_hours, next_run_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, body.title, body.description, body.agent_id, body.priority || 'normal',
    body.frequency, body.run_time || null, body.day_of_week ?? null, body.interval_hours ?? null, next)

  const job = db.prepare(`
    SELECT j.*, a.name as agent_name, a.team as agent_team
    FROM scheduled_jobs j JOIN agents a ON j.agent_id = a.id WHERE j.id = ?
  `).get(id)

  return NextResponse.json(job, { status: 201 })
}

export async function DELETE(request: Request) {
  const db = getDb()
  const { id } = await request.json()
  db.prepare(`DELETE FROM scheduled_jobs WHERE id = ?`).run(id)
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const db = getDb()
  const { id, enabled } = await request.json()
  db.prepare(`UPDATE scheduled_jobs SET enabled = ? WHERE id = ?`).run(enabled ? 1 : 0, id)
  return NextResponse.json({ ok: true })
}
