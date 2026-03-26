import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import path from 'path'

export const dynamic = 'force-dynamic'

const APP_DIR = path.resolve(process.cwd())

function run(cmd: string): string {
  try {
    return execSync(cmd, { cwd: APP_DIR, timeout: 10000 }).toString().trim()
  } catch {
    return ''
  }
}

export async function GET() {
  try {
    // Fetch latest from remote (silent, no pull)
    run('git fetch origin main --quiet')

    const local = run('git rev-parse HEAD')
    const remote = run('git rev-parse origin/main')
    const shortLocal = local.slice(0, 7)
    const shortRemote = remote.slice(0, 7)

    // How many commits behind?
    const behindStr = run(`git rev-list --count HEAD..origin/main`)
    const behind = parseInt(behindStr || '0', 10)

    // Latest commit message on remote
    const latestMsg = run('git log origin/main -1 --pretty=format:"%s"')

    return NextResponse.json({
      local: shortLocal,
      remote: shortRemote,
      upToDate: local === remote || behind === 0,
      behind,
      latestMessage: latestMsg,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
