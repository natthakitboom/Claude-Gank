import { spawn, execSync } from 'child_process'
import { getDb } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { autoNotify } from '@/lib/notify'
import { matchAgent } from '@/lib/agents'
import { parseDemoAccounts, parseDemoAccountsJson } from '@/lib/parseAccounts'

// ── Git helpers ───────────────────────────────────────────────────────────────

function gitInitProject(workDir: string, projectName: string) {
  const fs = require('fs')
  const path = require('path')
  try {
    // Init repo ถ้ายังไม่มี
    if (!fs.existsSync(path.join(workDir, '.git'))) {
      execSync('git init', { cwd: workDir, stdio: 'pipe' })
      execSync('git config user.email "agent@claudegank.local"', { cwd: workDir, stdio: 'pipe' })
      execSync('git config user.name "Claude Gank"', { cwd: workDir, stdio: 'pipe' })
    }
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
  try {
    if (!workDir || !fs.existsSync(path.join(workDir, '.git'))) return

    // Ensure git user config always set (in case project was moved or config missing)
    try {
      execSync('git config user.email "agent@claudegank.local"', { cwd: workDir, stdio: 'pipe' })
      execSync('git config user.name "Claude Gank"', { cwd: workDir, stdio: 'pipe' })
    } catch {}

    execSync('git add -A', { cwd: workDir, stdio: 'pipe' })

    // Check if there's actually anything to commit
    const status = execSync('git status --porcelain', { cwd: workDir }).toString().trim()
    if (!status) return // nothing changed

    // Count changed files for commit message stats
    const fileCount = status.split('\n').filter(Boolean).length
    const phasePrefix = phase !== undefined ? `[Phase ${phase}] ` : ''
    const msg = `${phasePrefix}[${agentName}] ${missionTitle.slice(0, 60)} (${fileCount} files)`

    execSync(`git commit -m ${JSON.stringify(msg)}`, { cwd: workDir, stdio: 'pipe' })
    console.log(`[git] 💾 Auto-commit: ${msg}`)

    // Tag milestone commits (Phase complete)
    if (tagLabel) {
      try {
        // Use timestamp suffix to avoid duplicate tag names
        const ts = Date.now().toString(36)
        execSync(`git tag ${JSON.stringify(`${tagLabel}-${ts}`)}`, { cwd: workDir, stdio: 'pipe' })
        console.log(`[git] 🏷️ Tagged: ${tagLabel}-${ts}`)
      } catch {}
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
  adminer:
    image: adminer:latest
    container_name: ${slug}-adminer
    restart: unless-stopped
    depends_on: [db]
    ports:
      - "8080:8080"
    environment:
      ADMINER_DEFAULT_SERVER: db

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

  // Group by phase
  const phases: Record<number, any[]> = {}
  for (const s of siblings) {
    if (!phases[s.phase]) phases[s.phase] = []
    phases[s.phase].push(s)
  }

  const phaseNumbers = Object.keys(phases).map(Number).sort((a, b) => a - b)

  // Safety net: if lowest phase has all waiting_phase (no phase 0 fired), fire it directly
  const lowestPhase = phaseNumbers[0]
  if (lowestPhase !== undefined && lowestPhase > 0) {
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

        if (hasCriticalBugs && qaRound < 2) {
          // Bug Fix Loop — spawn fix mission, then re-test
          spawnBugFixLoop(db, parentMissionId, latestQA, qaRound + 1)
          return
        }

        if (hasCriticalBugs && qaRound >= 2) {
          // Escalate — max retries exceeded
          escalateQAFailure(db, parentMissionId, latestQA)
          // Still advance to Phase 4 so Tech Lead can attempt final integration
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

  const existingProject = db.prepare('SELECT id, work_dir, docker_compose_path FROM projects WHERE mission_id = ?').get(parentMissionId) as any
  if (!existingProject && isDevProject) {
    const projectId = `project-${uuidv4().slice(0, 8)}`
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)
    workDir = `/private/tmp/${slug}-${projectId.slice(8, 16)}`
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

    const fullDescription = workDirCtx + task.description

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
  const blockMatch = output.match(/---SEND_TO---\s*([\s\S]*?)---END---/)
  if (!blockMatch) return

  let payload: any
  try {
    payload = JSON.parse(blockMatch[1].trim())
  } catch {
    console.error('[n2n] Failed to parse SEND_TO block:', blockMatch[1])
    return
  }

  const { to, type = 'message', title, message, auto_execute = true, hop_count = 0, dedupe_key, expected_output } = payload
  if (!to || !message) return

  // Hop count safety: block auto-execute if too many hops
  const currentHopCount = hop_count || (mission as any).hop_count || 0
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

    const contextSummary = output.replace(/---SEND_TO---[\s\S]*?---END---/g, '').trim().slice(0, 3000)

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
      INSERT INTO missions (id, title, description, agent_id, priority, status, parent_mission_id, trace_id, hop_count, dedupe_key, owner)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
    `).run(
      spawnedMissionId, taskTitle, taskDesc, targetAgent.id,
      (mission as any).priority || 'normal', parentId,
      (mission as any).trace_id || null, currentHopCount + 1,
      dedupe_key || null, targetAgent.name
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

const CLAUDE_CLI = process.env.CLAUDE_CLI_PATH || 'claude'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const MISSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

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

  // Clean up any stale missions from previous server runs
  resetStaleMissions(db)

  const mission = db.prepare(`
    SELECT m.*, a.name as agent_name, a.sprite as agent_sprite, a.model as agent_model,
           a.system_prompt as agent_system_prompt, a.personality as agent_personality,
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

  db.prepare("UPDATE missions SET status = 'running' WHERE id = ?").run(params.id)
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

        const child = spawn(CLAUDE_CLI, [
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

        // --- Secretary delegation: if this is a secretary-type agent and output has ---TASKS--- block ---
        const isSecretary = (mission.agent_name as string)?.includes('เลขา') ||
          (mission.agent_name as string)?.toLowerCase().includes('secretary') ||
          (mission as any).agent_role?.toLowerCase().includes('coordinator')
        if (isSecretary && fullOutput.includes('---TASKS---')) {
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

        // --- Phase advancement: if this sub-mission just completed, check if next phase should start ---
        const parentId = (mission as any).parent_mission_id
        if (parentId) {
          try {
            // First check if a QA mission is waiting for retest (bug fix just completed)
            const isBugFix = mission.title?.includes('Bug Fix')
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
            const parentId = mission.parent_mission_id
            if (parentId) {
              const project = db.prepare('SELECT id FROM projects WHERE mission_id = ?').get(parentId) as { id: string } | undefined
              if (project) {
                // Parse web port: "localhost:NNNN" or "port NNNN" patterns
                const webPortMatch = fullOutput.match(/(?:App|Web|Frontend|localhost)[:\s]+(?:http:\/\/localhost:)?(\d{3,5})/i)
                  || fullOutput.match(/http:\/\/localhost:(\d{3,5})/i)
                // Parse adminer/db-admin port
                const adminerMatch = fullOutput.match(/(?:Adminer|DB Admin|pgAdmin|db-admin)[:\s]+(?:http:\/\/localhost:)?(\d{3,5})/i)
                  || fullOutput.match(/(?:http:\/\/localhost:(\d{3,5}))[^\n]*(?:adminer|admin|pgadmin)/i)
                // Parse DB credentials
                const dbUserMatch = fullOutput.match(/(?:POSTGRES_USER|DB_USER(?:NAME)?|db.?user(?:name)?)\s*[=:]\s*["'`]?(\w+)["'`]?/i)
                const dbPassMatch = fullOutput.match(/(?:POSTGRES_PASSWORD|DB_PASS(?:WORD)?|db.?pass(?:word)?)\s*[=:]\s*["'`]?([^\s"'`\n]+)["'`]?/i)

                const webPort = webPortMatch ? Number(webPortMatch[1]) : null
                const adminerPort = adminerMatch ? Number(adminerMatch[1]) : null
                const dbUser = dbUserMatch ? dbUserMatch[1] : null
                const dbPass = dbPassMatch ? dbPassMatch[1] : null

                // Ensure columns exist (migration-safe)
                try { db.exec('ALTER TABLE projects ADD COLUMN integration_output TEXT') } catch {}
                try { db.exec('ALTER TABLE projects ADD COLUMN demo_accounts_json TEXT') } catch {}

                // Parse demo accounts (structured block → table → inline list)
                const demoAccountsJson = parseDemoAccountsJson(fullOutput)

                db.prepare(`
                  UPDATE projects SET
                    web_port           = COALESCE(?, web_port),
                    adminer_port       = COALESCE(?, adminer_port),
                    db_user            = COALESCE(?, db_user),
                    db_password        = COALESCE(?, db_password),
                    integration_output = ?,
                    demo_accounts_json = COALESCE(?, demo_accounts_json)
                  WHERE id = ?
                `).run(webPort, adminerPort, dbUser, dbPass, fullOutput, demoAccountsJson, project.id)

                console.log(`[integration] 💾 Saved to project ${project.id}: web=${webPort} adminer=${adminerPort} user=${dbUser}`)
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
                try { db.exec('ALTER TABLE projects ADD COLUMN demo_accounts_json TEXT') } catch {}
                const newAccounts = parseDemoAccounts(fullOutput)
                if (newAccounts.length > 0) {
                  // Merge with existing — dedup by email, new entries win
                  const existing: { role: string; email: string; password: string }[] = project.demo_accounts_json
                    ? JSON.parse(project.demo_accounts_json) : []
                  const emailMap = new Map(existing.map(a => [a.email, a]))
                  for (const a of newAccounts) emailMap.set(a.email, a)
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
