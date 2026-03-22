import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { calculateNextRun } from '@/lib/scheduler'
import type { ScheduledJob } from '@/lib/scheduler'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

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
    fetch(`${BASE_URL}/api/missions/${m.id}/execute`, { method: 'POST' })
      .catch((e) => console.error('[scheduler] spawn failed for scheduled mission', m.id, e.message))
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
    fetch(`${BASE_URL}/api/missions/${missionId}/execute`, { method: 'POST' })
      .catch((e) => console.error('[scheduler] spawn failed for recurring job', missionId, e.message))
  }

  // 3. Phase orphan rescue — detect waiting/waiting_phase missions whose previous phase is done
  //    Runs every time scheduler is called so projects never get stuck even with no active missions
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
    console.log(`[scheduler/orphan] 🔄 Phase orphan: "${m.title.slice(0, 50)}" (phase ${m.phase}) — re-triggering`)
    db.prepare(`UPDATE missions SET status = 'pending' WHERE id = ?`).run(m.id)
    fetch(`${BASE_URL}/api/missions/${m.id}/execute`, { method: 'POST' })
      .catch((e) => console.error(`[scheduler/orphan] re-trigger failed for ${m.id}:`, e.message))
  }
  if (orphaned.length > 0) {
    console.log(`[scheduler/orphan] ✅ Rescued ${orphaned.length} orphaned phase mission(s)`)
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
