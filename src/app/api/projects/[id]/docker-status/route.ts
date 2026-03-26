import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { execSync } from 'child_process'
import { buildSafeEnv } from '@/lib/dockerEnv'
import fs from 'fs'

export const dynamic = 'force-dynamic'

/**
 * GET /api/projects/:id/docker-status
 *
 * Lightweight, NON-destructive docker status check.
 * Uses execSync (blocking, max 8s) so it never kills a running exec stream.
 * Returns { up: boolean, containers: string[] }
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const project = db.prepare('SELECT docker_compose_path FROM projects WHERE id = ?').get(params.id) as
    | { docker_compose_path: string | null }
    | undefined

  if (!project?.docker_compose_path) {
    return NextResponse.json({ up: false, containers: [] })
  }

  const composePath = project.docker_compose_path

  if (!fs.existsSync(composePath)) {
    return NextResponse.json({ up: false, containers: [], error: 'compose file not found' })
  }

  try {
    // Strip dangerous compose env vars so the command only affects THIS project
    const safeEnv = buildSafeEnv()

    const raw = execSync(
      `docker compose -f "${composePath}" ps -q --status running 2>/dev/null`,
      { env: safeEnv, timeout: 8_000, encoding: 'utf8' }
    ).trim()

    const containers = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('['))

    return NextResponse.json({ up: containers.length > 0, containers })
  } catch {
    return NextResponse.json({ up: false, containers: [] })
  }
}

