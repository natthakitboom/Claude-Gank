import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const includeAnalytics = searchParams.get('analytics') === 'true'
    const db = getDb()
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(params.id)
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    if (includeAnalytics) {
      const stats = db.prepare(`
        SELECT
          COUNT(*) as total_missions,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_missions,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_missions,
          SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_missions,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_missions,
          SUM(COALESCE(tokens_used, 0)) as total_tokens,
          ROUND(AVG(CASE WHEN tokens_used > 0 THEN tokens_used END)) as avg_tokens,
          MAX(completed_at) as last_completed
        FROM missions WHERE agent_id = ?
      `).get(params.id) as Record<string, number | string | null>

      const memoryStats = db.prepare(`
        SELECT COUNT(*) as total_memories,
          SUM(CASE WHEN importance >= 9 THEN 1 ELSE 0 END) as key_learnings
        FROM memory WHERE agent_id = ?
      `).get(params.id) as Record<string, number>

      const chatStats = db.prepare(`
        SELECT COUNT(*) as total_chats
        FROM chats WHERE agent_id = ?
      `).get(params.id) as Record<string, number>

      const totalMissions = Number(stats.total_missions) || 0
      const doneMissions = Number(stats.done_missions) || 0
      const successRate = totalMissions > 0
        ? Math.round((doneMissions / totalMissions) * 100)
        : 0

      // Estimate cost: Haiku ~$0.25/M input + $1.25/M output, Sonnet ~$3/M + $15/M, Opus ~$15/M + $75/M
      const model = (agent as Record<string, string>).model || ''
      let costPerMToken = 1.0 // default estimate blended
      if (model.includes('haiku')) costPerMToken = 0.5
      else if (model.includes('opus')) costPerMToken = 30
      else costPerMToken = 6 // sonnet blended
      const estimatedCost = ((stats.total_tokens as number) / 1_000_000) * costPerMToken

      return NextResponse.json({
        ...agent as object,
        analytics: {
          ...stats,
          ...memoryStats,
          ...chatStats,
          success_rate: successRate,
          estimated_cost_usd: Math.round(estimatedCost * 1000) / 1000,
        }
      })
    }

    return NextResponse.json(agent)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const db = getDb()

    const allowed = ['name', 'role', 'team', 'model', 'personality', 'system_prompt', 'effort', 'sprite', 'color', 'status', 'skills_json']
    const entries = Object.entries(body).filter(([key]) => allowed.includes(key))

    if (entries.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

    // Use parameterized placeholders for values — column names are allowlisted above so safe to inline
    const setClauses = entries.map(([key]) => `${key} = ?`).join(', ')
    const values = entries.map(([, value]) => value)

    db.prepare(`UPDATE agents SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, params.id)
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(params.id)
    return NextResponse.json(agent)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const db = getDb()
    db.prepare('DELETE FROM agents WHERE id = ?').run(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
