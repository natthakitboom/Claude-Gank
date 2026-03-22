import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { sendNotification, type NotifyConfig } from '@/lib/notify'

// GET /api/notify — list all notification configs
export async function GET() {
  try {
    const db = getDb()
    const configs = db.prepare('SELECT * FROM notification_config ORDER BY created_at ASC').all()
    return NextResponse.json(configs)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST /api/notify — create/update config OR send notification
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const db = getDb()

    // If action=send, send notification to all enabled platforms
    if (body.action === 'send') {
      const configs = db.prepare(
        'SELECT * FROM notification_config WHERE enabled = 1'
      ).all() as NotifyConfig[]

      const results = await Promise.allSettled(
        configs.map(config => sendNotification(config, body.message, body.title, body.agent_name))
      )

      const sent = results.filter(r => r.status === 'fulfilled').length
      return NextResponse.json({ sent, total: configs.length })
    }

    // Otherwise create/update config
    if (body.id) {
      // Update
      const fields: string[] = []
      const vals: (string | number)[] = []
      for (const key of ['webhook_url', 'token', 'enabled', 'notify_on_done', 'notify_on_failed', 'notify_on_skill_update', 'agent_filter_json']) {
        if (body[key] !== undefined) {
          fields.push(`${key} = ?`)
          vals.push(body[key])
        }
      }
      if (fields.length > 0) {
        vals.push(body.id)
        db.prepare(`UPDATE notification_config SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
      }
    } else {
      // Create
      const id = `notif-${uuidv4().slice(0, 8)}`
      db.prepare(`
        INSERT INTO notification_config (id, platform, webhook_url, token, enabled, notify_on_done, notify_on_failed, notify_on_skill_update)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.platform,
        body.webhook_url || '',
        body.token || '',
        body.enabled ?? 1,
        body.notify_on_done ?? 0,
        body.notify_on_failed ?? 1,
        body.notify_on_skill_update ?? 0,
      )
    }

    const configs = db.prepare('SELECT * FROM notification_config ORDER BY created_at ASC').all()
    return NextResponse.json(configs)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// DELETE /api/notify — delete config
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    const db = getDb()
    db.prepare('DELETE FROM notification_config WHERE id = ?').run(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
