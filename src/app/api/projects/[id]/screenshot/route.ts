import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const THUMBNAILS_DIR = path.join(process.cwd(), 'public', 'thumbnails')

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const db = getDb()
  const project = db.prepare('SELECT id, web_port, name FROM projects WHERE id = ?').get(params.id) as any
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 })
  if (!project.web_port) return NextResponse.json({ error: 'no web_port set' }, { status: 400 })

  const url = `http://localhost:${project.web_port}`
  const outFile = path.join(THUMBNAILS_DIR, `${project.id}.png`)

  if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true })

  try {
    execSync(
      `"${CHROME}" --headless=new --screenshot="${outFile}" --window-size=1280,800 --disable-gpu --no-sandbox --hide-scrollbars "${url}"`,
      { timeout: 15000 }
    )
    return NextResponse.json({ ok: true, url: `/thumbnails/${project.id}.png?t=${Date.now()}` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.slice(0, 200) || 'screenshot failed' }, { status: 500 })
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const outFile = path.join(THUMBNAILS_DIR, `${params.id}.png`)
  const exists = fs.existsSync(outFile)
  return NextResponse.json({ exists, url: exists ? `/thumbnails/${params.id}.png` : null })
}
