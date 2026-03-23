import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface DeployConfig {
  id: string
  host: string
  port: number
  username: string
  auth_method: string
  ssh_key_path: string
  ssh_password: string
  domain: string
  deploy_path: string
  ssl_mode: string
  cloudflare_proxy: number
  updated_at: string
}

/** GET — read deploy config */
export async function GET() {
  const db = getDb()
  const config = db.prepare('SELECT * FROM deploy_config WHERE id = ?').get('default') as DeployConfig | undefined
  return NextResponse.json(config ?? {})
}

/** POST — save deploy config */
export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const { host, port, username, auth_method, ssh_key_path, ssh_password, domain, deploy_path, ssl_mode, cloudflare_proxy } = body

  db.prepare(`
    INSERT OR REPLACE INTO deploy_config (id, host, port, username, auth_method, ssh_key_path, ssh_password, domain, deploy_path, ssl_mode, cloudflare_proxy, updated_at)
    VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    host ?? '',
    port ?? 22,
    username ?? 'root',
    auth_method ?? 'sshkey',
    ssh_key_path ?? '~/.ssh/id_rsa',
    ssh_password ?? '',
    domain ?? '',
    deploy_path ?? '/apps',
    ssl_mode ?? 'cloudflare',
    cloudflare_proxy ?? 1,
  )

  return NextResponse.json({ ok: true })
}
