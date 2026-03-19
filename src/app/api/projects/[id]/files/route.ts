import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// Recursive file tree builder (skip node_modules, .git, large dirs)
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '__pycache__', 'dist', 'build', '.cache', 'coverage'])
const MAX_FILES = 500

function buildTree(dir: string, rootDir: string, count = { n: 0 }): any[] {
  if (!fs.existsSync(dir)) return []
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1
        if (!a.isDirectory() && b.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })
  } catch { return [] }

  const result: any[] = []
  for (const entry of entries) {
    if (count.n >= MAX_FILES) break
    if (entry.name.startsWith('.') && entry.name !== '.env' && entry.name !== '.env.example') continue
    // skip non-regular files (sockets, devices, etc.)
    if (!entry.isDirectory() && !entry.isFile() && !entry.isSymbolicLink()) continue
    const fullPath = path.join(dir, entry.name)
    const relPath = path.relative(rootDir, fullPath)
    count.n++
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        result.push({ name: entry.name, path: relPath, type: 'dir', children: [], skipped: true })
      } else {
        result.push({ name: entry.name, path: relPath, type: 'dir', children: buildTree(fullPath, rootDir, count) })
      }
    } else {
      let size = 0
      try { size = fs.statSync(fullPath).size } catch {}
      result.push({ name: entry.name, path: relPath, type: 'file', size })
    }
  }
  return result
}

// GET — list file tree
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id) as any
  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!project.work_dir) return NextResponse.json({ error: 'work_dir not set' }, { status: 400 })

  // Read single file?
  const filePath = req.nextUrl.searchParams.get('file')
  if (filePath) {
    const abs = path.join(project.work_dir, filePath)
    // Security: prevent path traversal
    if (!abs.startsWith(project.work_dir)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (!fs.existsSync(abs)) return NextResponse.json({ error: 'file not found' }, { status: 404 })
    let stat: fs.Stats
    try { stat = fs.statSync(abs) } catch { return NextResponse.json({ error: 'file not accessible' }, { status: 404 }) }
    if (stat!.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'file too large (>2MB)' }, { status: 413 })
    let content = ''
    try { content = fs.readFileSync(abs, 'utf-8') } catch { return NextResponse.json({ error: 'cannot read file' }, { status: 500 }) }
    return NextResponse.json({ content, path: filePath })
  }

  let tree: any[] = []
  try {
    tree = buildTree(project.work_dir, project.work_dir)
  } catch {}
  return NextResponse.json({ tree, work_dir: project.work_dir })
}

// PUT — save file content
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id) as any
  if (!project) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!project.work_dir) return NextResponse.json({ error: 'work_dir not set' }, { status: 400 })

  const { path: filePath, content } = await req.json()
  if (!filePath || content === undefined) return NextResponse.json({ error: 'path and content required' }, { status: 400 })

  const abs = path.join(project.work_dir, filePath)
  if (!abs.startsWith(project.work_dir)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content, 'utf-8')
  return NextResponse.json({ ok: true })
}
