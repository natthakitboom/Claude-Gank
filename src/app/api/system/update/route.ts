import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const APP_DIR = path.resolve(process.cwd())

export async function POST() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string, type: 'log' | 'error' | 'done' | 'warn' = 'log') => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, msg })}\n\n`))
        } catch {}
      }

      const run = (cmd: string, label?: string): string => {
        if (label) send(`⏳ ${label}`)
        try {
          const out = execSync(cmd, { cwd: APP_DIR, timeout: 300000 }).toString().trim()
          if (out) send(out)
          return out
        } catch (e: any) {
          throw new Error(e.stderr?.toString() || e.message)
        }
      }

      try {
        send('━━━━━━━━━━━━━━━━━━━━━━━━')
        send('🚀 Claude Gang — Update')
        send('━━━━━━━━━━━━━━━━━━━━━━━━')

        // 1. Fetch
        run('git fetch origin main --quiet', 'ตรวจสอบ version ใหม่...')

        const local = execSync('git rev-parse HEAD', { cwd: APP_DIR }).toString().trim()
        const remote = execSync('git rev-parse origin/main', { cwd: APP_DIR }).toString().trim()

        if (local === remote) {
          send('✅ ใช้ version ล่าสุดอยู่แล้ว ไม่มีอะไรต้อง update', 'done')
          controller.close()
          return
        }

        const behind = execSync(`git rev-list --count HEAD..origin/main`, { cwd: APP_DIR })
          .toString()
          .trim()
        send(`📦 มี ${behind} commit ใหม่ กำลัง pull...`)

        // 2. Check if package.json will change
        const pkgChanged =
          execSync(`git diff HEAD origin/main -- package.json`, { cwd: APP_DIR })
            .toString()
            .trim().length > 0

        // 3. Pull
        run('git pull origin main', 'กำลังดึง code ล่าสุด...')
        send('✅ Pull สำเร็จ')

        // 4. npm install (only if package.json changed)
        if (pkgChanged) {
          run('npm install', 'ติดตั้ง dependencies ใหม่...')
          send('✅ Dependencies อัปเดตแล้ว')
        } else {
          send('⚡ package.json ไม่เปลี่ยน — ข้าม npm install')
        }

        // 5. Build (production or dev?)
        const isProd = fs.existsSync(path.join(APP_DIR, '.next', 'BUILD_ID'))
        if (isProd) {
          run('npm run build', 'กำลัง build production...')
          send('✅ Build สำเร็จ')
        } else {
          send('⚡ Dev mode — ข้าม build (hot reload จัดการเอง)')
        }

        // 6. Restart server
        send('🔄 Restart server...')
        let restarted = false

        // Try launchctl (macOS LaunchAgent)
        try {
          execSync('launchctl stop com.claudegang.app 2>/dev/null; launchctl start com.claudegang.app 2>/dev/null', {
            timeout: 5000,
          })
          send('✅ Restart ผ่าน launchd สำเร็จ')
          restarted = true
        } catch {}

        // Try PM2
        if (!restarted) {
          try {
            execSync('pm2 restart claude-gang 2>/dev/null', { timeout: 5000 })
            send('✅ Restart ผ่าน PM2 สำเร็จ')
            restarted = true
          } catch {}
        }

        if (!restarted) {
          send('⚠️ กรุณา restart server ด้วยตัวเอง (dev mode: server จะ reload อัตโนมัติ)', 'warn')
        }

        send('━━━━━━━━━━━━━━━━━━━━━━━━')
        send('🎉 Update เสร็จสมบูรณ์!', 'done')
      } catch (e: any) {
        send(`❌ Error: ${e.message}`, 'error')
      } finally {
        try { controller.close() } catch {}
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
