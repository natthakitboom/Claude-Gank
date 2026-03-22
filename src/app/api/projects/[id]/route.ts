import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { parseDemoAccountsJson } from '@/lib/parseAccounts'

export const dynamic = 'force-dynamic'

function runCmd(cmd: string, cwd?: string, timeoutMs = 120_000): string {
  try {
    return execSync(cmd, {
      cwd,
      timeout: timeoutMs,
      env: { ...process.env, DOCKER_BUILDKIT: '0' },
    }).toString().trim()
  } catch (e: any) {
    return e.stdout?.toString().trim() || e.message?.slice(0, 200) || 'error'
  }
}

// PATCH — update work_dir / docker_compose_path
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const body = await req.json()
  const { work_dir, docker_compose_path, name, description, db_user, db_password, web_port, adminer_port, demo_accounts_json, rescan_accounts } = body

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id) as any
  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // rescan_accounts: re-parse demo accounts from integration_output in missions
  if (rescan_accounts) {
    const phase4 = db.prepare(`
      SELECT output FROM missions
      WHERE parent_mission_id = ? AND phase = 4 AND status = 'done'
      ORDER BY created_at DESC LIMIT 1
    `).get(project.mission_id) as { output: string } | undefined

    const text = phase4?.output || ''
    const demoAccountsJson = parseDemoAccountsJson(text)

    try { db.exec('ALTER TABLE projects ADD COLUMN demo_accounts_json TEXT') } catch {}
    db.prepare('UPDATE projects SET demo_accounts_json = ? WHERE id = ?').run(demoAccountsJson, params.id)
    return NextResponse.json({ ok: true, accounts: demoAccountsJson ? JSON.parse(demoAccountsJson) : [] })
  }

  try { db.exec('ALTER TABLE projects ADD COLUMN demo_accounts_json TEXT') } catch {}

  db.prepare(`
    UPDATE projects SET
      work_dir = COALESCE(?, work_dir),
      docker_compose_path = COALESCE(?, docker_compose_path),
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      db_user = COALESCE(?, db_user),
      db_password = COALESCE(?, db_password),
      web_port = COALESCE(?, web_port),
      adminer_port = COALESCE(?, adminer_port),
      demo_accounts_json = COALESCE(?, demo_accounts_json)
    WHERE id = ?
  `).run(
    work_dir ?? null, docker_compose_path ?? null, name ?? null, description ?? null,
    db_user ?? null, db_password ?? null,
    web_port ? Number(web_port) : null, adminer_port ? Number(adminer_port) : null,
    demo_accounts_json ?? null,
    params.id
  )

  return NextResponse.json({ ok: true })
}

// DELETE — docker compose down -v + rm -rf work_dir + delete missions
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id) as any
  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const log: string[] = []
  const composeFile = project.docker_compose_path
  const workDir = project.work_dir
  const composeDir = composeFile ? path.dirname(composeFile) : workDir

  // ── 1. Docker compose down (containers + volumes + images + networks) ──────
  if (composeFile && fs.existsSync(composeFile)) {
    log.push(`[docker] compose file: ${composeFile}`)

    // 1a. List running containers before teardown
    const ps = runCmd(
      `docker compose -f "${composeFile}" ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null`,
      composeDir, 10_000
    )
    if (ps) log.push(`[docker] running:\n${ps}`)

    // 1b. down -v --remove-orphans --rmi all  (stop + rm containers + rm volumes + rm images)
    const down = runCmd(
      `docker compose -f "${composeFile}" down -v --remove-orphans --rmi all 2>&1`,
      composeDir, 180_000
    )
    log.push(`[docker] down: ${down.slice(0, 400)}`)

  } else if (composeFile) {
    log.push(`[docker] compose file not found: ${composeFile}`)
  }

  // ── 2. Fallback: kill any lingering containers labelled with project name ──
  // Docker Compose labels containers with com.docker.compose.project=<folder name>
  const projectLabel = composeDir
    ? path.basename(composeDir).toLowerCase().replace(/[^a-z0-9_-]/g, '')
    : ''
  if (projectLabel) {
    const orphans = runCmd(
      `docker ps -a -q --filter "label=com.docker.compose.project=${projectLabel}" 2>/dev/null`,
      undefined, 10_000
    ).split('\n').map(s => s.trim()).filter(Boolean)

    if (orphans.length > 0) {
      log.push(`[docker] removing ${orphans.length} orphan container(s)`)
      runCmd(`docker rm -f ${orphans.join(' ')} 2>&1`, undefined, 30_000)
    }

    // Remove dangling volumes for this project
    const vols = runCmd(
      `docker volume ls -q --filter "label=com.docker.compose.project=${projectLabel}" 2>/dev/null`,
      undefined, 10_000
    ).split('\n').map(s => s.trim()).filter(Boolean)

    if (vols.length > 0) {
      log.push(`[docker] removing ${vols.length} volume(s): ${vols.join(', ')}`)
      runCmd(`docker volume rm -f ${vols.join(' ')} 2>&1`, undefined, 30_000)
    }

    // Remove networks for this project
    const nets = runCmd(
      `docker network ls -q --filter "label=com.docker.compose.project=${projectLabel}" 2>/dev/null`,
      undefined, 10_000
    ).split('\n').map(s => s.trim()).filter(Boolean)

    if (nets.length > 0) {
      log.push(`[docker] removing ${nets.length} network(s)`)
      runCmd(`docker network rm ${nets.join(' ')} 2>&1`, undefined, 30_000)
    }
  }

  // ── 3. Remove work directory ───────────────────────────────────────────────
  if (workDir && fs.existsSync(workDir)) {
    try {
      fs.rmSync(workDir, { recursive: true, force: true })
      log.push(`[files] removed: ${workDir}`)
    } catch (e: any) {
      log.push(`[files] rm error: ${e.message?.slice(0, 100)}`)
    }
  } else if (workDir) {
    log.push(`[files] already gone: ${workDir}`)
  }

  // ── 4. Delete missions from DB (cascade: sub-sub → sub → parent) ──────────
  if (project.mission_id) {
    // delete sub-missions of sub-missions first
    const subIds = (db.prepare('SELECT id FROM missions WHERE parent_mission_id = ?').all(project.mission_id) as any[]).map((r: any) => r.id)
    for (const subId of subIds) {
      db.prepare('DELETE FROM missions WHERE parent_mission_id = ?').run(subId)
    }
    db.prepare('DELETE FROM missions WHERE parent_mission_id = ?').run(project.mission_id)
    db.prepare('DELETE FROM missions WHERE id = ?').run(project.mission_id)
    log.push('[db] missions deleted')
  }

  // ── 5. Delete project record ───────────────────────────────────────────────
  db.prepare('DELETE FROM projects WHERE id = ?').run(params.id)
  log.push('[db] project deleted')

  return NextResponse.json({ ok: true, log })
}
