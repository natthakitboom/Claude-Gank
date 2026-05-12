import { spawn, execSync } from 'child_process'
import os from 'os'
import { getDb, ensureColumn } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { autoNotify } from '@/lib/notify'
import { matchAgent } from '@/lib/agents'
import { parseDemoAccounts, parseDemoAccountsJson } from '@/lib/parseAccounts'

// ── Git helpers ───────────────────────────────────────────────────────────────

function gitInitProject(workDir: string, projectName: string) {
  const fs = require('fs')
  const path = require('path')
  // Skip entirely if repo already exists — gitAutoCommit handles ongoing commits
  if (fs.existsSync(path.join(workDir, '.git'))) return
  try {
    execSync('git init', { cwd: workDir, stdio: 'pipe' })
    execSync('git config user.email "agent@claudegank.local"', { cwd: workDir, stdio: 'pipe' })
    execSync('git config user.name "Claude Gank"', { cwd: workDir, stdio: 'pipe' })
    // .gitignore
    const gitignorePath = path.join(workDir, '.gitignore')
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, [
        'node_modules/', '.next/', '.env', '*.log',
        'dist/', 'build/', '.DS_Store', '*.local',
        'prisma/dev.db', 'prisma/dev.db-journal',
      ].join('\n'))
    }
    // Initial commit
    execSync('git add -A', { cwd: workDir, stdio: 'pipe' })
    execSync(`git commit -m "🚀 Initial project setup: ${projectName.slice(0, 60)}" --allow-empty`, { cwd: workDir, stdio: 'pipe' })
    console.log(`[git] ✅ Initialized repo for: ${projectName}`)
  } catch (e: any) {
    console.error('[git] init error:', e.message)
  }
}

function gitAutoCommit(workDir: string, missionTitle: string, agentName: string, phase?: number, tagLabel?: string) {
  const fs = require('fs')
  const path = require('path')
  if (!workDir || !fs.existsSync(path.join(workDir, '.git'))) return
  try {
    // Ensure git user config — log failure explicitly
    try {
      execSync('git config user.email "agent@claudegank.local"', { cwd: workDir, stdio: 'pipe' })
      execSync('git config user.name "Claude Gank"', { cwd: workDir, stdio: 'pipe' })
    } catch (e: any) {
      console.error('[git] config error (commits may fail):', e.message)
    }

    execSync('git add -A', { cwd: workDir, stdio: 'pipe' })

    const status = execSync('git status --porcelain', { cwd: workDir }).toString().trim()
    if (!status) return

    const fileCount = status.split('\n').filter(Boolean).length
    const phasePrefix = phase !== undefined ? `[Phase ${phase}] ` : ''
    const msg = `${phasePrefix}[${agentName}] ${missionTitle.slice(0, 60)} (${fileCount} files)`

    execSync(`git commit -m ${JSON.stringify(msg)}`, { cwd: workDir, stdio: 'pipe' })
    console.log(`[git] 💾 Auto-commit: ${msg}`)

    if (tagLabel) {
      try {
        const ts = Date.now().toString(36)
        execSync(`git tag ${JSON.stringify(`${tagLabel}-${ts}`)}`, { cwd: workDir, stdio: 'pipe' })
        console.log(`[git] 🏷️ Tagged: ${tagLabel}-${ts}`)
      } catch (e: any) {
        console.error('[git] tag error:', e.message)
      }
    }
  } catch (e: any) {
    console.error('[git] auto-commit error:', e.message)
  }
}

// Generate a docker-compose.yml + Dockerfile for a new project work directory
// Standard stack: Next.js 14 + TypeScript + Tailwind + Prisma + PostgreSQL + Swagger
function setupProjectDocker(workDir: string, projectName: string) {
  const fs = require('fs')
  const path = require('path')

  fs.mkdirSync(workDir, { recursive: true })

  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)

  // Single Next.js app handles both frontend + API routes
  const compose = `services:
  # ─── PostgreSQL + PostGIS ──────────────────────────────────────
  db:
    image: postgis/postgis:16-3.4-alpine
    container_name: ${slug}-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: app_pass
      POSTGRES_DB: app_db
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app_user -d app_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── Next.js App (Frontend + API Routes) ──────────────────────
  web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ${slug}-web
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://app_user:app_pass@db:5432/app_db
      NEXTAUTH_SECRET: local-dev-secret-32chars
      NEXTAUTH_URL: http://localhost:3000
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src
      - ./prisma:/app/prisma
    command: >
      sh -c "npx prisma db push --accept-data-loss 2>/dev/null || true && npm run dev"

  # ─── DB Admin UI ───────────────────────────────────────────────
  cloudbeaver:
    image: dbeaver/cloudbeaver:latest
    container_name: ${slug}-cloudbeaver
    restart: unless-stopped
    depends_on: [db]
    ports:
      - "8978:8978"

volumes:
  db_data:
`

  const dockerfile = `FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install
RUN npm install --save-dev prisma@5 @prisma/client@5
COPY . .
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
`

  const packageJson = `{
  "name": "app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@prisma/client": "5",
    "zod": "^3.23.8",
    "bcryptjs": "^2.4.3",
    "jose": "^5.6.3",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "lucide-react": "^0.390.0",
    "class-variance-authority": "^0.7.0",
    "next-swagger-doc": "^0.4.0",
    "swagger-ui-react": "^5.17.14"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "@types/node": "^20.14.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/swagger-ui-react": "^4.18.3",
    "prisma": "5",
    "tailwindcss": "^3.4.4",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.3"
  }
}
`

  const envFile = `DATABASE_URL=postgresql://app_user:app_pass@localhost:5432/app_db
NEXTAUTH_SECRET=local-dev-secret-32chars
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
`

  const tsconfig = `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`

  const tailwindConfig = `import type { Config } from "tailwindcss"
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
export default config
`

  const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig
`

  const prismaSchema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`

  const prismaLib = `import { PrismaClient } from "@prisma/client"
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
`

  const layoutTsx = `import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
const inter = Inter({ subsets: ["latin"] })
export const metadata: Metadata = { title: "${projectName}" }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
`

  const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;
`

  const homePage = `export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">${projectName}</h1>
      <p className="text-gray-500 mt-2">ระบบพร้อมใช้งาน</p>
    </main>
  )
}
`

  // Write all files
  fs.writeFileSync(path.join(workDir, 'docker-compose.yml'), compose)
  if (!fs.existsSync(path.join(workDir, 'Dockerfile'))) {
    fs.writeFileSync(path.join(workDir, 'Dockerfile'), dockerfile)
  }
  if (!fs.existsSync(path.join(workDir, 'package.json'))) {
    fs.writeFileSync(path.join(workDir, 'package.json'), packageJson)
  }
  if (!fs.existsSync(path.join(workDir, '.env'))) {
    fs.writeFileSync(path.join(workDir, '.env'), envFile)
  }
  if (!fs.existsSync(path.join(workDir, 'tsconfig.json'))) {
    fs.writeFileSync(path.join(workDir, 'tsconfig.json'), tsconfig)
  }
  if (!fs.existsSync(path.join(workDir, 'tailwind.config.ts'))) {
    fs.writeFileSync(path.join(workDir, 'tailwind.config.ts'), tailwindConfig)
  }
  if (!fs.existsSync(path.join(workDir, 'next.config.js'))) {
    fs.writeFileSync(path.join(workDir, 'next.config.js'), nextConfig)
  }
  if (!fs.existsSync(path.join(workDir, 'postcss.config.js'))) {
    fs.writeFileSync(path.join(workDir, 'postcss.config.js'), `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }`)
  }

  // Prisma
  fs.mkdirSync(path.join(workDir, 'prisma'), { recursive: true })
  if (!fs.existsSync(path.join(workDir, 'prisma/schema.prisma'))) {
    fs.writeFileSync(path.join(workDir, 'prisma/schema.prisma'), prismaSchema)
  }

  // src structure
  fs.mkdirSync(path.join(workDir, 'src/app/api'), { recursive: true })
  fs.mkdirSync(path.join(workDir, 'src/components/ui'), { recursive: true })
  fs.mkdirSync(path.join(workDir, 'src/lib'), { recursive: true })
  fs.mkdirSync(path.join(workDir, 'src/types'), { recursive: true })

  if (!fs.existsSync(path.join(workDir, 'src/lib/prisma.ts'))) {
    fs.writeFileSync(path.join(workDir, 'src/lib/prisma.ts'), prismaLib)
  }
  if (!fs.existsSync(path.join(workDir, 'src/app/layout.tsx'))) {
    fs.writeFileSync(path.join(workDir, 'src/app/layout.tsx'), layoutTsx)
  }
  if (!fs.existsSync(path.join(workDir, 'src/app/globals.css'))) {
    fs.writeFileSync(path.join(workDir, 'src/app/globals.css'), globalsCss)
  }
  if (!fs.existsSync(path.join(workDir, 'src/app/page.tsx'))) {
    fs.writeFileSync(path.join(workDir, 'src/app/page.tsx'), homePage)
  }

  // Init git repo + initial commit
  gitInitProject(workDir, projectName)

  return path.join(workDir, 'docker-compose.yml')
}

// ═══════════════════════════════════════════════════════════════════════════
// Professional SDLC — Phase-based Project Workflow with Gate Checks
//
// Phase 0: Product Framing / Kickoff
//          → BA (Problem Statement, User Stories), Tech Lead (Feasibility),
//            UX (User Journey)
//          [Gate 0: Scope + Success Criteria defined]
//
// Phase 1: Analyze & Design
//          → BA (Detailed Requirements, Edge Cases), UX (Wireframe, UI Spec),
//            Tech Lead (Architecture, API Contract, Prisma Schema, NFR)
//          [Gate 1: Design Approval — Requirements, UX, Architecture approved]
//
// Phase 2: Development
//          → Backend Dev (API Routes, Prisma, Tests), Frontend Dev (Pages, Components),
//            DevOps (Docker, CI), Tech Lead (Code Review)
//          [Gate 2: Engineering Quality — Build, Tests, Docker run]
//
// Phase 3: QA & Validation
//          → QA (Functional + API + Edge Case Tests, Bug Report)
//          → Bug Fix Loop (max 2 rounds) → Escalate if exceeded
//          [Gate 3: QA Pass — Critical=0, High=0, Regression pass]
//
// Phase 4: Integration & Release Readiness
//          → Tech Lead (Final Review), DevOps (docker compose build+up),
//            QA (Smoke Test), Team (Release Notes)
//          [Gate 4: Ready to Use — Services up, DB migrated, App usable E2E]
// ═══════════════════════════════════════════════════════════════════════════

const PHASE_NAMES: Record<number, string> = {
  0: 'Product Framing',
  1: 'Analyze & Design',
  2: 'Development',
  3: 'QA & Validation',
  4: 'Integration & Release',
}

function collectPhaseOutputs(db: any, parentMissionId: string, upToPhase: number): string {
  const missions = db.prepare(
    `SELECT title, output, phase, agent_id FROM missions
     WHERE parent_mission_id = ? AND phase < ? AND status = 'done' AND output IS NOT NULL
     ORDER BY phase, created_at`
  ).all(parentMissionId, upToPhase) as any[]

  if (missions.length === 0) return ''

  const sections: string[] = []
  let currentPhase = -1

  for (const m of missions) {
    if (m.phase !== currentPhase) {
      currentPhase = m.phase
      sections.push(`\n### 📋 Phase ${m.phase} — ${PHASE_NAMES[m.phase] || 'Other'}`)
    }
    // Truncate each output to keep context manageable
    const preview = (m.output || '').slice(0, 3000)
    sections.push(`\n**${m.title}:**\n${preview}${m.output?.length > 3000 ? '\n... (truncated)' : ''}`)
  }

  return `\n\n---\n## 📑 ผลงานจาก Phase ก่อนหน้า (อ่านให้ละเอียดแล้วทำงานต่อตาม spec)\n${sections.join('\n')}\n---\n`
}

