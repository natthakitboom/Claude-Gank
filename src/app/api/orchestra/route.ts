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
    SELECT id FROM agents WHERE team = 'CORE' AND name LIKE '%เลขา%' LIMIT 1
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

// Match task agent_name to actual agent by fuzzy name/role search
function matchAgent(agents: any[], agentName: string): any | null {
  const q = agentName.toLowerCase()
  // exact name match first
  let match = agents.find(a => a.name.toLowerCase() === q)
  if (match) return match
  // partial name match
  match = agents.find(a => a.name.toLowerCase().includes(q) || q.includes(a.name.toLowerCase()))
  if (match) return match
  // role match
  match = agents.find(a => a.role.toLowerCase().includes(q) || q.includes(a.role.toLowerCase()))
  if (match) return match
  // keyword matching for common roles
  const keywords: Record<string, string[]> = {
    'front': ['front', 'ui', 'react', 'ux'],
    'back': ['back', 'api', 'database', 'server'],
    'qa': ['qa', 'test', 'quality'],
    'devops': ['devops', 'deploy', 'infra', 'docker'],
    'ba': ['analyst', 'business', 'requirement'],
    'tech lead': ['lead', 'architect', 'senior'],
    'pm': ['project', 'manager', 'scrum'],
    'ux': ['ux', 'design', 'ui', 'user experience'],
    'writer': ['writer', 'document', 'technical'],
  }
  for (const [key, kws] of Object.entries(keywords)) {
    if (kws.some(k => q.includes(k))) {
      match = agents.find(a =>
        kws.some(k => a.name.toLowerCase().includes(k) || a.role.toLowerCase().includes(k))
      )
      if (match) return match
    }
  }
  return null
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
    const execRes = await fetch(`http://localhost:3000/api/missions/${parentId}/execute`, { method: 'POST' })
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

  // 7. Parse ---TASKS--- block
  const tasksMatch = output.match(/---TASKS---\s*([\s\S]*?)\s*---END---/)
  if (!tasksMatch) {
    return NextResponse.json({ ok: true, projectMissionId: parentId, subMissions: [], parsed: false, note: 'No TASKS block found in output' })
  }

  let tasks: any[] = []
  try {
    const jsonStr = tasksMatch[1].trim().replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(jsonStr)
    tasks = parsed.tasks || []
  } catch {
    return NextResponse.json({ ok: true, projectMissionId: parentId, subMissions: [], parsed: false })
  }

  // 8. Create + execute sub-missions — inject workDir into every description
  const subMissions: any[] = []
  for (const task of tasks) {
    const agent = matchAgent(agents, task.agent_name)
    if (!agent) continue

    const subId = `mission-${uuidv4().slice(0, 8)}`
    const subDescription = `## 📁 Work Directory\nบันทึกไฟล์ทั้งหมดไว้ที่: \`${workDir}\`\n\n${task.description}`

    db.prepare(`
      INSERT INTO missions (id, title, description, agent_id, priority, status, parent_mission_id)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(subId, task.title, subDescription, agent.id, task.priority || priority, parentId)

    subMissions.push({ id: subId, title: task.title, agent_id: agent.id, agent_name: agent.name })

    // Fire execute (non-blocking)
    fetch(`http://localhost:3000/api/missions/${subId}/execute`, { method: 'POST' }).catch(() => {})
  }

  // Update project name from เลขา's parsed output if available
  try {
    const m = output.match(/---TASKS---\s*([\s\S]*?)\s*---END---/)
    if (m) {
      const j = JSON.parse(m[1].trim().replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, ''))
      if (j.project) {
        db.prepare(`UPDATE projects SET name = ? WHERE id = ?`).run(String(j.project).slice(0, 100), projectId)
      }
    }
  } catch {}

  return NextResponse.json({
    ok: true,
    projectMissionId: parentId,
    projectId,
    workDir,
    subMissions,
    tasksCreated: subMissions.length,
  })
}
