import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { calculateNextRun } from '@/lib/scheduler'
import type { ScheduledJob } from '@/lib/scheduler'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getDb()

  // 1. Fire one-time scheduled missions that are due
  const due = db.prepare(`
    SELECT m.*, a.name as agent_name
    FROM missions m JOIN agents a ON m.agent_id = a.id
    WHERE m.status = 'pending'
      AND m.scheduled_at IS NOT NULL
      AND m.scheduled_at <= datetime('now', 'localtime')
    ORDER BY m.scheduled_at ASC
  `).all() as any[]

  for (const m of due) {
    fetch(`http://localhost:3000/api/missions/${m.id}/execute`, { method: 'POST' })
      .catch(() => {})
  }

  // 2. Fire recurring jobs that are due
  const dueJobs = db.prepare(`
    SELECT j.*, a.name as agent_name, a.team as agent_team
    FROM scheduled_jobs j JOIN agents a ON j.agent_id = a.id
    WHERE j.enabled = 1
      AND j.next_run_at <= datetime('now', 'localtime')
    ORDER BY j.next_run_at ASC
  `).all() as ScheduledJob[]

  for (const job of dueJobs) {
    // Create a new mission for this recurring job
    const missionId = `mission-${uuidv4().slice(0, 8)}`
    db.prepare(`
      INSERT INTO missions (id, title, description, agent_id, priority, status, job_id)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(missionId, job.title, job.description, job.agent_id, job.priority, job.id)

    // Update job: last_run_at + next_run_at
    const nextRun = calculateNextRun(job)
    db.prepare(`
      UPDATE scheduled_jobs SET last_run_at = datetime('now', 'localtime'), next_run_at = ? WHERE id = ?
    `).run(nextRun, job.id)

    // Fire the mission
    fetch(`http://localhost:3000/api/missions/${missionId}/execute`, { method: 'POST' })
      .catch(() => {})
  }

  // Upcoming one-time scheduled missions
  const upcoming = db.prepare(`
    SELECT m.*, a.name as agent_name, a.team as agent_team
    FROM missions m JOIN agents a ON m.agent_id = a.id
    WHERE m.status = 'pending'
      AND m.scheduled_at IS NOT NULL
      AND m.scheduled_at > datetime('now', 'localtime')
    ORDER BY m.scheduled_at ASC
  `).all()

  return NextResponse.json({ fired: due.length + dueJobs.length, upcoming, due })
}
