import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

// Base directory where all generated project code will live
// Structure: Claude Gank/projects/{projectId}/  (sibling of multi-agent-dashboard/)
const PROJECTS_BASE = process.env.PROJECTS_BASE_DIR ||
  path.join(process.cwd(), '..', 'projects')

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
  const { description, priority = 'high', template_id, template_name } = body
  const origin = new URL(request.url).origin

  if (!description) return NextResponse.json({ error: 'description required' }, { status: 400 })

  // Dedup guard — ป้องกันสร้าง project ซ้ำในช่วง 60 วินาที (กรณีกด/ส่งซ้ำ)
  const descKey = description.trim().slice(0, 80)
  const recent = db.prepare(`
    SELECT id, name FROM projects
    WHERE substr(description, 1, 80) = ? AND created_at > datetime('now', '-60 seconds')
    LIMIT 1
  `).get(descKey) as any
  if (recent) {
    return NextResponse.json({ ok: true, projectId: recent.id, duplicate: true, message: 'Project นี้เพิ่งถูกสร้างไปแล้ว ไม่ถึง 60 วินาที' })
  }

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
      INSERT INTO projects (id, name, description, work_dir, docker_compose_path, status, template_id, template_name)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(
      projectId,
      description.slice(0, 100),
      description,
      workDir,
      path.join(workDir, 'docker-compose.yml'),
      template_id || null,
      template_name || null,
    )
  } catch {}

  // 3. Fetch template details if provided
  let templateContext = ''
  if (template_id) {
    const tpl = db.prepare('SELECT * FROM project_templates WHERE id = ?').get(template_id) as any
    if (tpl) {
      const parts: string[] = []
      if (tpl.tech_stack) parts.push(`**Tech Stack:** ${tpl.tech_stack}`)
      if (tpl.description) parts.push(`**Template Description:** ${tpl.description}`)
      if (tpl.system_prompt_extra) parts.push(`**คำสั่งพิเศษจาก Template:**\n${tpl.system_prompt_extra}`)
      if (tpl.figma_url) parts.push(`**Figma File URL:** ${tpl.figma_url}\n(UX/UI agent และ Frontend agent ต้องใช้ design system จาก Figma นี้)`)
      if (tpl.figma_design_context) parts.push(`**Figma Design Context (สกัดจาก Figma แล้ว — ใช้ได้เลย):**\n${tpl.figma_design_context}`)
      if (parts.length > 0) {
        templateContext = `\n---\n## 🎨 Template: ${tpl.name}\n${parts.join('\n')}\n`
      }
    }
  }

  // 4. Fetch all agents for roster
  const agents = db.prepare('SELECT id, name, role, team FROM agents ORDER BY team, name').all() as any[]
  const roster = buildRoster(agents)

  // 5. Build mission description for เลขา — include workDir so she can pass it to each agent
  const missionDescription = `## งานที่ได้รับมอบหมาย
${description}
${templateContext}

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
5. **[Phase บังคับ]** ทุก task ต้องมี field "phase" เป็นตัวเลข (integer) เสมอ — ระบบใช้ phase นี้ตัดสินลำดับการทำงาน:
   - phase 1 = งานแรกที่ทำได้ทันที (UX, Architecture, Setup)
   - phase 2 = งานที่ต้องรอ phase 1 เสร็จก่อน (Feature development)
   - phase 3 = QA / Testing
   - phase 4 = Integration / Docker deploy (task สุดท้ายเสมอ)
   - **ห้ามใช้ phase 0** และ **ห้ามละ field phase** — ถ้าไม่ระบุ task นั้นจะไม่ถูก execute
6. **[Integration task บังคับ]** ทุกโปรเจคต้องมี Integration task เป็น task สุดท้าย (phase 4) โดย:
   - docker-compose.yml ต้องมีครบ 3 services: **web** (Dockerfile build) + **cloudbeaver** (DB admin UI, dbeaver/cloudbeaver:latest, port 8978) + **postgres** (database)
   - Integration agent ต้องสร้าง/ตรวจสอบ/แก้ไข docker-compose.yml ให้ครบและ build ได้จริง
   - ผลลัพธ์ต้องมี Access Info ครบ: Web App URL, DB Admin URL, PostgreSQL credentials
7. **[Next.js cleanup บังคับ]** ถ้าโปรเจคเป็น Next.js: ใน description ของ Setup/Backend agent (phase 2) ต้องระบุให้ลบ \`src/app/page.tsx\` ที่เป็น boilerplate ทิ้ง และรัน \`npx prisma generate\` หลังแก้ schema ทุกครั้ง

ตัวอย่าง output:
---TASKS---
{
  "project": "ชื่อโปรเจค",
  "tasks": [
    { "agent_name": "ชื่อ agent", "title": "ชื่องาน", "description": "บันทึกไฟล์ทั้งหมดที่ ${workDir}/...\nรายละเอียดงาน...", "priority": "high", "phase": 1 },
    { "agent_name": "ชื่อ agent", "title": "ชื่องาน phase 2", "description": "...", "priority": "high", "phase": 2 },
    { "agent_name": "SRE Engineer", "title": "[INTEGRATION] Docker Setup", "description": "...", "priority": "high", "phase": 4 }
  ]
}
---END---`

  // 6. Create secretary mission
  const parentId = `mission-${uuidv4().slice(0, 8)}`
  db.prepare(`
    INSERT INTO missions (id, title, description, agent_id, priority, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(parentId, `[ORCHESTRA] ${description.slice(0, 80)}`, missionDescription, secretaryId, priority)

  // Link secretary mission to the project
  try {
    db.prepare(`UPDATE projects SET mission_id = ? WHERE id = ?`).run(parentId, projectId)
  } catch {}

  // 7. Fire execute in background — don't block the response
  //    Secretary will run, output ---TASKS---, and spawnSecretarySubMissions() will create sub-missions.
  //    Use origin from request so port is always correct (e.g. 9001, not hardcoded 3000).
  fetch(`${origin}/api/missions/${parentId}/execute`, { method: 'POST' }).catch((e) => {
    console.error('[orchestra] execute fire-and-forget failed:', e.message)
  })

  return NextResponse.json({
    ok: true,
    projectMissionId: parentId,
    projectId,
    workDir,
    tasksCreated: 0,
    parsed: false,
  })
}