function advanceProjectPhase(db: any, parentMissionId: string) {
  const siblings = db.prepare(
    `SELECT id, title, status, phase, output, agent_id, qa_round FROM missions WHERE parent_mission_id = ?`
  ).all(parentMissionId) as any[]

  if (siblings.length === 0) return

  // Group by phase — skip NULL-phase missions (N2N tasks, unphased helpers)
  // null phase → Number(null) = 0, which would corrupt Phase 0 gate checks
  const phases: Record<number, any[]> = {}
  for (const s of siblings) {
    if (s.phase === null || s.phase === undefined) continue
    if (!phases[s.phase]) phases[s.phase] = []
    phases[s.phase].push(s)
  }

  const phaseNumbers = Object.keys(phases).map(Number).sort((a, b) => a - b)

  // Safety net: if lowest phase has all waiting_phase (no phase 0 fired), fire it directly.
  // Only triggers when phase 0 truly doesn't exist (no missions at phase < lowestPhase).
  const lowestPhase = phaseNumbers[0]
  if (lowestPhase !== undefined && lowestPhase > 0 && !phases[0]) {
    const lowestMissions = phases[lowestPhase]
    const allWaiting = lowestMissions.every((m: any) => m.status === 'waiting' || m.status === 'waiting_phase')
    if (allWaiting) {
      console.log(`[phase] 🚑 Safety net: no Phase 0 found, firing Phase ${lowestPhase} directly`)
      for (const m of lowestMissions) {
        db.prepare(`UPDATE missions SET status = 'pending' WHERE id = ?`).run(m.id)
        fetch(`${BASE_URL}/api/missions/${m.id}/execute`, { method: 'POST' })
          .catch(e => console.error('[phase] safety-net spawn failed', m.id, e.message))
      }
      return
    }
  }

  for (let i = 0; i < phaseNumbers.length; i++) {
    const phase = phaseNumbers[i]
    const phaseMissions = phases[phase]

    // Check if this phase is complete (all done or failed)
    const allDone = phaseMissions.every((m: any) => m.status === 'done' || m.status === 'failed')
    if (!allDone) continue

    // Warn when advancing from a phase where every mission failed — QA will run on broken code
    const allFailed = phaseMissions.every((m: any) => m.status === 'failed')
    if (allFailed) {
      console.warn(`[phase] ⚠️ Phase ${phase} — ALL missions failed, advancing anyway. Next phase may receive no output.`)
    }

    // Find next phase
    const nextPhase = phaseNumbers[i + 1]
    if (nextPhase === undefined) continue

    const nextMissions = phases[nextPhase]
    const hasWaiting = nextMissions.some((m: any) =>
      m.status === 'waiting' || m.status === 'waiting_phase'
    )
    if (!hasWaiting) continue

    // ── Gate Check: QA Phase (3) → check bug fix loop before advancing to Phase 4 ──
    if (phase === 3) {
      const qaMissions = phaseMissions.filter((m: any) =>
        /qa|test|ทดสอบ|quality/i.test(m.title)
      )
      const latestQA = qaMissions.length > 0
        ? qaMissions.reduce((a: any, b: any) => (a.qa_round || 0) >= (b.qa_round || 0) ? a : b)
        : null

      if (latestQA && latestQA.status === 'done' && latestQA.output) {
        const hasCriticalBugs = checkForBugs(latestQA.output)
        const qaRound = latestQA.qa_round || 0

        if (hasCriticalBugs && qaRound < 5) {
          // Bug Fix Loop — spawn fix mission, then re-test (up to 5 rounds)
          spawnBugFixLoop(db, parentMissionId, latestQA, qaRound + 1)
          return
        }

        if (hasCriticalBugs && qaRound >= 5) {
          // Hard cap exceeded — escalate to Tech Lead
          escalateQAFailure(db, parentMissionId, latestQA)
          return
        }
      }
    }

    // ── Advance: collect context from all completed phases, inject, and fire ──
    console.log(`[phase] ✅ Gate ${phase} passed → advancing to Phase ${nextPhase} (${PHASE_NAMES[nextPhase]})`)
    const context = collectPhaseOutputs(db, parentMissionId, nextPhase)

    for (const m of nextMissions) {
      if (m.status !== 'waiting' && m.status !== 'waiting_phase') continue

      // Inject phase context into description
      if (context) {
        const currentDesc = m.description || ''
        if (!currentDesc.includes('📑 ผลงานจาก Phase ก่อนหน้า')) {
          db.prepare(`UPDATE missions SET description = ? WHERE id = ?`)
            .run(context + currentDesc, m.id)
        }
      }

      db.prepare(`UPDATE missions SET status = 'pending' WHERE id = ?`).run(m.id)
      fetch(`${BASE_URL}/api/missions/${m.id}/execute`, { method: 'POST' }).catch((e) => console.error('[phase] spawn failed for mission', m.id, e.message))
      console.log(`[phase] 🚀 fired ${m.id} (${m.title}) — Phase ${nextPhase}`)
    }

    return // Advance one phase at a time
  }

  // ── All phases done — check if project needs an auto-fix loop ──────────────
  autoLoopProjectFix(db, parentMissionId)
}

// ── Auto-seed: spawn demo account seeding when project hits 100% ─────────────
function autoSeedDemoAccounts(db: any, parentMissionId: string) {
  const project = db.prepare('SELECT * FROM projects WHERE mission_id = ?').get(parentMissionId) as any
  if (!project) return

  // Already have accounts — nothing to do
  if (project.demo_accounts_json) return

  // Avoid spawning duplicate SEED missions
  const existing = db.prepare(
    `SELECT id FROM missions WHERE parent_mission_id = ? AND title LIKE '[SEED]%' AND status NOT IN ('failed','cancelled')`
  ).get(parentMissionId)
  if (existing) return

  const agents = db.prepare('SELECT id, name, role FROM agents ORDER BY name').all() as any[]
  const agent = agents.find((a: any) =>
    a.name.includes('เลขา') || a.role.toLowerCase().includes('coordinator') || a.role.toLowerCase().includes('fullstack') || a.role.toLowerCase().includes('devops')
  ) || agents[0]
  if (!agent) return

  const composeFile = project.docker_compose_path || `${project.work_dir}/docker-compose.yml`
  const webPort = project.web_port || '?'
  const adminerPort = project.adminer_port || '?'
  const seedId = `mission-${require('uuid').v4().slice(0, 8)}`
  const desc = `## [SEED] Demo Accounts + ตรวจสอบ Login จาก Browser

Project: ${project.name}
Work Dir: \`${project.work_dir}\`
Docker Compose: \`${composeFile}\`
Web Port (host): ${webPort} | Adminer Port: ${adminerPort}

### ขั้นตอนที่ต้องทำทั้งหมด

**ขั้นที่ 1 — ตรวจสอบ containers**
\`\`\`bash
docker compose -f "${composeFile}" ps
\`\`\`
ถ้า containers ไม่รัน → \`docker compose -f "${composeFile}" up -d\`

**ขั้นที่ 2 — Seed demo accounts ลง DB**
ลองตามลำดับ:
- \`docker exec <web_container> npx prisma db seed\`
- \`docker exec <web_container> node dist/seed.js\`
- \`docker exec <web_container> node scripts/seed.js\`
- ถ้าไม่มี seed script → INSERT ผ่าน SQL โดยตรง:
  \`docker exec <db_container> psql -U <user> -d <db> -c "INSERT INTO users (email, password_hash, role) VALUES ('admin@demo.com', '<bcrypt_hash>', 'admin'), ('user@demo.com', '<bcrypt_hash>', 'user')"\`

**ขั้นที่ 3 — ⚠️ ตรวจสอบ Dockerfile env สำหรับ browser access**
ถ้า frontend เป็น Next.js หรือ framework ที่ bake env ตอน build:
1. เปิด Dockerfile ของ frontend แล้วหา \`NEXT_PUBLIC_API_URL\` หรือ \`NEXT_PUBLIC_API_BASE_URL\`
2. ถ้าค่าเป็น \`http://<service_name>:<port>\` (Docker service name) → **ต้องแก้เป็น** \`http://localhost:<HOST_PORT>\`
   - เพราะ browser บน host ไม่รู้จัก Docker service name
3. ตรวจสอบ: \`grep -r "backend:\\|api:" .next/static/chunks/*.js 2>/dev/null | head -3\`
   ถ้าเจอ service name → rebuild ด้วย \`docker compose -f "${composeFile}" build <web_service> && docker compose -f "${composeFile}" up -d <web_service>\`

**ขั้นที่ 4 — ทดสอบ login จาก host (ไม่ใช่จากใน container)**
\`\`\`bash
# หา login endpoint จาก source code ก่อน (grep หา "auth/login" หรือ "signin")
curl -s -X POST http://localhost:${webPort}/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@demo.com","password":"demo1234"}'
\`\`\`
ต้องได้ JSON response ที่มี token — ถ้าได้ error → แก้ก่อน

**ขั้นที่ 5 — Output บังคับ**
\`\`\`
---ACCESS-INFO---
{"web_port":${webPort},"adminer_port":${adminerPort},"db_user":"<user>","db_password":"<pass>","demo_accounts":[{"role":"Admin","email":"admin@demo.com","password":"demo1234"},{"role":"User","email":"user@demo.com","password":"demo1234"}]}
---END---
\`\`\``

  db.prepare(`
    INSERT INTO missions (id, title, description, agent_id, priority, status, parent_mission_id, phase)
    VALUES (?, ?, ?, ?, 'high', 'pending', ?, 4)
  `).run(seedId, `[SEED] Demo Accounts — ${project.name}`, desc, agent.id, parentMissionId)

  fetch(`${BASE_URL}/api/missions/${seedId}/execute`, { method: 'POST' })
    .catch((e: any) => console.error('[auto-seed] spawn failed:', e.message))

  console.log(`[auto-seed] 🌱 Spawned seed mission ${seedId} for project ${project.id}`)
}

