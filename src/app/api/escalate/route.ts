import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

const CHIEF_OF_STAFF_ID = 'agent-f0319677'

async function executeAndCollect(missionId: string): Promise<string> {
  let output = ''
  try {
    const res = await fetch(`http://localhost:3000/api/missions/${missionId}/execute`, { method: 'POST' })
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        for (const line of text.split('\n').filter(l => l.startsWith('data: '))) {
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === 'chunk') output += ev.text
          } catch {}
        }
      }
    }
  } catch {
    await new Promise(r => setTimeout(r, 3000))
    const db = getDb()
    const m = db.prepare('SELECT output FROM missions WHERE id = ?').get(missionId) as any
    output = m?.output || ''
  }
  return output
}

function parseBlock(output: string, tag: string): any | null {
  const match = output.match(new RegExp(`---${tag}---\\s*([\\s\\S]*?)\\s*---END---`))
  if (!match) return null
  try {
    const jsonStr = match[1].trim().replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const db = getDb()
  const { missionId } = await request.json()

  if (!missionId) return NextResponse.json({ error: 'missionId required' }, { status: 400 })

  // Get failed mission + agent
  const mission = db.prepare(`
    SELECT m.*, a.name as agent_name, a.team as agent_team, a.id as agent_id_col
    FROM missions m JOIN agents a ON m.agent_id = a.id
    WHERE m.id = ?
  `).get(missionId) as any

  if (!mission) return NextResponse.json({ error: 'mission not found' }, { status: 404 })

  const escalationLevel = mission.escalation_level || 0

  // Skip CORE agents (Chief of Staff, เลขา) and max escalation
  if (mission.agent_team === 'CORE' || escalationLevel >= 2) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'CORE agent or max escalation reached' })
  }

  let escalatorId: string
  let escalatorRole: string

  if (escalationLevel === 0) {
    // Level 0 → escalate to team leader
    const leader = db.prepare(`
      SELECT id, name FROM agents WHERE team = ? AND is_leader = 1 AND id != ? LIMIT 1
    `).get(mission.agent_team, CHIEF_OF_STAFF_ID) as any

    if (!leader) {
      // No team leader → go straight to Chief of Staff
      escalatorId = CHIEF_OF_STAFF_ID
      escalatorRole = 'Chief of Staff'
    } else {
      escalatorId = leader.id
      escalatorRole = leader.name
    }
  } else {
    // Level 1 → escalate to Chief of Staff
    escalatorId = CHIEF_OF_STAFF_ID
    escalatorRole = 'Chief of Staff'
  }

  // Build escalation mission description
  const isChief = escalatorId === CHIEF_OF_STAFF_ID
  const escalationDesc = `## 🚨 ${isChief ? 'ESCALATION ถึง Chief of Staff' : 'แจ้งหัวหน้าทีม — พนักงานติดปัญหา'}

**Agent ที่ติดปัญหา:** ${mission.agent_name} (${mission.agent_team})
**ภารกิจ:** ${mission.title}
**รายละเอียดงาน:** ${mission.description?.slice(0, 300)}
**Error:** ${mission.error || 'ไม่มี error message (output ว่างหรือ exit ผิดปกติ)'}
**ระดับ escalation:** ${escalationLevel + 1}/2

---
วิเคราะห์ว่าเกิดอะไรขึ้น และเลือก output block ด้านล่าง:

**ถ้าแก้ได้ — output:**
---RETRY---
{ "description": "อธิบายงานใหม่พร้อมวิธีแก้ไขที่ชัดเจน เช่น ปรับ approach, ใช้ข้อมูลที่มี ไม่ต้องค้น web" }
---END---

**ถ้าแก้ไม่ได้ หรือต้องการ permission/ทรัพยากรเพิ่ม — output:**
---ESCALATE---
{ "reason": "เหตุผลที่ต้องขอความช่วยเหลือระดับสูง" }
---END---`

  // Create escalation mission
  const escalationMissionId = `mission-${uuidv4().slice(0, 8)}`
  db.prepare(`
    INSERT INTO missions (id, title, description, agent_id, priority, status, parent_mission_id, escalation_level)
    VALUES (?, ?, ?, ?, 'high', 'pending', ?, ?)
  `).run(
    escalationMissionId,
    `[ESCALATION] ${mission.title}`,
    escalationDesc,
    escalatorId,
    missionId,
    escalationLevel + 1
  )

  // Execute escalation mission and collect output
  const output = await executeAndCollect(escalationMissionId)

  // Parse response
  const retryData = parseBlock(output, 'RETRY')
  const escalateData = parseBlock(output, 'ESCALATE')

  if (retryData?.description) {
    // Create retry mission for the original agent
    const retryId = `mission-${uuidv4().slice(0, 8)}`
    db.prepare(`
      INSERT INTO missions (id, title, description, agent_id, priority, status, parent_mission_id, escalation_level)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      retryId,
      `[RETRY] ${mission.title}`,
      retryData.description,
      mission.agent_id,
      mission.priority || 'normal',
      missionId,
      escalationLevel + 1
    )
    fetch(`http://localhost:3000/api/missions/${retryId}/execute`, { method: 'POST' }).catch(() => {})
    return NextResponse.json({ ok: true, action: 'retry', retryMissionId: retryId, escalationMissionId })
  }

  if (escalateData && escalatorId !== CHIEF_OF_STAFF_ID) {
    // Team leader can't fix → escalate to Chief of Staff
    const chiefMissionId = `mission-${uuidv4().slice(0, 8)}`
    const chiefDesc = `## 🔴 ESCALATION จากหัวหน้าทีม — ต้องการความช่วยเหลือ

**หัวหน้าทีม (${escalatorRole}) รายงาน:** ${escalateData.reason || 'ไม่สามารถแก้ปัญหาได้'}

**Agent ที่ติดปัญหา:** ${mission.agent_name} (${mission.agent_team})
**ภารกิจ:** ${mission.title}
**Error เดิม:** ${mission.error || '-'}

วิเคราะห์และตัดสินใจ สร้าง ---ACTIONS--- block ตามปกติ`

    db.prepare(`
      INSERT INTO missions (id, title, description, agent_id, priority, status, parent_mission_id, escalation_level)
      VALUES (?, ?, ?, ?, 'high', 'pending', ?, 2)
    `).run(chiefMissionId, `[ESCALATION→CHIEF] ${mission.title}`, chiefDesc, CHIEF_OF_STAFF_ID, missionId)

    fetch(`http://localhost:3000/api/missions/${chiefMissionId}/execute`, { method: 'POST' }).catch(() => {})
    return NextResponse.json({ ok: true, action: 'escalated_to_chief', chiefMissionId, escalationMissionId })
  }

  return NextResponse.json({ ok: true, action: 'none', escalationMissionId, note: 'No structured output parsed' })
}
