import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

// Commands that could damage the host system outside the project work_dir.
// This is an internal dev tool (localhost) so we use a targeted denylist rather
// than a full allowlist, preserving flexibility for docker/npm/git/etc.
const BLOCKED_PATTERNS = [
  /rm\s+(-\S*\s+)*\/(\s|$)/,             // rm targeting filesystem root
  /rm\s+(-\S*\s+)*~\//,                   // rm targeting home directory
  /:\(\)\s*\{\s*:\|:/,                    // fork bomb
  />\s*\/dev\/(sd|hd|nvme|vd)\w*/,       // writing to block devices
  /(mkfs|fdisk|parted)\s/,               // filesystem formatting tools
  /\bdd\b.*\bof=\/dev\//,                // dd to block device
  /(shutdown|reboot|halt|poweroff)\b/,   // power/system control
  /\bpasswd\b/,                          // password changes
  /(visudo|sudoers)/,                    // sudo config
]

// Running processes per project { projectId -> { pid, kill } }
const running = new Map<string, { pid?: number; kill: () => void }>()

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(params.id) as any
  if (!project?.work_dir) {
    return new Response('work_dir not set', { status: 400 })
  }

  const { cmd } = await req.json()
  if (!cmd || typeof cmd !== 'string') return new Response('cmd required', { status: 400 })

  // Block commands that could damage the host system
  if (BLOCKED_PATTERNS.some(p => p.test(cmd))) {
    return new Response('Command blocked for safety', { status: 403 })
  }

  const cwd = project.work_dir
  if (!fs.existsSync(cwd)) fs.mkdirSync(cwd, { recursive: true })

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      const send = (text: string) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
      }

      // Kill any previously running process for this project
      if (running.has(params.id)) {
        running.get(params.id)!.kill()
        running.delete(params.id)
      }

      // `exec` replaces bash with the command process — signals go directly to docker compose
      const child = spawn('bash', ['-c', `exec ${cmd}`], {
        cwd,
        env: { ...process.env, FORCE_COLOR: '0', TERM: 'dumb' },
      })

      // SIGTERM first, then SIGKILL after 3s if still alive (mirrors mission timeout handler)
      running.set(params.id, {
        pid: child.pid,
        kill: () => {
          try { child.kill('SIGTERM') } catch {}
          setTimeout(() => { try { child.kill('SIGKILL') } catch {} }, 3000)
        },
      })

      child.stdout.on('data', (d: Buffer) => send(d.toString()))
      child.stderr.on('data', (d: Buffer) => send(d.toString()))
      child.on('close', (code) => {
        send(`\n[exit ${code ?? 0}]\n`)
        running.delete(params.id)
        if (!closed) { closed = true; controller.close() }
      })
      child.on('error', (e) => {
        send(`\n[error: ${e.message}]\n`)
        if (!closed) { closed = true; controller.close() }
      })
    },
    cancel() {
      closed = true
      if (running.has(params.id)) {
        running.get(params.id)!.kill()
        running.delete(params.id)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// DELETE — kill running process
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (running.has(params.id)) {
    running.get(params.id)!.kill()
    running.delete(params.id)
    return new Response(JSON.stringify({ ok: true, killed: true }), { headers: { 'Content-Type': 'application/json' } })
  }
  return new Response(JSON.stringify({ ok: true, killed: false }), { headers: { 'Content-Type': 'application/json' } })
}