// ── Auto-loop: keep fixing until 100% complete ───────────────────────────────
// Runs after all phases complete. If failed missions remain, spawns a new
// orchestration round (via secretary) summarising what broke. Max 10 loops.
function autoLoopProjectFix(db: any, parentMissionId: string) {
  const MAX_LOOPS = 10

  const allSubs = db.prepare(
    `SELECT id, title, status, phase, output, error FROM missions
     WHERE parent_mission_id = ?
       AND title NOT LIKE '[N2N%'
       AND title NOT LIKE '[AUDIT]%'
       AND (status != 'cancelled')`
  ).all(parentMissionId) as any[]

  if (allSubs.length === 0) return

  const failed = allSubs.filter((m: any) => m.status === 'failed')
  const anyRunning = allSubs.some((m: any) => m.status === 'running' || m.status === 'pending' || m.status === 'waiting' || m.status === 'waiting_phase')

  // Don't fire a new loop if anything is still in progress
  if (anyRunning) return
  if (failed.length === 0) {
    console.log(`[auto-loop] ✅ Project ${parentMissionId} — all missions done (100%)`)
    autoSeedDemoAccounts(db, parentMissionId)
    return
  }

  // Count how many auto-fix loops have already been spawned for this project
  const loopCount = db.prepare(
    `SELECT COUNT(*) as c FROM missions
     WHERE parent_mission_id = ? AND title LIKE '[AUTO-FIX]%'`
  ).get(parentMissionId) as { c: number }

  if (loopCount.c >= MAX_LOOPS) {
    console.warn(`[auto-loop] ⚠️ Reached max ${MAX_LOOPS} auto-fix loops for ${parentMissionId} — stopping`)
    return
  }

  const agents = db.prepare('SELECT id, name, role, team FROM agents ORDER BY team, name').all() as any[]
  const secretary = agents.find((a: any) =>
    a.name.includes('เลขา') || a.name.toLowerCase().includes('secretary') || a.role.toLowerCase().includes('coordinator')
  )
  if (!secretary) return

  const total = allSubs.length
  const done = allSubs.filter((m: any) => m.status === 'done').length
  const progress = Math.round((done / total) * 100)

  const failedSummary = failed.slice(0, 10).map((m: any) =>
    `- **${m.title}** (phase ${m.phase ?? '?'})\n  Error: ${(m.error || m.output || '').slice(0, 300)}`
  ).join('\n')

  const loopId = `mission-${require('uuid').v4().slice(0, 8)}`
  const desc = `## 🔄 Auto-Fix Loop #${loopCount.c + 1}

Progress ปัจจุบัน: **${progress}%** (${done}/${total} tasks เสร็จ)

มี ${failed.length} task ที่ยังล้มเหลว — วิเคราะห์แต่ละ task แล้วแบ่งงานให้ทีมแก้ไข:

${failedSummary}

---
**กฎ:**
1. อ่าน error ของแต่ละ task ให้ละเอียด
2. ระบุ root cause
3. แบ่งงานแก้ไขให้ agent ที่เหมาะสม
4. Output ---TASKS--- block ตามปกติ
5. ถ้า task ใดต้องการ context จาก phase ก่อนหน้า ให้บอกใน description ด้วย`

  db.prepare(`
    INSERT INTO missions (id, title, description, agent_id, priority, status, parent_mission_id, phase)
    VALUES (?, ?, ?, ?, 'high', 'pending', ?, NULL)
  `).run(loopId, `[AUTO-FIX] Loop #${loopCount.c + 1} — ${progress}% complete`, desc, secretary.id, parentMissionId)

  fetch(`${BASE_URL}/api/missions/${loopId}/execute`, { method: 'POST' })
    .catch((e) => console.error('[auto-loop] spawn failed:', e.message))

  console.log(`[auto-loop] 🔄 Spawned fix loop #${loopCount.c + 1} for ${parentMissionId} (${failed.length} failed, ${progress}% done)`)
}

// ── Bug Detection ─────────────────────────────────────────────────────────

function checkForBugs(qaOutput: string): boolean {
  // If output explicitly says PASS at the end → not a fail (takes precedence)
  const lastSection = qaOutput.slice(-1500)
  const explicitPass = /QA\s*RESULT\s*:\s*PASS|OVERALL\s*RESULT\s*:\s*PASS|ผ่านทุก|ผ่านหมด|✅\s*PASS/i.test(lastSection)
  if (explicitPass) return false

  // Explicit fail signals only — no broad pattern matching
  const bugPatterns = [
    /QA\s*RESULT\s*:\s*FAIL/i,
    /OVERALL\s*RESULT\s*:\s*FAIL/i,
    /## 🔴\s*CRITICAL/i,
    /### CRITICAL BUGS FOUND/i,
    /REMAINING CRITICAL BUGS:/i,
    /SEVERITY:\s*CRITICAL.*UNRESOLVED/i,
    /ยังมี.*CRITICAL.*bug/i,
    /ยังมี.*bug.*ร้ายแรง/i,
  ]
  return bugPatterns.some(p => p.test(qaOutput))
}

// ── Bug Fix Loop ──────────────────────────────────────────────────────────

function spawnBugFixLoop(db: any, parentMissionId: string, qaMission: any, round: number) {
  console.log(`[qa-loop] 🔧 Round ${round} — CRITICAL/HIGH bugs found, spawning fix mission`)

  const agents = db.prepare('SELECT id, name, role, team FROM agents ORDER BY team, name').all() as any[]

  // Find best developer for bug fix
  const seniorDev = agents.find((a: any) =>
    a.name.toLowerCase().includes('senior') || a.role.toLowerCase().includes('senior')
  ) || agents.find((a: any) =>
    a.role.toLowerCase().includes('developer')
  )

  if (!seniorDev) {
    console.error('[qa-loop] no developer agent found for bug fix')
    return
  }

  // Get project work_dir
  const project = db.prepare('SELECT work_dir, docker_compose_path FROM projects WHERE mission_id = ?')
    .get(parentMissionId) as any

  const workDirCtx = project?.work_dir
    ? `\n\n---\n## 📁 Work Directory\n\`${project.work_dir}\`\nDocker Compose: \`${project.docker_compose_path || project.work_dir + '/docker-compose.yml'}\`\n---\n`
    : ''

  // Collect all previous phase outputs for context
  const prevContext = collectPhaseOutputs(db, parentMissionId, 4)

  const fixId = `mission-${uuidv4().slice(0, 8)}`
  const bugReport = qaMission.output.slice(0, 5000)

  const fixDescription = `${workDirCtx}${prevContext}

## 🔧 Bug Fix Round ${round}

QA Engineer ทดสอบแล้วพบ CRITICAL/HIGH bugs ให้แก้ทุก bug:

---
### QA Bug Report:
${bugReport}
---

**กฎ:**
1. อ่าน bug report ด้านบนให้ละเอียด
2. อ่าน Phase 1 spec (Architecture, API Contract) เพื่อเข้าใจ expected behavior
3. แก้ทุก CRITICAL และ HIGH bug — ระบุ root cause ของแต่ละ bug
4. ทดสอบว่าโค้ดที่แก้ compile ได้ + ไม่ break feature อื่น
5. ระบุ regression area ที่ QA ต้อง retest
6. บันทึกไฟล์ทั้งหมดใน work_dir ที่ระบุ

**Output format:**
สรุปท้าย output:
### FIXES APPLIED:
1. [ไฟล์] — root cause — สิ่งที่แก้
### REGRESSION AREAS:
1. [feature/page ที่ต้อง retest]`

  db.prepare(`
    INSERT INTO missions (id, title, description, agent_id, priority, status, parent_mission_id, phase, qa_round)
    VALUES (?, ?, ?, ?, 'high', 'pending', ?, 3, ?)
  `).run(fixId, `🔧 Bug Fix Round ${round}`, fixDescription, seniorDev.id, parentMissionId, round)

  fetch(`${BASE_URL}/api/missions/${fixId}/execute`, { method: 'POST' }).catch((e) => console.error('[qa-loop] spawn failed for fix mission', fixId, e.message))

  // Mark QA for retest after fix completes
  db.prepare(`UPDATE missions SET status = 'waiting_retest', qa_round = ? WHERE id = ?`)
    .run(round, qaMission.id)

  console.log(`[qa-loop] fix=${fixId} → QA ${qaMission.id} will retest after`)
}

// ── QA Retest Trigger ─────────────────────────────────────────────────────

