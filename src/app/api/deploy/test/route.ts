import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'

export const dynamic = 'force-dynamic'

/** POST — test SSH connection to VPS */
export async function POST() {
  const db = getDb()
  const config = db.prepare('SELECT * FROM deploy_config WHERE id = ?').get('default') as any
  if (!config?.host) {
    return NextResponse.json({ ok: false, error: 'Host not configured' }, { status: 400 })
  }

  const keyPath = config.ssh_key_path.replace(/^~/, os.homedir())
  if (!fs.existsSync(keyPath)) {
    return NextResponse.json({ ok: false, error: `SSH key not found: ${keyPath}` }, { status: 400 })
  }

  try {
    const sshCmd = [
      'ssh',
      '-o StrictHostKeyChecking=no',
      '-o ConnectTimeout=10',
      '-o BatchMode=yes',
      `-i "${keyPath}"`,
      `-p ${config.port || 22}`,
      `${config.username || 'root'}@${config.host}`,
      '"uname -a && docker --version && free -h | head -2 && df -h / | tail -1"',
    ].join(' ')

    const output = execSync(sshCmd, { timeout: 15_000, encoding: 'utf8' }).trim()

    // Parse system info
    const lines = output.split('\n')
    const uname = lines[0] || ''
    const dockerVersion = lines.find(l => l.includes('Docker version')) || 'Docker not found'
    const memLine = lines.find(l => l.includes('Mem:')) || ''
    const diskLine = lines[lines.length - 1] || ''

    return NextResponse.json({
      ok: true,
      uname,
      docker: dockerVersion.trim(),
      memory: memLine.trim(),
      disk: diskLine.trim(),
    })
  } catch (e: any) {
    const msg = e.stderr?.toString().trim() || e.message?.slice(0, 200) || 'Connection failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
