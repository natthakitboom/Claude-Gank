import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 9001}`

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const db = getDb()

  const project = db.prepare('SELECT id, mission_id FROM projects WHERE id = ?').get(params.id) as any
  if (!project?.mission_id) return NextResponse.json({ error: 'project not found' }, { status: 404 })

  const parentMissionId = project.mission_id

  // Find all sub-missions grouped by phase
  const missions = db.prepare(`
    SELECT id, title, status, phase, started_at FROM missions
    WHERE parent_mission_id = ? AND phase IS NOT NULL
    ORDER BY phase, created_at
  `).all(parentMissionId) as { id: string; title: string; status: string; phase: number; started_at: string | null }[]

  if (missions.length === 0) return NextResponse.json({ error: 'no missions found' }, { status: 404 })

  const phases: Record<number, typeof missions> = {}
  for (const m of missions) {
    if (!phases[m.phase]) phases[m.phase] = []
    phases[m.phase].push(m)
  }

  const phaseNumbers = Object.keys(phases).map(Number).sort((a, b) => a - b)

  // Find the next phase to fire: lowest phase where all missions are waiting/waiting_phase
  let nextPhase: number | null = null
  for (const ph of phaseNumbers) {
    const phaseMissions = phases[ph]
    const allWaiting = phaseMissions.every(m => m.status === 'waiting' || m.status === 'waiting_phase')
    if (allWaiting) { nextPhase = ph; break }
  }

  if (nextPhase === null) {
    // Also try: find phase where some are pending (not yet started) and none are running
    for (const ph of phaseNumbers) {
      const phaseMissions = phases[ph]
      const hasUnstartedPending = phaseMissions.some(m => m.status === 'pending' && !m.started_at)
      const noneRunning = phaseMissions.every(m => m.status !== 'running')
      if (hasUnstartedPending && noneRunning) { nextPhase = ph; break }
    }
  }

  if (nextPhase === null) return NextResponse.json({ error: 'no waiting phase found', phases: Object.fromEntries(phaseNumbers.map(ph => [ph, phases[ph].map(m => m.status)])) }, { status: 400 })

  const toFire = phases[nextPhase]
  let fired = 0

  for (const m of toFire) {
    // Skip missions that are running or already started (pending+started_at = executing with DB confusion)
    if (m.status === 'running') continue
    if (m.status === 'pending' && m.started_at) continue
    if (m.status !== 'waiting' && m.status !== 'waiting_phase' && m.status !== 'pending') continue
    db.prepare(`UPDATE missions SET status = 'pending', created_at = datetime('now') WHERE id = ?`).run(m.id)
    fetch(`${BASE_URL}/api/missions/${m.id}/execute`, { method: 'POST' })
      .catch(e => console.error('[advance-phase] fire failed', m.id, e.message))
    fired++
  }

  return NextResponse.json({ ok: true, phase: nextPhase, fired })
}
