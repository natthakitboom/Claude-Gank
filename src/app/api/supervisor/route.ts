import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const SUPERVISOR_AGENT_ID = 'agent-f0319677'

// GET — return current alerts (messages with type='alert')
export async function GET() {
  const db = getDb()
  const alerts = db.prepare(`
    SELECT * FROM messages WHERE type = 'alert' AND read = 0
    ORDER BY created_at DESC LIMIT 20
  `).all()
  return NextResponse.json(alerts)
}

// POST — run supervisor check
export async function POST() {
  const db = getDb()

  // 1. Detect problems
  const stuck = db.prepare(`
    SELECT m.*, a.name as agent_name, a.role as agent_role
    FROM missions m JOIN agents a ON m.agent_id = a.id
    WHERE m.status = 'running'
      AND m.created_at < datetime('now', '-30 minutes', 'localtime')
  `).all() as any[]

  const failed = db.prepare(`
    SELECT m.*, a.name as agent_name, a.role as agent_role
    FROM missions m JOIN agents a ON m.agent_id = a.id
    WHERE m.status = 'failed'
      AND m.created_at > datetime('now', '-6 hours', 'localtime')
    ORDER BY m.created_at DESC
  `).all() as any[]

  const idle = db.prepare(`
    SELECT a.*,
      (SELECT MAX(created_at) FROM missions WHERE agent_id = a.id) as last_mission_at
    FROM agents a
    WHERE a.id != ?
      AND (
        (SELECT COUNT(*) FROM missions WHERE agent_id = a.id) = 0
        OR (SELECT MAX(created_at) FROM missions WHERE agent_id = a.id) < datetime('now', '-7 days', 'localtime')
      )
  `).all(SUPERVISOR_AGENT_ID) as any[]

  const repeatFail = db.prepare(`
    SELECT a.id as agent_id, a.name as agent_name, a.role as agent_role, COUNT(*) as fail_count
    FROM missions m JOIN agents a ON m.agent_id = a.id
    WHERE m.status = 'failed'
      AND m.created_at > datetime('now', '-24 hours', 'localtime')
    GROUP BY a.id
    HAVING fail_count >= 3
  `).all() as any[]

  // 2. If no issues, return early
  if (stuck.length === 0 && failed.length === 0 && repeatFail.length === 0) {
    return NextResponse.json({ ok: true, issues: 0, idle: idle.length })
  }

  // 3. Fetch supervisor's memories for context
  const memories = db.prepare(`
    SELECT content FROM memory WHERE agent_id = ? ORDER BY importance DESC, created_at DESC LIMIT 5
  `).all(SUPERVISOR_AGENT_ID) as any[]

  // 4. Build context
  const memoryContext = memories.length > 0
    ? `\n## ความทรงจำที่เกี่ยวข้อง:\n${memories.map((m: any) => `- ${m.content}`).join('\n')}`
    : ''

  const context = `## สถานการณ์ปัจจุบัน (${new Date().toLocaleString('th-TH')})

${stuck.length > 0 ? `### Missions ที่ค้างอยู่ (running > 30 นาที):
${stuck.map((m: any) => `- Mission "${m.title}" (${m.id}) ของ ${m.agent_name} (${m.agent_role}) — error: ${m.error || 'ไม่มี'}`).join('\n')}` : ''}

${failed.length > 0 ? `### Missions ที่ล้มเหลวใน 6 ชั่วโมงล่าสุด:
${failed.map((m: any) => `- Mission "${m.title}" (${m.id}) ของ ${m.agent_name} — error: ${m.error?.slice(0, 200) || 'ไม่ระบุ'}`).join('\n')}` : ''}

${repeatFail.length > 0 ? `### Agents ที่ fail ซ้ำ >= 3 ครั้งใน 24h:
${repeatFail.map((a: any) => `- ${a.agent_name} (${a.agent_role}): fail ${a.fail_count} ครั้ง`).join('\n')}` : ''}
${memoryContext}

วิเคราะห์ปัญหา ตัดสินใจแก้ไข และสร้าง actions ที่เหมาะสม`

  // 5. Create + fire supervisor mission
  const missionId = `mission-${uuidv4().slice(0, 8)}`
  db.prepare(`
    INSERT INTO missions (id, title, description, agent_id, priority, status)
    VALUES (?, ?, ?, ?, 'high', 'pending')
  `).run(missionId, 'ตรวจสอบสถานะทีม', context, SUPERVISOR_AGENT_ID)

  // Fire and wait for output (use streaming execute)
  let output = ''
  try {
    const execRes = await fetch(`${BASE_URL}/api/missions/${missionId}/execute`, {
      method: 'POST',
    })

    // Consume SSE stream to get full output
    const reader = execRes.body?.getReader()
    const decoder = new TextDecoder()
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === 'chunk') output += ev.text
          } catch {}
        }
      }
    }
  } catch (e) {
    // Fire-and-forget fallback: parse output from DB after brief wait
    await new Promise(r => setTimeout(r, 3000))
    const m = db.prepare('SELECT output FROM missions WHERE id = ?').get(missionId) as any
    output = m?.output || ''
  }

  // 6. Parse ---ACTIONS--- block
  const actionsMatch = output.match(/---ACTIONS---\s*([\s\S]*?)\s*---END---/)
  if (!actionsMatch) {
    return NextResponse.json({ ok: true, missionId, issues: stuck.length + failed.length, parsed: false })
  }

  let actions: any[] = []
  try {
    const jsonStr = actionsMatch[1].trim().replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(jsonStr)
    actions = parsed.actions || []
  } catch {
    return NextResponse.json({ ok: true, missionId, issues: stuck.length + failed.length, parsed: false })
  }

  // 7. Execute actions
  const results: string[] = []
  for (const action of actions) {
    try {
      if (action.type === 'retry_mission') {
        const newId = `mission-${uuidv4().slice(0, 8)}`
        db.prepare(`
          INSERT INTO missions (id, title, description, agent_id, priority, status)
          VALUES (?, ?, ?, ?, 'high', 'pending')
        `).run(newId, action.title, action.description, action.agent_id)
        fetch(`${BASE_URL}/api/missions/${newId}/execute`, { method: 'POST' }).catch((e) => console.error('[supervisor] spawn failed for mission', newId, e.message))
        results.push(`retry: ${newId}`)
      }

      if (action.type === 'add_memory') {
        const memId = `mem-${uuidv4().slice(0, 8)}`
        db.prepare(`
          INSERT INTO memory (id, agent_id, content, importance, tags_json)
          VALUES (?, ?, ?, ?, ?)
        `).run(memId, action.agent_id || SUPERVISOR_AGENT_ID, action.content, action.importance || 7, JSON.stringify(action.tags || ['supervisor', 'fix']))
        results.push(`memory: ${memId}`)
      }

      if (action.type === 'notify_user') {
        const msgId = `msg-${uuidv4().slice(0, 8)}`
        db.prepare(`
          INSERT INTO messages (id, from_agent, type, content, metadata_json, read)
          VALUES (?, ?, 'alert', ?, ?, 0)
        `).run(
          msgId, SUPERVISOR_AGENT_ID, action.message,
          JSON.stringify({ severity: action.severity || 'medium', requires_confirmation: !!action.requires_confirmation })
        )
        results.push(`alert: ${msgId}`)
      }
    } catch (err) {
      console.error('[supervisor] action execution failed:', action.type, err)
    }
  }

  return NextResponse.json({ ok: true, missionId, issues: stuck.length + failed.length, actionsExecuted: results.length, results })
}

// PATCH — mark alert as read
export async function PATCH(request: Request) {
  const db = getDb()
  const body = await request.json()
  const { id, action } = body // action: 'read' | 'approve' | 'reject'
  db.prepare(`
    UPDATE messages SET read = 1, metadata_json = json_patch(COALESCE(metadata_json,'{}'), ?) WHERE id = ?
  `).run(JSON.stringify({ user_action: action || 'read', actioned_at: new Date().toISOString() }), id)
  return NextResponse.json({ ok: true })
}