function checkRetestQA(db: any, parentMissionId: string) {
  const qaMission = db.prepare(
    `SELECT id, title, status, qa_round FROM missions
     WHERE parent_mission_id = ? AND status = 'waiting_retest'`
  ).get(parentMissionId) as any

  if (!qaMission) return

  // Re-inject latest context (including bug fix output)
  const context = collectPhaseOutputs(db, parentMissionId, 4)
  const currentDesc = db.prepare('SELECT description FROM missions WHERE id = ?').get(qaMission.id) as any

  let desc = currentDesc?.description || ''
  // Remove old phase context to avoid duplication
  desc = desc.replace(/\n\n---\n## 📑 ผลงานจาก Phase ก่อนหน้า[\s\S]*?---\n/g, '')

  const retestNote = `\n\n⚠️ นี่คือ QA Retest Round ${qaMission.qa_round} — ตรวจ bug ที่แก้แล้ว + regression areas\n`

  db.prepare(`UPDATE missions SET description = ?, status = 'pending' WHERE id = ?`)
    .run(context + retestNote + desc, qaMission.id)

  fetch(`${BASE_URL}/api/missions/${qaMission.id}/execute`, { method: 'POST' }).catch((e) => console.error('[qa-loop] spawn failed for QA retest', qaMission.id, e.message))
  console.log(`[qa-loop] 🔄 re-running QA ${qaMission.id} (round ${qaMission.qa_round})`)
}

// ── QA Escalation (max rounds exceeded) ───────────────────────────────────

function escalateQAFailure(db: any, parentMissionId: string, qaMission: any) {
  console.log(`[qa-loop] ⚠️ Max QA rounds exceeded — escalating to Tech Lead`)

  const agents = db.prepare('SELECT id, name, role FROM agents ORDER BY name').all() as any[]
  const techLead = agents.find((a: any) =>
    a.role.toLowerCase().includes('tech lead') || a.name.toLowerCase().includes('tech lead')
  )

  if (!techLead) return

  const project = db.prepare('SELECT work_dir FROM projects WHERE mission_id = ?')
    .get(parentMissionId) as any

  const escalationId = `mission-${uuidv4().slice(0, 8)}`
  const bugReport = qaMission.output.slice(0, 4000)

  const desc = `## ⚠️ QA Escalation — Bug Fix Loop เกิน 2 รอบ

QA ทดสอบซ้ำ 2 รอบแล้วยังมี CRITICAL/HIGH bugs ที่แก้ไม่ได้
ให้ตัดสินใจ:
1. วิเคราะห์ root cause ที่แท้จริง
2. ถ้าแก้ได้ → แก้เอง
3. ถ้าต้อง redesign → ระบุสิ่งที่ต้องเปลี่ยน
4. ถ้าต้อง descope → ระบุ feature ที่ตัดออก

Work Dir: ${project?.work_dir || 'N/A'}

### Latest QA Report:
${bugReport}`

  db.prepare(`
    INSERT INTO missions (id, title, description, agent_id, priority, status, parent_mission_id, phase, qa_round)
    VALUES (?, ?, ?, ?, 'critical', 'pending', ?, 3, 99)
  `).run(escalationId, '⚠️ QA Escalation — Tech Lead Review', desc, techLead.id, parentMissionId)

  fetch(`${BASE_URL}/api/missions/${escalationId}/execute`, { method: 'POST' }).catch((e) => console.error('[qa-escalate] spawn failed for escalation', escalationId, e.message))
}

// After secretary mission completes, parse ---TASKS--- and spawn sub-missions
function spawnSecretarySubMissions(db: any, parentMissionId: string, output: string, priority: string) {
  const tasksMatch = output.match(/---TASKS---\s*([\s\S]*?)\s*---END---/)
  if (!tasksMatch) return

  let tasks: any[] = []
  let projectName: string | null = null
  try {
    const jsonStr = tasksMatch[1].trim().replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(jsonStr)
    tasks = parsed.tasks || []
    projectName = parsed.project || null
  } catch {
    return
  }

  const agents = db.prepare('SELECT id, name, role, team FROM agents ORDER BY team, name').all() as any[]

  // Auto-create project + docker setup first so Tech Lead knows the work_dir
  const parentMission = db.prepare('SELECT title FROM missions WHERE id = ?').get(parentMissionId) as any
  const name = projectName || parentMission?.title || 'Untitled Project'
  let workDir = ''
  let dockerComposePath: string | null = null

  // Only create a dev project if tasks include developer/engineer/devops roles
  const DEV_KEYWORDS = ['developer', 'devops', 'engineer', 'tech lead', 'senior', 'backend', 'frontend',
    'back-end', 'front-end', 'นักพัฒนา', 'โปรแกรมเมอร์', 'system admin', 'automation']
  const isDevProject = tasks.some((t: any) =>
    DEV_KEYWORDS.some(kw => t.agent_name?.toLowerCase().includes(kw))
  )

  // Also check if the parentMission itself is a child of another mission that owns a project
  // (e.g. [N2N FIX] / [AUDIT] missions have parent_mission_id pointing to the original orchestra mission)
  const parentMissionRow = db.prepare('SELECT parent_mission_id FROM missions WHERE id = ?').get(parentMissionId) as any
  const grandParentId = parentMissionRow?.parent_mission_id || null
  const existingProject = (
    db.prepare('SELECT id, work_dir, docker_compose_path FROM projects WHERE mission_id = ?').get(parentMissionId) ||
    (grandParentId ? db.prepare('SELECT id, work_dir, docker_compose_path FROM projects WHERE mission_id = ?').get(grandParentId) : null)
  ) as any
  if (!existingProject && isDevProject) {
    const projectId = `project-${uuidv4().slice(0, 8)}`
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)
    workDir = `${os.tmpdir()}/${slug}-${projectId.slice(8, 16)}`
    try {
      dockerComposePath = setupProjectDocker(workDir, name)
    } catch (e) {
      console.error('[docker-setup]', e)
    }
    db.prepare(`
      INSERT INTO projects (id, name, description, mission_id, work_dir, docker_compose_path, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(projectId, name, `สร้างโดยเลขา — ${tasks.length} tasks`, parentMissionId, workDir, dockerComposePath)
  } else if (existingProject) {
    workDir = existingProject.work_dir || ''
    dockerComposePath = existingProject.docker_compose_path || null
  }

  for (const task of tasks) {
    const agent = matchAgent(agents, task.agent_name)
    if (!agent) {
      console.warn(`[secretary] ⚠️ No agent matched for "${task.agent_name}" (task: "${task.title}") — skipping. Available: ${agents.map((a: any) => a.name).join(', ')}`)
      continue
    }

    const isIntegration = task.title?.startsWith('[INTEGRATION]')
    const subId = `mission-${uuidv4().slice(0, 8)}`

    // Inject work_dir context into every task description
    const workDirCtx = workDir
      ? `\n\n---\n## 📁 Work Directory (บันทึกไฟล์ทั้งหมดที่นี่)\n\`${workDir}\`\n\nDocker Compose: \`${dockerComposePath || workDir + '/docker-compose.yml'}\`\n---\n`
      : ''

    // For [INTEGRATION] tasks: always append ACCESS-INFO requirement so any agent outputs it
    // Gather used ports: from DB + actual system ports via lsof
    let usedPortsInfo = ''
    let suggestedWebPort = 3001
    let suggestedAdminerPort = 8978
    if (isIntegration) {
      try {
        // 1. Ports from existing projects in DB
        const existingPorts = db.prepare(`SELECT web_port, adminer_port FROM projects WHERE web_port IS NOT NULL OR adminer_port IS NOT NULL`).all() as { web_port: number | null; adminer_port: number | null }[]
        const dbWebPorts = existingPorts.map(p => p.web_port).filter(Boolean) as number[]
        const dbAdminPorts = existingPorts.map(p => p.adminer_port).filter(Boolean) as number[]

        // 2. Actual listening ports on the system (lsof)
        const { execSync } = require('child_process')
        let listeningPorts: number[] = []
        try {
          const lsofOut = execSync("lsof -iTCP -sTCP:LISTEN -nP 2>/dev/null | awk '{print $9}' | grep ':' | sed 's/.*://' | sort -un", { encoding: 'utf-8', timeout: 5000 })
          listeningPorts = lsofOut.trim().split('\n').map(Number).filter((p: number) => p >= 1024 && p <= 65535)
        } catch {}

        // Combine all occupied ports
        const allUsedPorts = new Set([3000, ...dbWebPorts, ...dbAdminPorts, ...listeningPorts])

        // Find next available web port (3001+)
        suggestedWebPort = 3001
        while (allUsedPorts.has(suggestedWebPort)) suggestedWebPort++

        // Find next available cloudbeaver port (8978+)
        suggestedAdminerPort = 8978
        while (allUsedPorts.has(suggestedAdminerPort)) suggestedAdminerPort++

        // Find next available DB port (5432+)
        let suggestedDbPort = 5432
        while (allUsedPorts.has(suggestedDbPort)) suggestedDbPort++

        usedPortsInfo = `\n\n⚠️ Port ที่ถูกใช้งานแล้วบนเครื่อง (ห้ามซ้ำ): [${Array.from(allUsedPorts).sort((a: number, b: number) => a - b).filter((p: number) => p >= 3000 && p <= 9000).join(', ')}]`
        usedPortsInfo += `\n✅ Port ว่างแนะนำ: web=${suggestedWebPort}, adminer=${suggestedAdminerPort}, db=${suggestedDbPort}`
      } catch {}
    }

    const integrationRequirement = isIntegration
      ? `\n\n---\n## 🔌 กฎเหล็ก Integration (ทำครบทุกข้อก่อน report เสร็จ)\n\n### 1. Docker Services (บังคับ 3 services)\n- **web** — frontend หรือ fullstack app (build จาก Dockerfile, expose port ออกสู่ host)\n- **cloudbeaver** — DB admin UI (image: \`dbeaver/cloudbeaver:latest\`, port 8978 หรือว่าง)\n- **postgres** — database (image: \`postgres:16-alpine\`, พร้อม POSTGRES_USER/PASSWORD/DB)\n\n### 2. ⚠️ กฎ Dockerfile NEXT_PUBLIC_* (สำคัญมาก)\nถ้า frontend เป็น Next.js (หรือ framework อื่นที่ bake env ตอน build):\n- **ห้ามใช้ Docker service name** ใน \`NEXT_PUBLIC_API_URL\` หรือ \`NEXT_PUBLIC_API_BASE_URL\`\n- เพราะ service name เช่น \`http://backend:8080\` ใช้ได้เฉพาะ container-to-container เท่านั้น\n- browser บน host ไม่รู้จัก hostname \`backend\` → login/API ทั้งหมดพัง\n- **ต้องใช้ \`http://localhost:<HOST_PORT>\`** เสมอ เช่น:\n\`\`\`dockerfile\nENV NEXT_PUBLIC_API_URL=http://localhost:${suggestedWebPort}\nENV NEXT_PUBLIC_API_BASE_URL=http://localhost:${suggestedWebPort}\n\`\`\`\n- ถ้ามี \`.env.local\` ต้องตรวจสอบว่า \`.dockerignore\` ไม่ได้ exclude มัน หรือ set ENV ใน Dockerfile แทน\n- **ตรวจสอบ**: หลัง build ต้อง grep หา \`backend:\` หรือ service name ใน \`.next/static/chunks/*.js\` — ถ้าเจอ → แก้ Dockerfile แล้ว build ใหม่\n\n### 3. Seed Demo Accounts (บังคับ)\nหลัง \`docker compose up\` สำเร็จ:\n1. รัน seed หรือ insert users ลง DB:\n   - \`docker exec <web_container> npx prisma db seed\` หรือ\n   - \`docker exec <web_container> node seed.js\` หรือ\n   - SQL: \`docker exec <db_container> psql -U <user> -d <db> -c "INSERT INTO users ..."\`\n2. ยืนยัน login จาก **host** (ไม่ใช่จากใน container):\n   \`curl -s -X POST http://localhost:<web_port>/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@demo.com","password":"demo1234"}' | grep -o 'token\\|accessToken\\|error'\`\n3. ต้องได้ token กลับมา — ถ้า error → แก้ก่อน report\n\n### 4. Output บังคับ (ก่อน Release Notes เสมอ)\n\`\`\`\n---ACCESS-INFO---\n{\n  "web_port": <HOST port จาก docker-compose>,\n  "adminer_port": <HOST port ของ cloudbeaver>,\n  "db_user": "<POSTGRES_USER>",\n  "db_password": "<POSTGRES_PASSWORD>",\n  "demo_accounts": [\n    {"role": "Admin", "email": "admin@demo.com", "password": "demo1234"},\n    {"role": "User", "email": "user@demo.com", "password": "demo1234"}\n  ]\n}\n---END---\n\`\`\`\n\n🚫 ห้าม:\n- ใช้ port 3000 (ระบบหลักใช้อยู่)\n- ใช้ service name ใน NEXT_PUBLIC env ที่ bake ตอน build${usedPortsInfo}\n- Report เสร็จโดยยังไม่ได้ทดสอบ login จริง\n- มีฟิลด์ใดใน ---ACCESS-INFO--- เป็น null หรือ missing\n---\n`
      : ''

    const fullDescription = workDirCtx + task.description + integrationRequirement

    // Determine phase from task (Secretary should include "phase" in output)
    let phase = task.phase != null ? task.phase : -1
    if (phase < 0) {
      // Auto-detect phase from agent role if Secretary didn't specify
      const agentName = (task.agent_name || '').toLowerCase()
      const titleLower = (task.title || '').toLowerCase()
      if (isIntegration || titleLower.includes('[integration]')) {
        phase = 4
      } else if (/qa|test|ทดสอบ|quality/.test(agentName)) {
        phase = 3
      } else if (/develop|dev|front|back|senior|devops|engineer|นักพัฒนา/.test(agentName)) {
        phase = 2
      } else if (/kickoff|framing|scope|goal|feasibility/.test(titleLower)) {
        phase = 0
      } else {
        phase = 1 // BA detailed, UX wireframe, Tech Lead architecture
      }
    }

    // Phase 0: fire immediately, Phase 1+: wait for previous phase to complete
    const initialStatus = phase === 0 ? 'pending' : (isIntegration ? 'waiting' : 'waiting_phase')

    db.prepare(`
      INSERT INTO missions (id, title, description, agent_id, priority, status, parent_mission_id, phase)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(subId, task.title, fullDescription, agent.id, task.priority || priority, initialStatus, parentMissionId, phase)

    // Only fire Phase 0 tasks immediately
    if (phase === 0) {
      fetch(`${BASE_URL}/api/missions/${subId}/execute`, { method: 'POST' }).catch((e) => console.error('[tasks] spawn failed for sub-mission', subId, e.message))
    }
  }

  // Edge case: if no phase 0 tasks exist, fire the lowest phase directly
  const allPhases = tasks.map((t: any) => t.phase ?? 0)
  const hasPhase0 = allPhases.some((p: number) => p === 0)
  if (!hasPhase0) {
    const minPhase = Math.min(...allPhases)
    // No race condition: all DB inserts above are synchronous (better-sqlite3).
    // The missions are already in DB by the time we query here.
    // Use setImmediate to yield event loop once, then fire — safe with sync SQLite.
    setImmediate(() => {
      try {
        const lowestMissions = db.prepare(
          `SELECT id, title FROM missions WHERE parent_mission_id = ? AND phase = ? AND status IN ('waiting', 'waiting_phase')`
        ).all(parentMissionId, minPhase) as { id: string; title: string }[]

        if (lowestMissions.length === 0) {
          console.warn(`[secretary] ⚠️ No Phase ${minPhase} missions found to fire — may already be running`)
          return
        }
        for (const m of lowestMissions) {
          db.prepare(`UPDATE missions SET status = 'pending' WHERE id = ?`).run(m.id)
          fetch(`${BASE_URL}/api/missions/${m.id}/execute`, { method: 'POST' })
            .catch(e => console.error('[tasks] spawn failed for min-phase mission', m.id, e.message))
          console.log(`[secretary] 🚀 fired Phase ${minPhase} directly: ${m.id} (${m.title})`)
        }
      } catch (e) { console.error('[secretary] min-phase fire error:', e) }
    })
  }

  console.log(`[secretary] spawned ${tasks.length} tasks — Phases: ${Array.from(new Set(allPhases)).sort().join(',')}${hasPhase0 ? ' — Phase 0 fired immediately' : ` — No Phase 0, will fire Phase ${Math.min(...allPhases)} directly`}`)
}

// ── N2N: Agent-to-Agent direct delegation ────────────────────────────────────
// Agents can output ---SEND_TO--- blocks to directly delegate tasks/messages
// to other agents. Tasks are auto-executed; messages are stored only.
//
// Format:
//   ---SEND_TO---
//   {
//     "to": "agent_name_or_role",
//     "type": "task" | "message",
//     "title": "optional title for task",
//     "message": "content to send",
//     "auto_execute": true  (default true for tasks)
//   }
//   ---END---

function handleSendTo(db: any, sourceMissionId: string, mission: any, output: string) {
  // Process ALL ---SEND_TO--- blocks — not just the first one
  const blockRegex = /---SEND_TO---\s*([\s\S]*?)---END---/g
  let blockMatch: RegExpExecArray | null
  while ((blockMatch = blockRegex.exec(output)) !== null) {
    _handleSingleSendTo(db, sourceMissionId, mission, output, blockMatch[1])
  }
}

function _handleSingleSendTo(db: any, sourceMissionId: string, mission: any, fullOutput: string, blockContent: string) {
  let payload: any
  try {
    payload = JSON.parse(blockContent.trim())
  } catch {
    console.error('[n2n] Failed to parse SEND_TO block:', blockContent.slice(0, 200))
    return
  }

  const { to, type = 'message', title, message, auto_execute = true, hop_count, dedupe_key, expected_output } = payload
  if (!to || !message) return

  // Use the HIGHER of agent-reported hop_count and DB-stored value.
  // Prevents agents from bypassing the limit by writing "hop_count": 0 in output.
  const dbHopCount: number = (mission as any).hop_count || 0
  const payloadHopCount: number = typeof hop_count === 'number' ? hop_count : 0
  const currentHopCount = Math.max(payloadHopCount, dbHopCount)
  const maxHops = 3
  if (currentHopCount >= maxHops) {
    console.warn(`[n2n] ⚠️ hop_count ${currentHopCount} >= max ${maxHops} — blocking auto-execute, escalating`)
    const msgId = `msg-${uuidv4().slice(0, 8)}`
    db.prepare(`INSERT INTO messages (id, from_agent, mission_id, type, content, metadata_json) VALUES (?, ?, ?, 'alert', ?, ?)`)
      .run(msgId, mission.agent_id, sourceMissionId, `⚠️ N2N hop limit reached (${currentHopCount}/${maxHops}). Auto-execute blocked for: ${message.slice(0, 200)}`, JSON.stringify({ n2n: true, hop_limit_reached: true }))
    return
  }

  // Dedupe check: don't create duplicate tasks with same dedupe_key
  if (dedupe_key) {
    const existing = db.prepare('SELECT id FROM missions WHERE dedupe_key = ? AND parent_mission_id = ?')
      .get(dedupe_key, (mission as any).parent_mission_id || sourceMissionId)
    if (existing) {
      console.log(`[n2n] 🔗 dedupe hit for "${dedupe_key}" — linking to existing mission ${(existing as any).id}`)
      const msgId = `msg-${uuidv4().slice(0, 8)}`
      db.prepare(`INSERT INTO messages (id, from_agent, mission_id, type, content, metadata_json) VALUES (?, ?, ?, 'message', ?, ?)`)
        .run(msgId, mission.agent_id, sourceMissionId, `Linked to existing task: ${dedupe_key}`, JSON.stringify({ n2n: true, dedupe_linked: (existing as any).id }))
      return
    }
  }

  const agents = db.prepare('SELECT * FROM agents ORDER BY team, name').all() as any[]
  const targetAgent = matchAgent(agents, to)
  if (!targetAgent) {
    console.error('[n2n] Could not find agent:', to)
    return
  }

  let spawnedMissionId: string | null = null

  // For task type: create a new mission for the target agent
  if (type === 'task' && auto_execute !== false) {
    spawnedMissionId = `mission-${uuidv4().slice(0, 8)}`
    const parentId = (mission as any).parent_mission_id || sourceMissionId
    const taskTitle = title || `[N2N] Task from ${mission.agent_name}`

    const contextSummary = fullOutput.replace(/---SEND_TO---[\s\S]*?---END---/g, '').trim().slice(0, 3000)

    const taskDesc = [
      `## 📨 งานจาก ${mission.agent_name}`,
      ``, message, ``,
      expected_output ? `## Expected Output\n${Array.isArray(expected_output) ? expected_output.map((e: string) => `- ${e}`).join('\n') : expected_output}` : '',
      `---`,
      `## 📋 Context จาก ${mission.agent_name}`,
      ``, contextSummary,
      contextSummary.length >= 3000 ? `\n_(ดู mission ${sourceMissionId} เพื่อ output เต็ม)_` : '',
    ].filter(Boolean).join('\n')

    db.prepare(`
      INSERT INTO missions (id, title, description, agent_id, priority, status, parent_mission_id, trace_id, hop_count, dedupe_key, owner, phase)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NULL)
    `).run(
      spawnedMissionId, taskTitle, taskDesc, targetAgent.id,
      (mission as any).priority || 'normal', parentId,
      (mission as any).trace_id || null, currentHopCount + 1,
      dedupe_key || null, targetAgent.name
      // phase = NULL explicitly — N2N missions are phaseless and must not corrupt
      // advanceProjectPhase() gate checks. NULL overrides column DEFAULT 0.
    )

    fetch(`${BASE_URL}/api/missions/${spawnedMissionId}/execute`, { method: 'POST' }).catch((e) => console.error('[n2n] spawn failed for mission', spawnedMissionId, e.message))
    console.log(`[n2n] 🔀 ${mission.agent_name} → ${targetAgent.name} | hop ${currentHopCount + 1} | mission ${spawnedMissionId}`)
  }

  const msgId = `msg-${uuidv4().slice(0, 8)}`
  const metadata = JSON.stringify({
    spawned_mission_id: spawnedMissionId,
    source_mission_id: sourceMissionId,
    n2n: true, hop_count: currentHopCount + 1,
    dedupe_key: dedupe_key || null,
  })
  db.prepare(`INSERT INTO messages (id, from_agent, to_agent, mission_id, type, content, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(msgId, mission.agent_id, targetAgent.id, sourceMissionId, type, message, metadata)
}

// ── Handle ---RESULT--- block: agent reports structured completion ─────────
function handleResultBlock(db: any, missionId: string, mission: any, output: string) {
  const match = output.match(/---RESULT---\s*([\s\S]*?)---END---/)
  if (!match) return
  try {
    const result = JSON.parse(match[1].trim())
    // Update mission with structured data
    if (result.deliverables) {
      db.prepare('UPDATE missions SET deliverables_json = ? WHERE id = ?').run(JSON.stringify(result.deliverables), missionId)
    }
    if (result.status) {
      db.prepare('UPDATE missions SET status = ? WHERE id = ?').run(result.status, missionId)
    }
    if (result.quality_checks) {
      db.prepare('UPDATE missions SET gate_evidence_json = ? WHERE id = ?').run(JSON.stringify(result.quality_checks), missionId)
    }
    console.log(`[result] 📊 ${mission.agent_name} reported: ${result.summary?.slice(0, 100)}`)
  } catch (e) { console.error('[result] Failed to parse RESULT block:', e) }
}

// ── Handle ---PHASE_GATE--- block: phase completion gate check ────────────
function handlePhaseGateBlock(db: any, missionId: string, mission: any, output: string) {
  const match = output.match(/---PHASE_GATE---\s*([\s\S]*?)---END---/)
  if (!match) return
  try {
    const gate = JSON.parse(match[1].trim())
    db.prepare('UPDATE missions SET gate_status = ?, gate_evidence_json = ? WHERE id = ?')
      .run(gate.gate_status, JSON.stringify(gate), missionId)
    console.log(`[phase-gate] 🚪 Phase ${gate.phase_id} gate: ${gate.gate_status} — ${gate.reason}`)
  } catch (e) { console.error('[phase-gate] Failed to parse PHASE_GATE block:', e) }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

function getClaudeCLI(db: any): string {
  try {
    const row = db.prepare('SELECT claude_cli_path FROM system_config WHERE id = ?').get('default') as any
    if (row?.claude_cli_path) return row.claude_cli_path
  } catch {}
  return process.env.CLAUDE_CLI_PATH || 'claude'
}

function getJiraConfig(db: any): { baseUrl: string; email: string; token: string } | null {
  try {
    const row = db.prepare('SELECT jira_base_url, jira_email, jira_api_token FROM system_config WHERE id = ?').get('default') as any
    if (row?.jira_base_url && row?.jira_email && row?.jira_api_token) {
      return { baseUrl: row.jira_base_url.replace(/\/$/, ''), email: row.jira_email, token: row.jira_api_token }
    }
  } catch {}
  return null
}

async function executeJiraAction(jira: { baseUrl: string; email: string; token: string }, payload: any) {
  const auth = Buffer.from(`${jira.email}:${jira.token}`).toString('base64')
  const headers = { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' }
  const base = jira.baseUrl

  switch (payload.action) {
    case 'create_issue': {
      const body = {
        fields: {
          project: { key: payload.project_key },
          summary: payload.summary,
          description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: payload.description || '' }] }] },
          issuetype: { name: payload.issue_type || 'Task' },
          ...(payload.priority ? { priority: { name: payload.priority } } : {}),
          ...(payload.assignee ? { assignee: { accountId: payload.assignee } } : {}),
        },
      }
      const res = await fetch(`${base}/rest/api/3/issue`, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) })
      if (res.ok) {
        const data = await res.json()
        console.log(`[jira] ✅ Created issue: ${data.key} — ${(payload.summary || '').slice(0, 60)}`)
      } else {
        const err = await res.text()
        console.error(`[jira] ❌ create_issue failed: ${res.status} — ${err.slice(0, 200)}`)
      }
      break
    }
    case 'transition': {
      const transRes = await fetch(`${base}/rest/api/3/issue/${payload.issue_key}/transitions`, { headers, signal: AbortSignal.timeout(10000) })
      if (!transRes.ok) { console.error(`[jira] ❌ get transitions failed: ${transRes.status}`); break }
      const transData = await transRes.json()
      const transition = (transData.transitions || []).find((t: any) =>
        payload.transition_id ? t.id === payload.transition_id : t.name.toLowerCase() === (payload.transition_name || '').toLowerCase()
      )
      if (!transition) { console.error(`[jira] ❌ transition "${payload.transition_name || payload.transition_id}" not found`); break }
      const res = await fetch(`${base}/rest/api/3/issue/${payload.issue_key}/transitions`, {
        method: 'POST', headers, body: JSON.stringify({ transition: { id: transition.id } }), signal: AbortSignal.timeout(10000),
      })
      if (res.ok) console.log(`[jira] ✅ Transitioned ${payload.issue_key} → ${transition.name}`)
      else console.error(`[jira] ❌ transition failed: ${res.status}`)
      break
    }
    case 'comment': {
      const commentText = payload.comment || payload.body || ''
      const body = { body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: commentText }] }] } }
      const res = await fetch(`${base}/rest/api/3/issue/${payload.issue_key}/comment`, {
        method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
      })
      if (res.ok) console.log(`[jira] ✅ Commented on ${payload.issue_key}`)
      else console.error(`[jira] ❌ comment failed: ${res.status}`)
      break
    }
    default:
      console.error(`[jira] ❌ Unknown action: ${payload.action}`)
  }
}

async function handleJiraBlock(db: any, output: string) {
  if (!output.includes('---JIRA---')) return
  const jira = getJiraConfig(db)
  if (!jira) { console.warn('[jira] ⚠️ JIRA block found but no Jira credentials configured'); return }
  const blockRegex = /---JIRA---\s*([\s\S]*?)---END---/g
  let match: RegExpExecArray | null
  while ((match = blockRegex.exec(output)) !== null) {
    try {
      const payload = JSON.parse(match[1].trim())
      await executeJiraAction(jira, payload)
    } catch (e) {
      console.error('[jira] Failed to parse JIRA block:', e)
    }
  }
}

function getOllamaBaseUrl(db: any): string {
  try {
    const row = db.prepare('SELECT ollama_base_url FROM system_config WHERE id = ?').get('default') as any
    if (row?.ollama_base_url) return row.ollama_base_url.replace(/\/$/, '')
  } catch {}
  return 'http://localhost:11434'
}
const MISSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const WATCHDOG_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes — don't scan on every request

// Module-level throttle timestamp (survives across requests in same Node.js process)
let _lastWatchdogRun = 0

// ── Watchdog: reset missions stuck in 'running' for too long ─────────────────
function resetStaleMissions(db: any) {
  try {
    // 1. Kill running missions that have been stuck > 30 min
    const stale = db.prepare(`
      UPDATE missions SET status = 'failed', error = 'Mission timed out (process lost after restart)'
      WHERE status = 'running'
        AND datetime(created_at) < datetime('now', '-30 minutes')
    `).run()
    if (stale.changes > 0) {
      console.log(`[watchdog] ♻️ Reset ${stale.changes} stale mission(s)`)
      db.prepare(`UPDATE agents SET status = 'idle' WHERE status = 'working'`).run()
    }
  } catch (e) { console.error('[watchdog] stale reset error:', e) }

  try {
    // 2b. Rescue sub-missions stuck in 'pending' > 30 min (execute fetch failed on spawn)
    // Only targets child missions — top-level pending missions may be waiting for manual trigger
    const stalePending = db.prepare(`
      UPDATE missions SET status = 'failed', error = 'Mission stuck in pending (execute never fired)'
      WHERE status = 'pending'
        AND parent_mission_id IS NOT NULL
        AND datetime(created_at) < datetime('now', '-30 minutes')
    `).run()
    if (stalePending.changes > 0) {
      console.log(`[watchdog] 🗑️ Reset ${stalePending.changes} stuck-pending sub-mission(s)`)
    }
  } catch (e) { console.error('[watchdog] pending reset error:', e) }

  try {
    // 2. Phase watchdog: find waiting_phase missions whose entire previous phase is done
    //    These are missions that were supposed to be triggered but the fire-and-forget failed
    const orphaned = db.prepare(`
      SELECT m.id, m.title, m.phase, m.parent_mission_id
      FROM missions m
      WHERE m.status IN ('waiting_phase', 'waiting')
        AND m.parent_mission_id IS NOT NULL
        AND m.phase > 0
        AND NOT EXISTS (
          -- any sibling in the PREVIOUS phase that is NOT done/failed
          SELECT 1 FROM missions prev
          WHERE prev.parent_mission_id = m.parent_mission_id
            AND prev.phase = m.phase - 1
            AND prev.status NOT IN ('done', 'failed')
        )
        AND EXISTS (
          -- there IS at least one sibling in the previous phase (phase actually ran)
          SELECT 1 FROM missions prev
          WHERE prev.parent_mission_id = m.parent_mission_id
            AND prev.phase = m.phase - 1
        )
    `).all() as { id: string; title: string; phase: number; parent_mission_id: string }[]

    for (const m of orphaned) {
      console.log(`[watchdog] 🔄 Phase orphan detected: ${m.id} "${m.title.slice(0, 50)}" (phase ${m.phase}) — re-triggering`)
      db.prepare(`UPDATE missions SET status = 'pending' WHERE id = ?`).run(m.id)
      const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      fetch(`${BASE_URL}/api/missions/${m.id}/execute`, { method: 'POST' })
        .catch((e) => console.error(`[watchdog] re-trigger failed for ${m.id}:`, e.message))
    }
    if (orphaned.length > 0) {
      console.log(`[watchdog] 🔄 Re-triggered ${orphaned.length} orphaned phase mission(s)`)
    }
  } catch (e) { console.error('[watchdog] phase orphan check error:', e) }
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const db = getDb()

  // Watchdog: throttled — runs at most once every 5 minutes, not on every request
  const now = Date.now()
  if (now - _lastWatchdogRun >= WATCHDOG_INTERVAL_MS) {
    _lastWatchdogRun = now
    resetStaleMissions(db)
  }

  const mission = db.prepare(`
    SELECT m.*, a.name as agent_name, a.role as agent_role, a.sprite as agent_sprite,
           a.model as agent_model, a.system_prompt as agent_system_prompt,
           a.personality as agent_personality,
           (
             SELECT p.work_dir FROM projects p
             WHERE p.mission_id = m.parent_mission_id
               AND p.work_dir IS NOT NULL AND p.work_dir != ''
             LIMIT 1
           ) as project_work_dir
    FROM missions m JOIN agents a ON m.agent_id = a.id WHERE m.id = ?
  `).get(params.id) as Record<string, string> | undefined

  if (!mission) {
    return new Response('Mission not found', { status: 404 })
  }

  if (mission.status === 'running') {
    return new Response('Mission already running', { status: 400 })
  }

  db.prepare("UPDATE missions SET status = 'running', started_at = CURRENT_TIMESTAMP WHERE id = ?").run(params.id)
  db.prepare("UPDATE agents SET status = 'working' WHERE id = ?").run(mission.agent_id)

  const memories = db.prepare(`
    SELECT content FROM memory WHERE agent_id = ? ORDER BY importance DESC, created_at DESC LIMIT 5
  `).all(mission.agent_id) as { content: string }[]

  const memoryContext = memories.length > 0
    ? `\n\n## ความทรงจำล่าสุดของคุณ:\n${memories.map((m, i) => `${i + 1}. ${m.content}`).join('\n')}`
    : ''

  const fs = require('fs')
  const workDir: string | null = mission.project_work_dir && fs.existsSync(mission.project_work_dir)
    ? mission.project_work_dir
    : null

  const workDirContext = workDir
    ? `\n\n## 📁 Project Working Directory\nคุณกำลังทำงานอยู่ใน: \`${workDir}\`\nไฟล์ทั้งหมดในโปรเจคนี้อยู่ที่ path นี้ — ใช้ tools อ่าน/เขียนไฟล์ที่ path นี้ได้เลย`
    : ''

  const systemPrompt = `${mission.agent_system_prompt}${memoryContext}${workDirContext}

## บุคลิก: ${mission.agent_personality}
## วันที่ปัจจุบัน: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}

คุณกำลังทำงานในฐานะ AI Agent ในระบบ Multi-Agent Dashboard ตอบให้ครบถ้วนและมีประโยชน์`

  // If this is a secretary agent, inject team roster so she knows who to delegate to
  const isSecretaryAgent = (mission.agent_name as string)?.includes('เลขา') ||
    (mission.agent_name as string)?.toLowerCase().includes('secretary')
  let userPrompt = `## ภารกิจ: ${mission.title}\n\n${mission.description}`
  if (isSecretaryAgent && !mission.description?.includes('---TASKS---') && !mission.description?.includes('รายชื่อสมาชิกทีม')) {
    const allAgents = db.prepare('SELECT id, name, role, team FROM agents ORDER BY team, name').all() as any[]
    const groups: Record<string, any[]> = {}
    for (const a of allAgents) {
      if (!groups[a.team]) groups[a.team] = []
      groups[a.team].push(a)
    }
    const roster = Object.entries(groups).map(([team, members]) =>
      `## ทีม ${team}\n` + members.map((a: any) => `- ${a.name} (${a.role})`).join('\n')
    ).join('\n\n')
    userPrompt += `\n\n---\n## รายชื่อสมาชิกทีมที่สามารถรับงานได้\n\n${roster}\n\n---\nวิเคราะห์งานข้างต้น แบ่งงานย่อยให้สมาชิกที่เหมาะสม แล้ว output ---TASKS--- block ตามรูปแบบในคำสั่งของคุณ`
  }

  const encoder = new TextEncoder()
  let fullOutput = ''

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send({ type: 'start', mission_id: params.id, agent: mission.agent_name })

      try {
        const modelArg = mission.agent_model || 'claude-haiku-4-5-20251001'
        const isOllama = modelArg.startsWith('ollama:')

        // ── Ollama execution path ─────────────────────────────────────────────
        if (isOllama) {
          const ollamaModel = modelArg.slice('ollama:'.length)
          const ollamaUrl = getOllamaBaseUrl(db)

          const ollamaRes = await fetch(`${ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: ollamaModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              stream: true,
            }),
          })

          if (!ollamaRes.ok || !ollamaRes.body) {
            const errText = await ollamaRes.text().catch(() => '')
            throw new Error(`Ollama error ${ollamaRes.status}: ${errText.slice(0, 200)}`)
          }

          const reader = ollamaRes.body.getReader()
          const dec = new TextDecoder()
          let buf = ''
          let totalTokens = 0

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += dec.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() || ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed) continue
              try {
                const evt = JSON.parse(trimmed)
                const chunk: string = evt.message?.content || ''
                if (chunk) {
                  fullOutput += chunk
                  send({ type: 'chunk', text: chunk })
                  if (fullOutput.length % 80 < chunk.length) {
                    db.prepare('UPDATE missions SET output = ? WHERE id = ?').run(fullOutput, params.id)
                  }
                }
                if (evt.done && evt.eval_count) totalTokens = evt.eval_count
              } catch {}
            }
          }

          db.prepare('UPDATE missions SET output = ?, status = ?, completed_at = CURRENT_TIMESTAMP, tokens_used = ? WHERE id = ?')
            .run(fullOutput, 'done', totalTokens, params.id)
          db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(mission.agent_id)

          handleResultBlock(db, params.id, mission, fullOutput)
          handlePhaseGateBlock(db, params.id, mission, fullOutput)
          try { handleSendTo(db, params.id, mission, fullOutput) } catch (e) { console.error('[n2n-send-to]', e) }
          await handleJiraBlock(db, fullOutput)
          if (mission.parent_mission_id) {
            advanceProjectPhase(db, mission.parent_mission_id)
            autoLoopProjectFix(db, mission.parent_mission_id)
          }

          autoNotify('done', mission.title as string, fullOutput.slice(0, 500), mission.agent_name as string, mission.agent_id as string)
          if (workDir) gitAutoCommit(workDir, mission.title as string, mission.agent_name as string)
          send({ type: 'done', mission_id: params.id })
          controller.close()
          return
        }

        // ── Claude CLI execution path ─────────────────────────────────────────
        const child = spawn(getClaudeCLI(db), [
          '--print',
          '--verbose',
          '--output-format', 'stream-json',
          '--include-partial-messages',
          '--model', modelArg,
          '--no-session-persistence',
          '--dangerously-skip-permissions',
          '--append-system-prompt', systemPrompt,
        ], {
          env: { ...process.env, HOME: process.env.HOME || '/tmp' },
          cwd: workDir || '/tmp',
        })

        child.stdin.write(userPrompt)
        child.stdin.end()

        let buffer = ''
        let lastTextLength = 0
        let lastSaveLength = 0

        const saveIncremental = () => {
          // Save immediately on first chunk, then every 80 chars
          const isFirst = lastSaveLength === 0
          if (isFirst || fullOutput.length - lastSaveLength >= 80) {
            db.prepare("UPDATE missions SET output = ? WHERE id = ?").run(fullOutput, params.id)
            lastSaveLength = fullOutput.length
          }
        }

        child.stdout.on('data', (chunk: Buffer) => {
          buffer += chunk.toString()
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            try {
              const evt = JSON.parse(trimmed)

              if (evt.type === 'assistant' && evt.message?.content) {
                for (const block of evt.message.content) {
                  if (block.type === 'text') {
                    const newText = (block.text as string).slice(lastTextLength)
                    if (newText) {
                      fullOutput += newText
                      send({ type: 'chunk', text: newText })
                      lastTextLength = (block.text as string).length
                      saveIncremental()
                    }
                  }
                }
              }
            } catch {}
          }
        })

        child.stderr.on('data', (chunk: Buffer) => {
          console.error('[claude-cli]', chunk.toString().trim())
        })

        await new Promise<void>((resolve, reject) => {
          // Kill child if it runs too long (30 min timeout)
          const killTimer = setTimeout(() => {
            console.warn(`[execute] ⏱️ Mission ${params.id} timed out after 30min — killing process`)
            child.kill('SIGTERM')
            setTimeout(() => child.kill('SIGKILL'), 3000)
            reject(new Error('Mission timed out after 30 minutes'))
          }, MISSION_TIMEOUT_MS)

          child.on('close', (code) => {
            clearTimeout(killTimer)
            // ถ้ามี output แล้ว ถือว่าสำเร็จไม่ว่า exit code จะเป็นอะไร
            if (fullOutput.length > 0 || code === 0 || code === null) resolve()
            else reject(new Error(`claude CLI exited with code ${code}`))
          })
          child.on('error', (err) => {
            clearTimeout(killTimer)
            reject(err)
          })
        })

        const estimatedTokens = Math.round(fullOutput.length / 4)

        db.prepare(`
          UPDATE missions SET status = 'done', output = ?, tokens_used = ?, completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(fullOutput, estimatedTokens, params.id)

        db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(mission.agent_id)

        // Auto-commit ไฟล์ที่ agent แก้ไขลง git
        if (workDir) {
          const missionPhase = (mission as any).phase
          // Tag phase milestone commits so they're easy to find for rollback
          const PHASE_TAGS: Record<number, string> = {
            0: 'phase-0-kickoff',
            1: 'phase-1-design',
            2: 'phase-2-dev',
            3: 'phase-3-qa',
            4: 'phase-4-integration',
          }
          const tagLabel = missionPhase !== undefined && missionPhase !== null
            ? PHASE_TAGS[Number(missionPhase)]
            : undefined
          gitAutoCommit(workDir, mission.title as string, mission.agent_name as string, missionPhase, tagLabel)
        }

        // --- Secretary / Audit delegation: any mission with ---TASKS--- block spawns sub-missions ---
        const isSecretary = (mission.agent_name as string)?.includes('เลขา') ||
          (mission.agent_name as string)?.toLowerCase().includes('secretary') ||
          (mission as any).agent_role?.toLowerCase().includes('coordinator')
        // Also allow AUDIT and N2N missions (title starts with [AUDIT] or [N2N]) to spawn sub-missions
        const isDelegator = isSecretary ||
          (mission.title as string)?.startsWith('[AUDIT]') ||
          (mission.title as string)?.startsWith('[N2N FIX]')
        if (isDelegator && fullOutput.includes('---TASKS---')) {
          try {
            spawnSecretarySubMissions(db, params.id, fullOutput, (mission as any).priority || 'normal')
          } catch (e) {
            console.error('[secretary-delegate]', e)
          }
        }

        // --- Secretary fallback: if secretary outputs ---MINI-TASKS--- via execute route
        // (normally handled by IDE frontend, but cover server-side context too)
        if (isSecretary && fullOutput.includes('---MINI-TASKS---') && !fullOutput.includes('---TASKS---')) {
          try {
            const miniMatch = fullOutput.match(/---MINI-TASKS---\s*([\s\S]*?)\s*---END---/)
            if (miniMatch) {
              const miniTasks = JSON.parse(miniMatch[1].trim())
              if (Array.isArray(miniTasks) && miniTasks.length > 0) {
                // Convert to TASKS format (no phases — fire all immediately)
                const fakeTasksBlock = JSON.stringify({ project: null, tasks: miniTasks.map((t: any) => ({ ...t, phase: 0 })) })
                const wrappedOutput = fullOutput + `\n\n---TASKS---\n${fakeTasksBlock}\n---END---`
                spawnSecretarySubMissions(db, params.id, wrappedOutput, (mission as any).priority || 'normal')
                console.log(`[secretary] 🔀 MINI-TASKS fallback → converted ${miniTasks.length} tasks to TASKS format`)
              }
            }
          } catch (e) {
            console.error('[secretary-mini-tasks-fallback]', e)
          }
        }

        // --- N2N: any agent can directly delegate to another agent via ---SEND_TO--- block ---
        if (fullOutput.includes('---SEND_TO---')) {
          try { handleSendTo(db, params.id, mission, fullOutput) } catch (e) { console.error('[n2n-send-to]', e) }
        }

        // --- RESULT block: structured completion report ---
        if (fullOutput.includes('---RESULT---')) {
          try { handleResultBlock(db, params.id, mission, fullOutput) } catch (e) { console.error('[result-block]', e) }
        }

        // --- PHASE_GATE block: phase gate check ---
        if (fullOutput.includes('---PHASE_GATE---')) {
          try { handlePhaseGateBlock(db, params.id, mission, fullOutput) } catch (e) { console.error('[phase-gate-block]', e) }
        }

        // --- JIRA block: create issue / transition / comment via Jira REST API ---
        if (fullOutput.includes('---JIRA---')) {
          try { await handleJiraBlock(db, fullOutput) } catch (e) { console.error('[jira-block]', e) }
        }

        // --- Phase advancement: if this sub-mission just completed, check if next phase should start ---
        const parentId = (mission as any).parent_mission_id
        if (parentId) {
          try {
            // First check if a QA mission is waiting for retest (bug fix just completed)
            // Match the exact title format used in spawnBugFixLoop — avoid false matches
            const isBugFix = mission.title?.startsWith('🔧 Bug Fix Round')
            if (isBugFix) {
              checkRetestQA(db, parentId)
            } else {
              advanceProjectPhase(db, parentId)
            }
          } catch (e) {
            console.error('[phase-advance]', e)
          }
        }

        // --- Smart memory saving ---
        // For [Skill Update] missions: extract ---KEY LEARNINGS--- block, save with high importance
        // For regular missions: save first 200 chars as before
        const isSkillUpdate = mission.title?.includes('[Skill Update]')
        const keyLearnMatch = fullOutput.match(/---KEY LEARNINGS---\s*([\s\S]*?)(?:---END---|$)/)

        let memContent: string
        let memImportance: number

        if (keyLearnMatch && keyLearnMatch[1].trim().length > 0) {
          // Structured KEY LEARNINGS block found — save it fully (up to 2000 chars)
          memContent = `[Skill Update] ${mission.agent_name}:\n${keyLearnMatch[1].trim().slice(0, 2000)}`
          memImportance = 9
        } else if (isSkillUpdate) {
          // Skill update but no structured block — save more of the output
          memContent = `[Skill Update] ${mission.agent_name}:\n${fullOutput.slice(0, 1500)}`
          memImportance = 8
        } else {
          // Regular mission — save short summary as before
          memContent = `ภารกิจ: ${mission.title} - ${fullOutput.slice(0, 200)}...`
          memImportance = 7
        }

        const memId = `mem-${uuidv4().slice(0, 8)}`
        db.prepare(`
          INSERT INTO memory (id, agent_id, mission_id, content, summary, importance)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(memId, mission.agent_id, params.id, memContent, mission.title, memImportance)

        const msgId = `msg-${uuidv4().slice(0, 8)}`
        db.prepare(`
          INSERT INTO messages (id, from_agent, mission_id, type, content)
          VALUES (?, ?, ?, 'result', ?)
        `).run(msgId, mission.agent_id, params.id, `เสร็จสิ้นภารกิจ: ${mission.title}`)

        // Auto-notify with rich content
        const notifyEvent = isSkillUpdate ? 'skill_update' : 'done'
        const outputPreview = fullOutput.replace(/---KEY LEARNINGS---[\s\S]*/, '').trim().slice(0, 3000)
        const notifyMsg = [
          `✅ Mission completed successfully`,
          ``,
          `📊 Tokens: ${estimatedTokens.toLocaleString()} | Output: ${fullOutput.length.toLocaleString()} chars`,
          ``,
          `💬 Output:`,
          outputPreview + (fullOutput.length > 3000 ? '\n\n... (ดูต่อใน Dashboard)' : ''),
        ].join('\n')
        autoNotify(
          notifyEvent as 'done' | 'skill_update',
          mission.title,
          notifyMsg,
          mission.agent_name,
          mission.agent_id,
        )

        // ── Auto-save integration output to project ─────────────────────────────
        // If this is a phase-4 integration mission, parse and save port/credential
        // info automatically so the Projects page shows WEB/DB buttons immediately.
        if (Number(mission.phase) === 4 || String(mission.title).toLowerCase().includes('[integration]')) {
          try {
            const integrationParentId = mission.parent_mission_id  // distinct name — avoids shadow
            if (integrationParentId) {
              const project = db.prepare('SELECT id FROM projects WHERE mission_id = ?').get(integrationParentId) as { id: string } | undefined
              if (project) {
                // Primary: parse structured ---ACCESS-INFO--- block (more reliable than regex)
                let webPort: number | null = null
                let adminerPort: number | null = null
                let dbUser: string | null = null
                let dbPass: string | null = null

                let parsedDemoAccounts: { role: string; email: string; password: string }[] = []
                const accessBlockMatch = fullOutput.match(/---ACCESS-INFO---\s*([\s\S]*?)\s*---END---/)
                if (accessBlockMatch) {
                  try {
                    const info = JSON.parse(accessBlockMatch[1].trim())
                    webPort = info.web_port ? Number(info.web_port) : null
                    adminerPort = info.adminer_port ? Number(info.adminer_port) : null
                    dbUser = info.db_user ?? null
                    dbPass = info.db_password ?? null
                    // Parse demo_accounts from ACCESS-INFO block
                    if (Array.isArray(info.demo_accounts)) {
                      parsedDemoAccounts = info.demo_accounts
                    }
                    console.log(`[integration] 📦 Parsed ---ACCESS-INFO--- block (accounts: ${parsedDemoAccounts.length})`)
                  } catch {}
                }

                // Fallback: regex heuristics (for old outputs without structured block)
                // DB/infra ports that must NOT be matched as web_port
                const NON_WEB_PORTS = new Set([5432, 5433, 3306, 3307, 27017, 27018, 6379, 6380, 587, 465, 25, 2525, 5672, 15672])
                const isWebPort = (p: number) => p >= 1024 && p <= 65535 && !NON_WEB_PORTS.has(p)

                if (!webPort) {
                  // Only match lines that explicitly label the web/app URL — require "App:" "Web:" "Frontend:" prefix
                  // Do NOT match bare "localhost:PORT" to avoid catching DB/adminer ports
                  const lines = fullOutput.split('\n')
                  for (const line of lines) {
                    const m = line.match(/(?:^|\|\s*)(?:App|Web App|Frontend|Web)\s*[|:]\s*(?:http:\/\/localhost:)?(\d{3,5})/i)
                      || line.match(/NEXT_PUBLIC_APP_URL\s*=\s*["']?http:\/\/localhost:(\d{3,5})/i)
                      || line.match(/http:\/\/localhost:(\d{3,5})[^\d].*(?:app|web|front|next|react)/i)
                    if (m) {
                      const candidate = Number(m[1])
                      if (isWebPort(candidate)) { webPort = candidate; break }
                    }
                  }
                }
                if (!adminerPort) {
                  const adminerMatch = fullOutput.match(/(?:CloudBeaver|Adminer|DB Admin|pgAdmin|db-admin)\s*[|:]\s*(?:http:\/\/localhost:)?(\d{3,5})/i)
                    || fullOutput.match(/http:\/\/localhost:(\d{3,5})[^\n]*(?:cloudbeaver|adminer|pgadmin|db.?admin)/i)
                  if (adminerMatch) adminerPort = Number(adminerMatch[1])
                }
                if (!dbUser) {
                  const dbUserMatch = fullOutput.match(/(?:POSTGRES_USER|DB_USER(?:NAME)?|db.?user(?:name)?)\s*[=:]\s*["'`]?(\w+)["'`]?/i)
                  dbUser = dbUserMatch ? dbUserMatch[1] : null
                }
                if (!dbPass) {
                  const dbPassMatch = fullOutput.match(/(?:POSTGRES_PASSWORD|DB_PASS(?:WORD)?|db.?pass(?:word)?)\s*[=:]\s*["'`]?([^\s"'`\n]+)["'`]?/i)
                  dbPass = dbPassMatch ? dbPassMatch[1] : null
                }

                // Ensure columns exist (idempotent migration)
                ensureColumn(db, 'projects', 'integration_output', 'TEXT')
                ensureColumn(db, 'projects', 'demo_accounts_json', 'TEXT')

                // Parse demo accounts: prefer ACCESS-INFO block, fallback to legacy parsers
                const demoAccountsJson = parsedDemoAccounts.length > 0
                  ? JSON.stringify(parsedDemoAccounts)
                  : parseDemoAccountsJson(fullOutput)

                // Cap integration_output to avoid storing MB of text in projects table
                const integrationOutput = fullOutput.slice(0, 20_000)

                db.prepare(`
                  UPDATE projects SET
                    web_port           = COALESCE(?, web_port),
                    adminer_port       = COALESCE(?, adminer_port),
                    db_user            = COALESCE(?, db_user),
                    db_password        = COALESCE(?, db_password),
                    integration_output = ?,
                    demo_accounts_json = COALESCE(?, demo_accounts_json)
                  WHERE id = ?
                `).run(webPort, adminerPort, dbUser, dbPass, integrationOutput, demoAccountsJson, project.id)

                console.log(`[integration] 💾 Saved to project ${project.id}: web=${webPort} adminer=${adminerPort} user=${dbUser}`)

                // Auto-rescan if demo accounts still empty — combine all phase 4 outputs
                if (!demoAccountsJson) {
                  try {
                    const allPhase4 = db.prepare(`
                      SELECT output FROM missions
                      WHERE parent_mission_id = ? AND phase = 4 AND status = 'done'
                      ORDER BY created_at DESC
                    `).all(integrationParentId) as { output: string }[]
                    const combined = allPhase4.map((m: any) => m.output || '').join('\n\n')
                    const rescanned = parseDemoAccountsJson(combined)
                    if (rescanned) {
                      db.prepare('UPDATE projects SET demo_accounts_json = ? WHERE id = ?').run(rescanned, project.id)
                      console.log(`[integration] 🔍 Auto-rescan found demo accounts for project ${project.id}`)
                    }
                  } catch {}
                }

                // If still no demo accounts after all attempts → auto-seed
                const finalProject = db.prepare('SELECT demo_accounts_json, mission_id FROM projects WHERE id = ?').get(project.id) as any
                if (!finalProject?.demo_accounts_json) {
                  autoSeedDemoAccounts(db, integrationParentId)
                }
              }
            }
          } catch (e) { console.error('[integration] Failed to save project info:', e) }
        }

        // ── Auto-merge demo accounts from ANY mission output ─────────────────────
        // If any agent (IDE or SDLC) outputs ---DEMO-ACCOUNTS---, merge into project
        if (fullOutput.includes('---DEMO-ACCOUNTS---')) {
          try {
            const parentId = mission.parent_mission_id
            if (parentId) {
              const project = db.prepare('SELECT id, demo_accounts_json FROM projects WHERE mission_id = ?').get(parentId) as { id: string; demo_accounts_json: string | null } | undefined
              if (project) {
                ensureColumn(db, 'projects', 'demo_accounts_json', 'TEXT')
                const newAccounts = parseDemoAccounts(fullOutput)
                if (newAccounts.length > 0) {
                  // Merge with existing — dedup by email, new entries win
                  const existing: { role: string; email: string; password: string }[] = project.demo_accounts_json
                    ? JSON.parse(project.demo_accounts_json) : []
                  const emailMap = new Map(existing.map(a => [a.email, a]))
                  for (const a of newAccounts) {
                    const prev = emailMap.get(a.email)
                    // New entry wins only if it adds real data (non-placeholder password)
                    // or there is no previous entry at all
                    if (!prev || a.password !== '—' || prev.password === '—') {
                      emailMap.set(a.email, a)
                    }
                  }
                  const merged = Array.from(emailMap.values())
                  db.prepare('UPDATE projects SET demo_accounts_json = ? WHERE id = ?')
                    .run(JSON.stringify(merged), project.id)
                  console.log(`[accounts] 💾 Merged ${newAccounts.length} accounts into project ${project.id}`)
                }
              }
            }
          } catch (e) { console.error('[accounts] Failed to merge demo accounts:', e) }
        }

        send({
          type: 'done',
          mission_id: params.id,
          tokens_used: estimatedTokens,
          output_length: fullOutput.length,
        })

        controller.close()
      } catch (error) {
        const errMsg = String(error)

        if (fullOutput.length > 0) {
          // Agent produced output — streaming error only, treat as success
          const estimatedTokens = Math.round(fullOutput.length / 4)
          db.prepare(`
            UPDATE missions SET status = 'done', output = ?, tokens_used = ?, completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(fullOutput, estimatedTokens, params.id)
          db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(mission.agent_id)

          const memId = `mem-${uuidv4().slice(0, 8)}`
          const isSkillUpdateErr = mission.title?.includes('[Skill Update]')
          const keyLearnMatchErr = fullOutput.match(/---KEY LEARNINGS---\s*([\s\S]*?)(?:---END---|$)/)
          let memContentErr: string
          let memImportanceErr: number
          if (keyLearnMatchErr && keyLearnMatchErr[1].trim().length > 0) {
            memContentErr = `[Skill Update] ${mission.agent_name}:\n${keyLearnMatchErr[1].trim().slice(0, 2000)}`
            memImportanceErr = 9
          } else if (isSkillUpdateErr) {
            memContentErr = `[Skill Update] ${mission.agent_name}:\n${fullOutput.slice(0, 1500)}`
            memImportanceErr = 8
          } else {
            memContentErr = `ภารกิจ: ${mission.title} - ${fullOutput.slice(0, 200)}...`
            memImportanceErr = 7
          }
          db.prepare(`
            INSERT INTO memory (id, agent_id, mission_id, content, summary, importance)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(memId, mission.agent_id, params.id, memContentErr, mission.title, memImportanceErr)

          const msgId = `msg-${uuidv4().slice(0, 8)}`
          db.prepare(`
            INSERT INTO messages (id, from_agent, mission_id, type, content)
            VALUES (?, ?, ?, 'result', ?)
          `).run(msgId, mission.agent_id, params.id, `เสร็จสิ้นภารกิจ: ${mission.title}`)
        } else {
          // No output — real failure, escalate
          db.prepare("UPDATE missions SET status = 'failed', error = ? WHERE id = ?").run(errMsg, params.id)
          db.prepare("UPDATE agents SET status = 'idle' WHERE id = ?").run(mission.agent_id)

          // Auto-notify failure
          const failNotifyMsg = [
            `❌ Mission failed!`,
            ``,
            `⚠️ Error:`,
            errMsg.slice(0, 500),
            ``,
            `💡 กด RETRY ใน dashboard เพื่อลองใหม่`,
          ].join('\n')
          autoNotify('failed', mission.title, failNotifyMsg, mission.agent_name, mission.agent_id)

          const escalationLevel = (mission as any).escalation_level || 0
          if (escalationLevel < 2) {
            fetch(`${BASE_URL}/api/escalate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ missionId: params.id }),
            }).catch((e) => console.error('[execute] escalate call failed for mission', params.id, e.message))
          }

          // Still advance phase even if this mission failed — other missions in next phase
          // should not be permanently blocked by one failed mission
          const failedParentId = (mission as any).parent_mission_id
          if (failedParentId) {
            try { advanceProjectPhase(db, failedParentId) } catch {}
          }
        }

        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`)) } catch {}
        try { controller.close() } catch {}
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
