import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

// Base directory where all generated project code will live
// Structure: Claude Gank/projects/{projectId}/  (sibling of multi-agent-dashboard/)
const PROJECTS_BASE = process.env.PROJECTS_BASE_DIR ||
  path.join(process.cwd(), '..', 'projects')
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

export const dynamic = 'force-dynamic'

// Find เลขา agent (CORE coordinator, not Chief of Staff)
function getSecretaryId(db: any): string | null {
  const agent = db.prepare(`
    SELECT id FROM agents WHERE team = 'CORE'
      AND (name LIKE '%เลขา%' OR name LIKE '%Secretary%' OR role LIKE '%Coordinator%' OR role LIKE '%coordinator%')
    LIMIT 1
  `).get() as any
  if (agent) return agent.id
  // fallback: first CORE agent that is not Chief of Staff
  const fallback = db.prepare(`
    SELECT id FROM agents WHERE team = 'CORE' AND name NOT LIKE '%Chief%' LIMIT 1
  `).get() as any
  return fallback?.id || null
}

// Build human-readable agent roster for เลขา's context
function buildRoster(agents: any[]): string {
  const groups: Record<string, any[]> = {}
  for (const a of agents) {
    if (!groups[a.team]) groups[a.team] = []
    groups[a.team].push(a)
  }
  return Object.entries(groups).map(([team, members]) =>
    `## ทีม ${team}\n` + members.map(a => `- ${a.name} (${a.role}) [id: ${a.id}]`).join('\n')
  ).join('\n\n')
}

export async function POST(request: Request) {
  const db = getDb()
  const body = await request.json()
  const { description, priority = 'high' } = body

  if (!description) return NextResponse.json({ error: 'description required' }, { status: 400 })

  // 1. Get secretary
  const secretaryId = getSecretaryId(db)
  if (!secretaryId) return NextResponse.json({ error: 'No secretary agent found' }, { status: 500 })

  // 2. Create project folder immediately (before any missions)
  const projectId = `project-${uuidv4().slice(0, 8)}`
  const workDir = path.join(PROJECTS_BASE, projectId)
  fs.mkdirSync(workDir, { recursive: true })

  // Pre-create project record with work_dir set so it appears in PROJECTS right away
  try {
    db.prepare(`
      INSERT INTO projects (id, name, description, work_dir, docker_compose_path, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(
      projectId,
      description.slice(0, 100),
      description,
      workDir,
      path.join(workDir, 'docker-compose.yml'),
    )
  } catch {}

  // 3. Fetch all agents for roster
  const agents = db.prepare('SELECT id, name, role, team FROM agents ORDER BY team, name').all() as any[]
  const roster = buildRoster(agents)

  // 4. Build mission description for เลขา — include workDir so she can pass it to each agent
  const missionDescription = `## งานที่ได้รับมอบหมาย
${description}

---
## 📁 Work Directory สำหรับโปรเจคนี้ (สำคัญมาก!)
\`${workDir}\`

agents ทุกคนต้องสร้างและบันทึกโค้ด/ไฟล์ทั้งหมดไว้ใน directory นี้เท่านั้น
DevOps ต้องสร้าง docker-compose.yml ที่ \`${path.join(workDir, 'docker-compose.yml')}\`

---
## รายชื่อสมาชิกทีมที่สามารถรับงานได้

${roster}

---
## คำสั่ง
วิเคราะห์งานข้างต้น แบ่งเป็นงานย่อยที่ชัดเจน แล้ว output ---TASKS--- block ด้านล่าง
ใน description ของแต่ละ task ให้ระบุ work directory (\`${workDir}\`) ด้วยทุกครั้ง

กฎสำคัญ:
1. ใช้ agent ที่เหมาะสมกับงานนั้นจริงๆ
2. แต่ละ task ต้องมี description ที่ละเอียดพอให้ agent ทำได้ทันที
3. ใช้ชื่อ agent ตรงตามรายชื่อข้างต้น (ใช้ field "name" ของ agent)
4. ต้องมี ---TASKS--- block เสมอ ไม่ว่างานจะใหญ่หรือเล็ก
5. **[Integration task บังคับ]** ทุกโปรเจคต้องมี Integration task เป็น task สุดท้าย (phase สูงสุด) โดย:
   - docker-compose.yml ต้องมีครบ 3 services: **web** (Dockerfile build) + **cloudbeaver** (DB admin UI, dbeaver/cloudbeaver:latest, port 8978) + **postgres** (database)
   - Integration agent ต้องสร้าง/ตรวจสอบ/แก้ไข docker-compose.yml ให้ครบและ build ได้จริง
   - ผลลัพธ์ต้องมี Access Info ครบ: Web App URL, DB Admin URL, PostgreSQL credentials

ตัวอย่าง output:
---TASKS---
{
  "project": "ชื่อโปรเจค",
  "tasks": [
    { "agent_name": "ชื่อ agent", "title": "ชื่องาน", "description": "บันทึกไฟล์ทั้งหมดที่ ${workDir}/...\nรายละเอียดงาน...", "priority": "high" }
  ]
}
---END---`

  // 5. Create secretary mission
  const parentId = `mission-${uuidv4().slice(0, 8)}`
  db.prepare(`
    INSERT INTO missions (id, title, description, agent_id, priority, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(parentId, `[ORCHESTRA] ${description.slice(0, 80)}`, missionDescription, secretaryId, priority)

  // Link secretary mission to the project
  try {
    db.prepare(`UPDATE projects SET mission_id = ? WHERE id = ?`).run(parentId, projectId)
  } catch {}

  // 6. Execute and collect output
  let output = ''
  try {
    const execRes = await fetch(`${BASE_URL}/api/missions/${parentId}/execute`, { method: 'POST' })
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
  } catch {
    // fallback: wait and read from DB
    await new Promise(r => setTimeout(r, 5000))
    const m = db.prepare('SELECT output FROM missions WHERE id = ?').get(parentId) as any
    output = m?.output || ''
  }

  // 7. Update project name from เลขา's parsed output if available
  try {
    const tasksMatch = output.match(/---TASKS---\s*([\s\S]*?)\s*---END---/)
    if (tasksMatch) {
      const j = JSON.parse(tasksMatch[1].trim().replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, ''))
      if (j.project) {
        db.prepare(`UPDATE projects SET name = ? WHERE id = ?`).run(String(j.project).slice(0, 100), projectId)
      }
    }
  } catch {}

  // 8. Sub-missions were already spawned by spawnSecretarySubMissions() inside execute/route.ts.
  //    Just read them from DB — do NOT create a second set here.
  const subMissions = (db.prepare(`
    SELECT m.id, m.title, m.status, m.phase, a.name as agent_name
    FROM missions m
    LEFT JOIN agents a ON m.agent_id = a.id
    WHERE m.parent_mission_id = ?
    ORDER BY m.phase, m.created_at
  `).all(parentId) as any[]).map((m: any) => ({
    id: m.id, title: m.title, status: m.status, phase: m.phase, agent_name: m.agent_name,
  }))

  return NextResponse.json({
    ok: true,
    projectMissionId: parentId,
    projectId,
    workDir,
    subMissions,
    tasksCreated: subMissions.length,
    parsed: output.includes('---TASKS---'),
  })
}
