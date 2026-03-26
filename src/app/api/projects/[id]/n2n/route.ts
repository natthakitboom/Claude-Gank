import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

// Find Secretary agent
function getSecretaryId(db: any): string | null {
  const agent = db.prepare(`
    SELECT id FROM agents WHERE team = 'CORE'
      AND (name LIKE '%เลขา%' OR name LIKE '%Secretary%' OR role LIKE '%Coordinator%' OR role LIKE '%coordinator%')
    LIMIT 1
  `).get() as any
  if (agent) return agent.id
  const fallback = db.prepare(`
    SELECT id FROM agents WHERE team = 'CORE' AND name NOT LIKE '%Chief%' LIMIT 1
  `).get() as any
  return fallback?.id || null
}

// Build human-readable agent roster
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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  const projectId = params.id
  const body = await request.json().catch(() => ({}))
  const { issue } = body // optional: user-described issue

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const secretaryId = getSecretaryId(db)
  if (!secretaryId) return NextResponse.json({ error: 'No secretary agent found' }, { status: 500 })

  // Fetch mission tree for this project
  const missions = db.prepare(`
    SELECT m.id, m.title, m.status, m.phase, a.name as agent_name
    FROM missions m
    LEFT JOIN agents a ON m.agent_id = a.id
    WHERE m.id = ? OR m.parent_mission_id = ?
    ORDER BY m.phase, m.created_at
  `).all(project.mission_id, project.mission_id) as any[]

  const missionSummary = missions.map(m =>
    `- [Phase ${m.phase ?? '-'}] ${m.agent_name ?? 'unknown'}: ${m.title} (${m.status})`
  ).join('\n') || '(no missions found)'

  const agents = db.prepare('SELECT id, name, role, team FROM agents ORDER BY team, name').all() as any[]
  const roster = buildRoster(agents)

  const workDir = project.work_dir || '(unknown)'
  const issueContext = issue ? `\n\n### ปัญหาที่ผู้ใช้แจ้ง\n${issue}` : ''

  const missionDescription = `## [N2N FIX] ส่งงานซ่อมให้ทีม: ${project.name}
${issueContext}

### โปรเจค
- **ID**: ${project.id}
- **ชื่อ**: ${project.name}
- **Work Directory**: \`${workDir}\`
- **สถานะปัจจุบัน**: ${project.status}

### Mission ที่มีอยู่แล้ว
${missionSummary}

---
## หน้าที่ของคุณ (เลขา)

วิเคราะห์สถานะปัจจุบันของโปรเจค แล้วแบ่งงานซ่อม/ต่อ ให้ agent ที่เหมาะสม:
1. ดู mission ที่ \`failed\` หรือ \`cancelled\` → สร้าง fix mission ใหม่
2. ดู mission ที่ยังไม่ทำ หรือ stuck → สร้าง mission ต่อ
3. ถ้าโปรเจค integrate ไม่ผ่าน → สร้าง Integration mission ใหม่
4. ถ้ามีปัญหาที่แจ้งมา → สร้าง mission แก้ปัญหานั้นโดยตรง

ในทุก task description ต้องระบุ:
- work directory: \`${workDir}\`
- context ที่ agent ต้องรู้เพื่อทำงานได้เลย

---
## รายชื่อ agent ที่ส่งงานได้
${roster}

---
## กฎสำคัญ
- ต้อง output ---TASKS--- block เสมอ
- ถ้าไม่มีงานซ่อม ให้ output \`{ "project": "${project.name}", "tasks": [] }\`
- ใช้ agent ที่ตรงกับงานจริงๆ
- แต่ละ description ต้องละเอียดพอให้ agent ทำงานได้ทันที

ตัวอย่าง output:
---TASKS---
{
  "project": "${project.name}",
  "tasks": [
    { "agent_name": "Back-end Developer", "title": "Fix API auth bug", "description": "บันทึกที่ \`${workDir}/src/...\`\\nรายละเอียด...", "priority": "high" }
  ]
}
---END---`

  const missionId = `mission-${uuidv4().slice(0, 8)}`
  db.prepare(`
    INSERT INTO missions (id, title, description, agent_id, priority, status, parent_mission_id)
    VALUES (?, ?, ?, ?, 'high', 'pending', ?)
  `).run(
    missionId,
    `[N2N FIX] ${project.name}`,
    missionDescription,
    secretaryId,
    project.mission_id || null,
  )

  return NextResponse.json({ ok: true, missionId, message: 'N2N fix dispatched to Secretary' })
}
