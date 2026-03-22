import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

function getWorkDir(projectId: string): string | null {
  const db = getDb()
  const p = db.prepare('SELECT work_dir FROM projects WHERE id = ?').get(projectId) as any
  return p?.work_dir || null
}

function hasGit(workDir: string): boolean {
  return existsSync(join(workDir, '.git'))
}

// GET /api/projects/[id]/git — ดู git log + tags
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const workDir = getWorkDir(params.id)
  if (!workDir || !hasGit(workDir)) {
    return NextResponse.json({ log: [], error: 'ไม่มี git repo ในโปรเจคนี้' })
  }

  try {
    // Use \x1f (unit separator) as delimiter — safe, never appears in commit messages
    const SEP = '\x1f'
    const raw = execSync(
      `git log --pretty=format:"%H${SEP}%s${SEP}%ad${SEP}%an" --date=short -100`,
      { cwd: workDir }
    ).toString().trim()

    // Get tags mapped to full commit hashes
    const tagsRaw = execSync('git tag -l --sort=-creatordate', { cwd: workDir }).toString().trim()
    const tagHashMap: Record<string, string[]> = {}
    if (tagsRaw) {
      for (const tag of tagsRaw.split('\n').filter(Boolean)) {
        try {
          const fullHash = execSync(`git rev-list -n 1 ${tag}`, { cwd: workDir }).toString().trim()
          if (!tagHashMap[fullHash]) tagHashMap[fullHash] = []
          tagHashMap[fullHash].push(tag)
        } catch {}
      }
    }

    const log = raw
      ? raw.split('\n').map(line => {
          const parts = line.split(SEP)
          const fullHash = parts[0] || ''
          const msg    = parts[1] || ''
          const date   = parts[2] || ''
          const author = parts[3] || ''
          return {
            hash: fullHash.slice(0, 7),
            fullHash,
            msg,
            date,
            author,
            tags: tagHashMap[fullHash] || [],
          }
        })
      : []

    return NextResponse.json({ log })
  } catch (e: any) {
    return NextResponse.json({ log: [], error: e.message })
  }
}

// POST /api/projects/[id]/git — revert / init
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const workDir = getWorkDir(params.id)
  if (!workDir) return NextResponse.json({ error: 'project ไม่มี work_dir' }, { status: 404 })

  const body = await req.json()
  const { action, hash } = body

  if (action === 'init') {
    if (!hasGit(workDir)) {
      execSync('git init', { cwd: workDir, stdio: 'pipe' })
      execSync('git config user.email "agent@claudegank.local"', { cwd: workDir, stdio: 'pipe' })
      execSync('git config user.name "Claude Gank"', { cwd: workDir, stdio: 'pipe' })
      execSync('git add -A', { cwd: workDir, stdio: 'pipe' })
      execSync('git commit -m "🚀 Initial commit (manual init)" --allow-empty', { cwd: workDir, stdio: 'pipe' })
    }
    return NextResponse.json({ message: 'git initialized' })
  }

  if (action === 'revert' && hash) {
    if (!hasGit(workDir)) return NextResponse.json({ error: 'ไม่มี git repo' }, { status: 400 })
    try {
      // Stash uncommitted changes ก่อน (ป้องกัน work หาย)
      try { execSync('git stash push -m "auto-stash before revert"', { cwd: workDir, stdio: 'pipe' }) } catch {}
      // Hard reset ไปที่ commit ที่เลือก
      execSync(`git reset --hard ${hash}`, { cwd: workDir, stdio: 'pipe' })
      // Auto-commit หลัง revert เพื่อ record ว่า rollback ไปที่ไหน
      try {
        execSync('git config user.email "agent@claudegank.local"', { cwd: workDir, stdio: 'pipe' })
        execSync('git config user.name "Claude Gank"', { cwd: workDir, stdio: 'pipe' })
        execSync(`git commit --allow-empty -m "⏪ Rollback to ${hash.slice(0, 7)}"`, { cwd: workDir, stdio: 'pipe' })
      } catch {}
      return NextResponse.json({ message: `✅ Rollback ไปที่ commit ${hash.slice(0, 7)} เรียบร้อย` })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'action ไม่ถูกต้อง' }, { status: 400 })
}
