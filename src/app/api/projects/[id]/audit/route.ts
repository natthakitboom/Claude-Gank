import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

// Find QA / Security agent — prefer QA, fallback any TECH/QA agent
function getQaAgentId(db: any): string | null {
  const agent = db.prepare(`
    SELECT id FROM agents
    WHERE (role LIKE '%QA%' OR role LIKE '%Quality%' OR name LIKE '%QA%' OR name LIKE '%Tester%' OR name LIKE '%Security%')
    LIMIT 1
  `).get() as any
  return agent?.id || null
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  const projectId = params.id

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const qaAgentId = getQaAgentId(db)
  if (!qaAgentId) return NextResponse.json({ error: 'No QA agent found' }, { status: 500 })

  // Fetch all existing missions for this project so audit knows current state
  const missions = db.prepare(`
    SELECT m.title, m.status, m.phase, a.name as agent_name
    FROM missions m
    LEFT JOIN agents a ON m.agent_id = a.id
    WHERE m.id = ? OR m.parent_mission_id = ?
    ORDER BY m.phase, m.created_at
  `).all(project.mission_id, project.mission_id) as any[]

  const missionSummary = missions.map(m =>
    `- [Phase ${m.phase ?? '-'}] ${m.agent_name ?? 'unknown'}: ${m.title} (${m.status})`
  ).join('\n') || '(no missions found)'

  // Fetch all agents for roster (so audit can spawn sub-tasks)
  const agents = db.prepare('SELECT id, name, role, team FROM agents ORDER BY team, name').all() as any[]
  const roster = agents.map(a => `- ${a.name} (${a.role}) [id: ${a.id}]`).join('\n')

  const workDir = project.work_dir || '(unknown)'

  const missionDescription = `## [AUDIT] ตรวจสอบโปรเจค: ${project.name}

### โปรเจค
- **ID**: ${project.id}
- **ชื่อ**: ${project.name}
- **Work Directory**: \`${workDir}\`
- **สถานะ**: ${project.status}

### Mission Progress ของโปรเจคนี้
${missionSummary}

---
## หน้าที่ของคุณ (QA Audit)

1. **ตรวจสอบโค้ดทั้งหมด** ใน \`${workDir}\` — ดูว่ามีไฟล์อะไรบ้าง, โค้ดครบถ้วนไหม
2. **วิเคราะห์ bugs และปัญหา** ที่พบ: syntax errors, logic errors, missing files, missing env vars, ฯลฯ
3. **ตรวจสอบ docker-compose.yml** ว่า services ครบ 3 ตัว (web + cloudbeaver + postgres) และ build ได้จริงไหม
4. **output ---TASKS--- block** สำหรับแต่ละ bug/ปัญหาที่ต้องแก้ไข

---
## รายชื่อ agent ที่ส่งงานได้
${roster}

---
## กฎสำคัญ
- ถ้าพบปัญหา ให้ output ---TASKS--- block เพื่อสร้าง fix missions อัตโนมัติ
- ถ้าไม่มีปัญหา ให้ output \`---TASKS---\n{ "project": "${project.name}", "tasks": [] }\n---END---\`
- แต่ละ task ต้องระบุ: agent_name, title, description (พร้อม work_dir \`${workDir}\`), priority

ตัวอย่าง output:
---TASKS---
{
  "project": "${project.name}",
  "tasks": [
    { "agent_name": "Back-end Developer", "title": "Fix missing auth middleware", "description": "ใน \`${workDir}/src/middleware.ts\` ยังไม่มี auth guard...\\nงาน: เพิ่ม middleware...", "priority": "high" }
  ]
}
---END---`

  const missionId = `mission-${uuidv4().slice(0, 8)}`
  db.prepare(`
    INSERT INTO missions (id, title, description, agent_id, priority, status, parent_mission_id)
    VALUES (?, ?, ?, ?, 'high', 'pending', ?)
  `).run(
    missionId,
    `[AUDIT] ${project.name}`,
    missionDescription,
    qaAgentId,
    project.mission_id || null,
  )

  return NextResponse.json({ ok: true, missionId, message: 'Audit mission created' })
}
