import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = getDb()

    const totalAgents = (db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number }).count
    const workingAgents = (db.prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'working'").get() as { count: number }).count
    const totalMissions = (db.prepare('SELECT COUNT(*) as count FROM missions').get() as { count: number }).count
    const doneMissions = (db.prepare("SELECT COUNT(*) as count FROM missions WHERE status = 'done'").get() as { count: number }).count
    const runningMissions = (db.prepare("SELECT COUNT(*) as count FROM missions WHERE status = 'running'").get() as { count: number }).count
    const totalMemories = (db.prepare('SELECT COUNT(*) as count FROM memory').get() as { count: number }).count
    const totalTokens = (db.prepare("SELECT SUM(tokens_used) as total FROM missions WHERE status = 'done'").get() as { total: number }).total || 0
    const totalMessages = (db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number }).count

    const recentMissions = db.prepare(`
      SELECT m.*, a.name as agent_name, a.sprite as agent_sprite, a.color as agent_color
      FROM missions m JOIN agents a ON m.agent_id = a.id
      ORDER BY m.created_at DESC LIMIT 5
    `).all()

    const teamStats = db.prepare(`
      SELECT a.team, COUNT(m.id) as mission_count, SUM(m.tokens_used) as tokens
      FROM agents a LEFT JOIN missions m ON a.id = m.agent_id
      GROUP BY a.team
    `).all()

    return NextResponse.json({
      totalAgents,
      workingAgents,
      totalMissions,
      doneMissions,
      runningMissions,
      totalMemories,
      totalTokens,
      totalMessages,
      recentMissions,
      teamStats,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
