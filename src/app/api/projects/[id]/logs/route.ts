import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import { spawn } from 'child_process'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const project = db.prepare('SELECT work_dir, docker_compose_path, name FROM projects WHERE id = ?').get(params.id) as any

  if (!project?.work_dir) {
    return new Response('project ไม่มี work_dir', { status: 404 })
  }

  const composePath = project.docker_compose_path || `${project.work_dir}/docker-compose.yml`
  const hasCompose = existsSync(composePath)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (text: string) => {
        try { controller.enqueue(encoder.encode(text)) } catch {}
      }

      if (!hasCompose) {
        send(`[system] ไม่พบ docker-compose.yml ที่ ${composePath}\n`)
        controller.close()
        return
      }

      send(`[system] Streaming logs จาก ${project.name}…\n\n`)

      // ดู logs จาก docker compose — tail 200 บรรทัดล่าสุด + follow
      const child = spawn('docker', [
        'compose', '-f', composePath,
        'logs', '--tail=200', '--follow', '--no-color',
      ], {
        cwd: project.work_dir,
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      child.stdout.on('data', (chunk: Buffer) => send(chunk.toString()))
      child.stderr.on('data', (chunk: Buffer) => send(chunk.toString()))

      child.on('error', (err) => {
        send(`[error] ${err.message}\n`)
        controller.close()
      })

      child.on('close', () => {
        try { controller.close() } catch {}
      })

      // Stop streaming เมื่อ client disconnect
      const cleanup = () => {
        try { child.kill() } catch {}
        try { controller.close() } catch {}
      }

      // Timeout 10 นาที
      const timer = setTimeout(cleanup, 10 * 60 * 1000)
      // cleanup on child exit
      child.on('close', () => clearTimeout(timer))
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    },
  })
}
