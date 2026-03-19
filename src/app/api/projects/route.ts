import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = getDb()

  const projects = db.prepare(`
    SELECT
      p.*,
      m.title as mission_title,
      m.status as mission_status,
      COUNT(sub.id) as task_count,
      SUM(CASE WHEN sub.status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN sub.status = 'failed' THEN 1 ELSE 0 END) as failed_tasks,
      SUM(CASE WHEN sub.status = 'running' THEN 1 ELSE 0 END) as running_tasks
    FROM projects p
    LEFT JOIN missions m ON m.id = p.mission_id
    LEFT JOIN missions sub ON sub.parent_mission_id = p.mission_id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all()

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const { name, description, mission_id, work_dir, docker_compose_path } = body

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const id = `project-${uuidv4().slice(0, 8)}`
  db.prepare(`
    INSERT INTO projects (id, name, description, mission_id, work_dir, docker_compose_path)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, description || null, mission_id || null, work_dir || null, docker_compose_path || null)

  return NextResponse.json({ id, name })
}
