import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

function getSessionResetMs(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return midnight.getTime() - now.getTime()
}

function getWeeklyResetMs(): number {
  const now = new Date()
  const day = now.getDay() // 0=Sun 1=Mon ... 6=Sat
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  nextMonday.setHours(0, 0, 0, 0)
  return nextMonday.getTime() - now.getTime()
}

function msToHuman(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m`
}

export async function GET() {
  try {
    const db = getDb()

    // ── Session = today ──────────────────────────────────────────
    const sessionRow = db.prepare(`
      SELECT
        COALESCE(SUM(tokens_used), 0) as tokens,
        COUNT(*) as missions,
        COALESCE(SUM(CASE WHEN status='done' THEN tokens_used ELSE 0 END), 0) as done_tokens,
        COUNT(CASE WHEN status='done' THEN 1 END) as done_missions,
        COUNT(CASE WHEN status='running' THEN 1 END) as running_missions,
        COUNT(CASE WHEN status='failed' THEN 1 END) as failed_missions
      FROM missions
      WHERE date(created_at) = date('now')
    `).get() as Record<string, number>

    // ── Weekly = last 7 days ─────────────────────────────────────
    const weekRow = db.prepare(`
      SELECT
        COALESCE(SUM(tokens_used), 0) as tokens,
        COUNT(*) as missions,
        COALESCE(SUM(CASE WHEN status='done' THEN tokens_used ELSE 0 END), 0) as done_tokens,
        COUNT(DISTINCT date(created_at)) as active_days
      FROM missions
      WHERE created_at >= date('now', '-6 days')
    `).get() as Record<string, number>

    // ── Daily breakdown last 7 days ──────────────────────────────
    const daily = db.prepare(`
      SELECT
        date(created_at) as day,
        COALESCE(SUM(tokens_used), 0) as tokens,
        COUNT(*) as missions,
        COUNT(CASE WHEN status='done' THEN 1 END) as done,
        COUNT(CASE WHEN status='failed' THEN 1 END) as failed
      FROM missions
      WHERE created_at >= date('now', '-6 days')
      GROUP BY date(created_at)
      ORDER BY day ASC
    `).all() as { day: string; tokens: number; missions: number; done: number; failed: number }[]

    // Fill in missing days
    const filledDaily: typeof daily = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayStr = d.toISOString().slice(0, 10)
      const found = daily.find((r) => r.day === dayStr)
      filledDaily.push(found ?? { day: dayStr, tokens: 0, missions: 0, done: 0, failed: 0 })
    }

    // ── Top agents (this week) ────────────────────────────────────
    const topAgents = db.prepare(`
      SELECT a.name, a.sprite, a.color,
        COALESCE(SUM(m.tokens_used), 0) as tokens,
        COUNT(m.id) as missions
      FROM agents a
      JOIN missions m ON a.id = m.agent_id
      WHERE m.created_at >= date('now', '-6 days')
      GROUP BY a.id
      ORDER BY tokens DESC
      LIMIT 8
    `).all() as { name: string; sprite: string; color: string; tokens: number; missions: number }[]

    // ── Hourly today ─────────────────────────────────────────────
    const hourly = db.prepare(`
      SELECT
        strftime('%H', created_at) as hour,
        COALESCE(SUM(tokens_used), 0) as tokens,
        COUNT(*) as missions
      FROM missions
      WHERE date(created_at) = date('now')
      GROUP BY strftime('%H', created_at)
      ORDER BY hour ASC
    `).all() as { hour: string; tokens: number; missions: number }[]

    const hourlyFilled = Array.from({ length: 24 }, (_, h) => {
      const hStr = String(h).padStart(2, '0')
      const found = hourly.find((r) => r.hour === hStr)
      return found ?? { hour: hStr, tokens: 0, missions: 0 }
    })

    return NextResponse.json({
      session: {
        tokens: sessionRow.tokens,
        missions: sessionRow.missions,
        done_tokens: sessionRow.done_tokens,
        done_missions: sessionRow.done_missions,
        running_missions: sessionRow.running_missions,
        failed_missions: sessionRow.failed_missions,
        resets_in_ms: getSessionResetMs(),
        resets_in: msToHuman(getSessionResetMs()),
      },
      weekly: {
        tokens: weekRow.tokens,
        missions: weekRow.missions,
        done_tokens: weekRow.done_tokens,
        active_days: weekRow.active_days,
        resets_in_ms: getWeeklyResetMs(),
        resets_in: msToHuman(getWeeklyResetMs()),
      },
      daily: filledDaily,
      hourly: hourlyFilled,
      topAgents,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
