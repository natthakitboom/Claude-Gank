import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DATABASE_PATH || './data/agents.db'
const resolvedPath = path.resolve(process.cwd(), DB_PATH)

// Ensure directory exists
const dir = path.dirname(resolvedPath)
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

let db: Database.Database

function getDb(): Database.Database {
  if (!db) {
    db = new Database(resolvedPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initializeSchema(db)
    // Boot-time cleanup: any mission still 'running' = server was killed mid-execution
    try {
      const cleaned = db.prepare(`
        UPDATE missions
        SET status = 'failed',
            error  = 'Server restarted while mission was running'
        WHERE status = 'running'
      `).run()
      if (cleaned.changes > 0) {
        console.log(`[boot] ⚡ Reset ${cleaned.changes} mission(s) stuck in 'running' after server restart`)
      }
    } catch {}
    // Note: interval watchdog is in /api/missions GET handler (setInterval unreliable in Next.js dev)
  }
  return db
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      team TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
      personality TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      effort TEXT NOT NULL DEFAULT 'normal',
      sprite TEXT NOT NULL DEFAULT '🤖',
      status TEXT NOT NULL DEFAULT 'idle',
      color TEXT NOT NULL DEFAULT '#3b82f6',
      skills_json TEXT NOT NULL DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'normal',
      output TEXT,
      error TEXT,
      tokens_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS memory (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      mission_id TEXT,
      content TEXT NOT NULL,
      summary TEXT,
      importance INTEGER DEFAULT 5,
      tags_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      prompt_template TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      icon TEXT DEFAULT '⚡',
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      from_agent TEXT NOT NULL,
      to_agent TEXT,
      mission_id TEXT,
      type TEXT NOT NULL DEFAULT 'message',
      content TEXT NOT NULL,
      metadata_json TEXT DEFAULT '{}',
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_skills (
      agent_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (agent_id, skill_id),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (skill_id) REFERENCES skills(id)
    );
  `)

  // Recurring jobs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      frequency TEXT NOT NULL,
      run_time TEXT,
      day_of_week INTEGER,
      interval_hours INTEGER,
      enabled INTEGER DEFAULT 1,
      last_run_at TEXT,
      next_run_at TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
  `)

  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      mission_id TEXT,
      work_dir TEXT,
      docker_compose_path TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Chat tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mission_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📋',
      category TEXT NOT NULL DEFAULT 'general',
      default_agent_id TEXT,
      title_template TEXT NOT NULL,
      description_template TEXT NOT NULL,
      variables_json TEXT NOT NULL DEFAULT '[]',
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Notification config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_config (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      webhook_url TEXT,
      token TEXT,
      enabled INTEGER DEFAULT 1,
      notify_on_done INTEGER DEFAULT 0,
      notify_on_failed INTEGER DEFAULT 1,
      notify_on_skill_update INTEGER DEFAULT 0,
      agent_filter_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  // Migration: add agent_filter_json if missing
  ensureColumn(db, 'notification_config', 'agent_filter_json', "TEXT DEFAULT '[]'")

  // SDLC config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sdlc_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      config_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Deploy settings table — VPS connection info for one-click deploy
  db.exec(`
    CREATE TABLE IF NOT EXISTS deploy_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      host TEXT NOT NULL DEFAULT '',
      port INTEGER NOT NULL DEFAULT 22,
      username TEXT NOT NULL DEFAULT 'root',
      auth_method TEXT NOT NULL DEFAULT 'sshkey',
      ssh_key_path TEXT NOT NULL DEFAULT '~/.ssh/id_rsa',
      ssh_password TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      deploy_path TEXT NOT NULL DEFAULT '/apps',
      ssl_mode TEXT NOT NULL DEFAULT 'cloudflare',
      cloudflare_proxy INTEGER NOT NULL DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Seed default row if not exists
  db.exec(`INSERT OR IGNORE INTO deploy_config (id) VALUES ('default')`)
  // Migrate: add auth columns if missing (for existing DBs)
  try { db.exec(`ALTER TABLE deploy_config ADD COLUMN auth_method TEXT NOT NULL DEFAULT 'sshkey'`) } catch {}
  try { db.exec(`ALTER TABLE deploy_config ADD COLUMN ssh_password TEXT NOT NULL DEFAULT ''`) } catch {}
  // Seed default SDLC config — always update to latest spec
  db.prepare(`INSERT OR REPLACE INTO sdlc_config (id, config_json, updated_at) VALUES ('default', ?, CURRENT_TIMESTAMP)`).run(JSON.stringify({
    name: 'Quality-First Multi-Agent SDLC',
    description: 'Production-grade SDLC with measurable gates, traceability, severity-based QA, security, progressive release, and continuous learning',
    version: '2.0',
    entry: {
      label: 'User Input',
      description: 'ส่ง project description เข้า /api/orchestra → สร้าง project_id + trace_id',
      icon: '👤',
    },
    secretary: {
      label: 'Secretary (เลขา)',
      description: 'Intake, task decomposition, routing, mission bookkeeping, phase coordination — สร้าง ---TASKS--- block พร้อม acceptance criteria',
      icon: '📋',
    },
    phases: [
      {
        id: 0, name: 'Kickoff & Triage', icon: '🚀',
        description: 'สร้าง shared understanding ของ scope, risk, outcomes และ delivery approach',
        roles: ['Secretary', 'BA', 'UX', 'Tech Lead'],
        gate: 'Scope defined + Non-goals defined + Assumptions explicit + Success metrics identified',
        artifacts: ['project_brief.md', 'scope.md', 'non_goals.md', 'assumptions.md', 'risk_register.md', 'success_metrics.md', 'initial_delivery_plan.md'],
        color: '#ff2d78',
      },
      {
        id: 1, name: 'Analyze & Design', icon: '📐',
        description: 'สร้าง architecture + requirements ที่ buildable, testable, secure — รวม threat model',
        roles: ['BA', 'UX', 'Tech Lead', 'Security Reviewer'],
        gate: 'User stories testable + API/Event contracts drafted + Threat model complete + Test strategy approved + DoD approved',
        artifacts: ['requirements_spec.md', 'user_stories.md', 'ux_flows.md', 'architecture_decision_record.md', 'api_contracts.yaml', 'data_model.md', 'threat_model.md', 'test_strategy.md', 'definition_of_done.md'],
        color: '#a855f7',
      },
      {
        id: 2, name: 'Development', icon: '💻',
        description: 'Implement features พร้อม automated quality checks — N2N enabled, Tech Lead review gate',
        roles: ['Backend', 'Frontend', 'DevOps', 'Tech Lead'],
        gate: 'Lint + Typecheck + Build + Unit/Integration/Contract tests pass + No hardcoded secrets + SAST clean + Preview env healthy + Feature flags ready',
        artifacts: ['source code', 'migrations', 'unit tests', 'integration tests', 'contract tests', 'feature flags', 'preview deployment', 'changelog draft', 'runbook snippets'],
        color: '#2d7fff',
      },
      {
        id: 3, name: 'QA & Validation', icon: '🧪',
        description: 'Severity-based QA — P0/P1 block release, P2 needs waiver, no forced close on bug count',
        roles: ['QA Engineer', 'Backend', 'Frontend', 'Tech Lead', 'Security Reviewer'],
        gate: '0 open P0 + 0 open P1 + Critical-path E2E pass + Regression pass + Perf smoke OK + Security smoke clean + Release recommendation issued',
        artifacts: ['test_execution_report.md', 'bug_list.md', 'regression_report.md', 'critical_path_e2e_report.md', 'perf_smoke_report.md', 'security_smoke_report.md', 'release_recommendation.md'],
        color: '#22c55e',
      },
      {
        id: 4, name: 'Integration & Release Readiness', icon: '🛡️',
        description: 'ตรวจสอบ operational + procedural readiness — rollback plan, dashboards, runbook',
        roles: ['Tech Lead', 'DevOps', 'QA', 'Security Reviewer'],
        gate: 'Staging healthy + Deploy procedure tested + Rollback verified + Dashboards ready + Feature flags configured + Go/No-go recorded',
        artifacts: ['release_plan.md', 'rollback_plan.md', 'deployment_manifest.md', 'dashboards_and_alerts.md', 'runbook.md', 'go_no_go_checklist.md'],
        color: '#06b6d4',
      },
      {
        id: 5, name: 'Progressive Release', icon: '🚢',
        description: 'Release ด้วย canary / phased / blue-green / feature flag — ไม่ full release โดยไม่ verify health',
        roles: ['DevOps', 'QA', 'Tech Lead'],
        gate: 'Error rate stable + Latency within budget + Critical path smoke pass + No sustained alarm + Rollback available within minutes',
        artifacts: ['canary_report.md', 'prod_validation_report.md', 'release_decision_log.md', 'incident_log.md'],
        color: '#f59e0b',
      },
      {
        id: 6, name: 'Learn & Improve', icon: '🧠',
        description: 'เก็บ lessons learned, update guardrails, สร้าง reusable patterns สำหรับโปรเจคถัดไป',
        roles: ['Secretary', 'Tech Lead', 'QA', 'DevOps', 'Chief of Staff'],
        gate: 'Release result recorded + Major decisions stored + Recurring failure patterns tagged + Checklists updated',
        artifacts: ['retrospective.md', 'postmortem.md', 'lessons_learned.md', 'updated_guardrails.md', 'reusable_patterns.md', 'memory_snapshot.json'],
        color: '#64748b',
      },
    ],
    n2n: {
      enabled: true,
      description: 'Agent ส่ง ---SEND_TO--- block ได้ — ต้องมี mission context, expected output, dedupe_key, hop_count',
      maxHops: 3,
      rules: [
        'Every SEND_TO must include expected output',
        'hop_count > 3 → block auto-execute → escalate',
        'Duplicate dedupe_key → link existing mission',
        'Child mission cannot silently widen scope',
        'type="task" updates project state + comms log',
        'type="message" logs only',
      ],
    },
    escalation: {
      enabled: true,
      maxLevel: 2,
      description: 'Team Leader → Chief of Staff → Max (rollback/redesign/descope). Severity-based, not round-based',
      rules: [
        'P0/P1 bugs block release — no override without Chief of Staff waiver',
        'Repeated critical failure on same path → phase rollback',
        'Escalation may cut scope, reopen design, or defer release',
      ],
    },
    qaLoop: {
      enabled: true,
      maxRounds: 0,
      description: 'Severity-based — ไม่จำกัด rounds, P0/P1 block release, P2 need waiver, P3/P4 defer ได้',
      severity: {
        P0: { label: 'Catastrophic', action: 'Release blocked', examples: 'data loss, security breach, system down' },
        P1: { label: 'Critical', action: 'Release blocked', examples: 'critical business flow broken' },
        P2: { label: 'Important', action: 'Requires explicit waiver', examples: 'workaround exists' },
        P3: { label: 'Minor', action: 'Can defer with owner + due date', examples: 'cosmetic, edge case' },
        P4: { label: 'Trivial', action: 'Backlog', examples: 'nice-to-have improvement' },
      },
    },
    security: {
      enabled: true,
      description: 'Security built-in ไม่ใช่ append later — threat model ใน Phase 1, SAST/scan ใน Phase 2, security smoke ใน Phase 3',
      rules: [
        'No secrets in prompts, code, logs, or artifacts',
        'Minimum necessary permissions for every agent/tool',
        'Production deploy, destructive migration, auth changes require explicit approval',
        'Threat model required in Phase 1 for non-trivial features',
        'Critical/high security findings block release unless formally waived',
      ],
    },
    dor: {
      label: 'Definition of Ready',
      description: 'Task ต้องมีครบก่อน execute — ถ้าขาด Secretary ต้อง reject หรือ rewrite',
      checklist: ['Clear owner', 'Goal', 'Inputs', 'Constraints', 'Acceptance criteria', 'Expected deliverables', 'Dependencies', 'Priority', 'Trace identifiers'],
    },
    dod: {
      label: 'Definition of Done',
      description: 'Task done เมื่อ deliverables exist + criteria satisfied + evidence attached + state persisted',
      taskChecklist: ['Deliverables exist', 'Acceptance criteria satisfied', 'Evidence attached', 'State persisted', 'Downstream impact noted', 'Open risks listed', 'Required review completed'],
      phaseChecklist: ['All mandatory artifacts exist', 'Gate status = pass or approved conditional_pass', 'Blockers resolved or explicitly waived', 'Next phase has enough context to start cleanly'],
    },
    memory: {
      enabled: true,
      types: [
        { type: 'execution', description: 'Active mission state, blockers, owner, retry counts', ttl: 'short' },
        { type: 'project', description: 'Approved requirements, architecture decisions, contracts, release decisions', ttl: 'project lifetime' },
        { type: 'organizational', description: 'Recurring patterns, reusable templates, preferred gate policies, anti-patterns', ttl: 'long' },
      ],
      rules: ['Volatile assumptions must expire or be revalidated', 'Phase-approved artifacts must be versioned and immutable', 'Superseded decisions remain visible with status "replaced"'],
    },
    observability: {
      enabled: true,
      description: 'ทุก mission + deployment step ต้อง emit logs, metrics, traces',
      correlationFields: ['trace_id', 'project_id', 'mission_id', 'phase_id', 'owner', 'environment', 'release_version'],
      dashboards: ['Deployment status', 'Error rate', 'Latency', 'Throughput', 'Failed test trends', 'Open bug severity', 'Canary health', 'Rollback status'],
    },
    messageBlocks: [
      { name: '---TASKS---', description: 'Secretary task dispatch with full mission schema', owner: 'Secretary' },
      { name: '---SEND_TO---', description: 'Agent-to-agent handoff with context + dedupe_key + hop_count', owner: 'Any Agent' },
      { name: '---RESULT---', description: 'Agent result report with deliverables + quality checks + risks', owner: 'Any Agent' },
      { name: '---PHASE_GATE---', description: 'Phase gate report: pass/conditional_pass/fail with evidence', owner: 'Phase Owner' },
      { name: '---ESCALATE---', description: 'Escalation with severity + evidence + recommended action', owner: 'Any Agent' },
    ],
    decisionRules: [
      'Favor smaller scope when ambiguous',
      'Favor backward compatibility',
      'Favor feature flags over risky hard release',
      'Favor rollback readiness over deploy speed',
      'Favor explicit artifact over verbal assumption',
      'Favor escalation over hidden uncertainty',
    ],
  }))

  // Seed mission templates
  const templateCount = (db.prepare('SELECT COUNT(*) as count FROM mission_templates').get() as { count: number }).count
  if (templateCount === 0) {
    const insertTemplate = db.prepare(`
      INSERT INTO mission_templates (id, name, icon, category, default_agent_id, title_template, description_template, variables_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const templates = [
      { id: 'tpl-blog', name: 'Write Blog Post', icon: '📝', category: 'creative', agent: 'agent-content',
        title: 'เขียนบทความ: {topic}',
        desc: 'เขียนบทความ blog เรื่อง "{topic}"\n\nกลุ่มเป้าหมาย: {audience}\nความยาว: ประมาณ 800-1200 คำ\nโทน: {tone}\n\nต้องมี:\n- หัวข้อที่น่าสนใจ\n- เนื้อหาที่เข้าใจง่าย\n- สรุปท้ายบทความ',
        vars: '["topic","audience","tone"]' },
      { id: 'tpl-market', name: 'Market Analysis', icon: '📊', category: 'business', agent: 'agent-strategist',
        title: 'วิเคราะห์ตลาด: {market}',
        desc: 'วิเคราะห์ตลาด "{market}" อย่างละเอียด\n\nครอบคลุม:\n1. ภาพรวมตลาด (Market Size, Growth)\n2. คู่แข่งหลัก (Top 5)\n3. SWOT Analysis\n4. เทรนด์ที่กำลังมา\n5. โอกาสและความเสี่ยง\n6. คำแนะนำเชิงกลยุทธ์',
        vars: '["market"]' },
      { id: 'tpl-code-review', name: 'Code Review', icon: '🔍', category: 'tech', agent: 'agent-coder',
        title: 'Code Review: {project}',
        desc: 'Review โค้ดในโปรเจค "{project}"\n\nภาษา/Framework: {stack}\n\nตรวจสอบ:\n1. Code quality & readability\n2. Performance issues\n3. Security vulnerabilities\n4. Best practices\n5. Suggestions for improvement\n\nโค้ดที่ต้อง review:\n{code}',
        vars: '["project","stack","code"]' },
      { id: 'tpl-social', name: 'Social Media Post', icon: '📱', category: 'creative', agent: 'agent-content',
        title: 'สร้าง Social Post: {topic}',
        desc: 'สร้าง social media content สำหรับ "{topic}"\n\nแพลตฟอร์ม: {platform}\nเป้าหมาย: {goal}\n\nต้องการ:\n- Caption ที่น่าสนใจ (พร้อม emoji)\n- Hashtags ที่เกี่ยวข้อง\n- CTA ที่ชัดเจน\n- ไอเดียภาพประกอบ',
        vars: '["topic","platform","goal"]' },
      { id: 'tpl-stock', name: 'Stock Analysis', icon: '📈', category: 'finance', agent: 'agent-stock-analyst',
        title: 'วิเคราะห์หุ้น: {symbol}',
        desc: 'วิเคราะห์หุ้น {symbol} อย่างละเอียด\n\nครอบคลุม:\n1. ข้อมูลพื้นฐาน (P/E, P/BV, Dividend Yield)\n2. ผลประกอบการล่าสุด\n3. Technical Analysis (แนวรับ-แนวต้าน)\n4. ปัจจัยที่มีผลกระทบ\n5. สรุปมุมมอง\n\n⚠️ ข้อมูลนี้เป็นการวิเคราะห์ ไม่ใช่คำแนะนำการลงทุน',
        vars: '["symbol"]' },
      { id: 'tpl-gold', name: 'Gold Analysis', icon: '🥇', category: 'finance', agent: 'agent-gold-trader',
        title: 'วิเคราะห์ทองวันนี้',
        desc: 'วิเคราะห์สถานการณ์ราคาทองคำวันนี้\n\nครอบคลุม:\n1. ราคาทองไทย (บาท) และ XAUUSD\n2. ปัจจัยที่กระทบราคาวันนี้\n3. Technical: แนวรับ-แนวต้าน\n4. ทิศทาง DXY, Bond Yield\n5. สรุปมุมมองระยะสั้น\n\n⚠️ ข้อมูลนี้เป็นการวิเคราะห์ ไม่ใช่คำแนะนำการลงทุน',
        vars: '[]' },
      { id: 'tpl-course', name: 'Design Course Outline', icon: '🎓', category: 'creative', agent: 'agent-course',
        title: 'ออกแบบคอร์ส: {course_name}',
        desc: 'ออกแบบ outline สำหรับคอร์สออนไลน์ "{course_name}"\n\nกลุ่มเป้าหมาย: {target}\nระดับ: {level}\nจำนวนชั่วโมง: {hours}\n\nต้องการ:\n1. Course objectives (3-5 ข้อ)\n2. Module breakdown พร้อม lesson plan\n3. กิจกรรมและ assignment\n4. วิธีวัดผล\n5. เนื้อหาเสริมที่แนะนำ',
        vars: '["course_name","target","level","hours"]' },
      { id: 'tpl-seo', name: 'SEO Content Plan', icon: '🔎', category: 'business', agent: 'agent-marketing',
        title: 'SEO Plan: {keyword}',
        desc: 'สร้างแผน SEO content สำหรับ keyword "{keyword}"\n\nเว็บไซต์: {website}\n\nต้องการ:\n1. Keyword research (main + long-tail)\n2. Content cluster strategy\n3. On-page SEO checklist\n4. เนื้อหาที่ควรเขียน 5 หัวข้อ\n5. Meta title & description ตัวอย่าง',
        vars: '["keyword","website"]' },
    ]
    const insertMany = db.transaction((tpls: typeof templates) => {
      for (const t of tpls) {
        insertTemplate.run(t.id, t.name, t.icon, t.category, t.agent, t.title, t.desc, t.vars)
      }
    })
    insertMany(templates)
  }

  // Upsert new tech project context templates (INSERT OR IGNORE = ไม่ทับของเดิม)
  const upsertTpl = db.prepare(`
    INSERT OR IGNORE INTO mission_templates (id, name, icon, category, default_agent_id, title_template, description_template, variables_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const techTemplates = [
    {
      id: 'tpl-webapp',
      name: 'Web Application',
      icon: '🌐',
      category: 'tech',
      agent: null,
      title: 'สร้าง Web App: {project_name}',
      desc: [
        '📌 ชื่อโปรเจค: {project_name}',
        '📦 ประเภท: Web Application',
        '🛠️ Tech Stack: Next.js 14 + TypeScript + Tailwind CSS + PostgreSQL + Docker',
        '',
        '🎯 เป้าหมาย:',
        '{goal}',
        '',
        '🎨 Design:',
        '- โทนสี / สไตล์: {color_style}  ← เช่น dark modern / light minimal / colorful playful / corporate clean',
        '- เว็บตัวอย่างที่ชอบ: {reference_sites}  ← ระบุ URL หรือชื่อ หรือ "ให้ระบบช่วยคิด"',
        '- Responsive: รองรับ Mobile + Desktop',
        '',
        '👥 ผู้ใช้งาน & Access:',
        '- Roles: {user_roles}  ← เช่น Admin / User / Guest หรือ "ให้ระบบช่วยคิด"',
        '- Login: {login_type}  ← email+password / Google / Facebook / LINE / ไม่มี',
        '- สมัครสมาชิก: {register_type}  ← เปิดสาธารณะ / invite-only / admin สร้างให้',
        '',
        '🌐 ภาษา: {languages}  ← Thai / English / ทั้งสองภาษา',
        '💱 สกุลเงิน: {currency}  ← THB / USD / ไม่มี',
        '',
        '🔗 Integrations:',
        '- Payment: {payment}  ← PromptPay / Credit Card / Omise / Stripe / ไม่มี',
        '- Notification: {notification}  ← Email / LINE Notify / SMS / ไม่มี',
        '- Third-party APIs: {third_party}  ← ระบุ หรือ ไม่มี',
        '',
        '📈 จำนวน User คาดการณ์: {expected_users}  ← <100 / 100-1,000 / 1,000+',
        '🔍 SEO: {seo}  ← ต้องการ / ไม่ต้องการ',
        '🚀 Deploy: {deploy_target}  ← Vercel / VPS / Railway / AWS / ยังไม่แน่ใจ',
        '',
        '✅ Features หลัก:',
        '{features}',
        '',
        '🚫 ไม่รวม (Out of Scope):',
        '{out_of_scope}',
        '',
        '📋 Accept เมื่อ:',
        '{acceptance_criteria}',
      ].join('\n'),
      vars: '["project_name","goal","color_style","reference_sites","user_roles","login_type","register_type","languages","currency","payment","notification","third_party","expected_users","seo","deploy_target","features","out_of_scope","acceptance_criteria"]',
    },
    {
      id: 'tpl-api',
      name: 'REST API / Backend',
      icon: '🔌',
      category: 'tech',
      agent: null,
      title: 'สร้าง API: {project_name}',
      desc: [
        '📌 ชื่อโปรเจค: {project_name}',
        '📦 ประเภท: REST API / Backend Service',
        '🛠️ Tech Stack: Node.js + TypeScript + Express + PostgreSQL + Docker',
        '🔐 Authentication: {auth_method}',
        '',
        '🎯 เป้าหมาย:',
        '{goal}',
        '',
        '📡 Endpoints หลัก:',
        '{endpoints}',
        '',
        '🚫 Out of Scope: {out_of_scope}',
        '',
        '📋 Accept เมื่อ:',
        '{acceptance_criteria}',
      ].join('\n'),
      vars: '["project_name","auth_method","goal","endpoints","out_of_scope","acceptance_criteria"]',
    },
    {
      id: 'tpl-automation',
      name: 'Automation / Bot',
      icon: '🤖',
      category: 'tech',
      agent: null,
      title: 'สร้าง Automation: {project_name}',
      desc: [
        '📌 ชื่อโปรเจค: {project_name}',
        '📦 ประเภท: Automation / Bot / Script',
        '🛠️ Tech Stack: Python 3 + Schedule/Celery + Docker',
        '',
        '🎯 เป้าหมาย:',
        '{goal}',
        '',
        '⚙️ กระบวนการ / Trigger:',
        '{process}',
        '',
        '📤 Output ที่ต้องการ:',
        '{output}',
        '',
        '⏰ ความถี่: {frequency}',
        '🚫 Out of Scope: {out_of_scope}',
        '',
        '📋 Accept เมื่อ:',
        '{acceptance_criteria}',
      ].join('\n'),
      vars: '["project_name","goal","process","output","frequency","out_of_scope","acceptance_criteria"]',
    },
    {
      id: 'tpl-mobile',
      name: 'Mobile App',
      icon: '📱',
      category: 'tech',
      agent: null,
      title: 'สร้าง Mobile App: {project_name}',
      desc: [
        '📌 ชื่อโปรเจค: {project_name}',
        '📦 ประเภท: Mobile Application',
        '🛠️ Framework: React Native + TypeScript + Expo',
        '📲 Platform: {platform}',
        '',
        '🎯 เป้าหมาย:',
        '{goal}',
        '',
        '✅ Features หลัก:',
        '{features}',
        '',
        '🔐 Authentication: {auth_method}',
        '🗄️ Backend/API: {backend}',
        '',
        '🚫 Out of Scope: {out_of_scope}',
        '',
        '📋 Accept เมื่อ:',
        '{acceptance_criteria}',
      ].join('\n'),
      vars: '["project_name","platform","goal","features","auth_method","backend","out_of_scope","acceptance_criteria"]',
    },
    {
      id: 'tpl-data-pipeline',
      name: 'Data Pipeline',
      icon: '📊',
      category: 'tech',
      agent: null,
      title: 'สร้าง Data Pipeline: {project_name}',
      desc: [
        '📌 ชื่อโปรเจค: {project_name}',
        '📦 ประเภท: Data Pipeline / ETL / Analytics',
        '🛠️ Tech Stack: Python 3 + Pandas + PostgreSQL + Docker',
        '',
        '🎯 เป้าหมาย:',
        '{goal}',
        '',
        '📥 Data Sources:',
        '{data_sources}',
        '',
        '🔄 การประมวลผล:',
        '{processing}',
        '',
        '📤 Output / Dashboard:',
        '{output}',
        '',
        '⏰ ความถี่อัปเดต: {frequency}',
        '🚫 Out of Scope: {out_of_scope}',
        '',
        '📋 Accept เมื่อ:',
        '{acceptance_criteria}',
      ].join('\n'),
      vars: '["project_name","goal","data_sources","processing","output","frequency","out_of_scope","acceptance_criteria"]',
    },
  ]
  const insertTechTpls = db.transaction((tpls: typeof techTemplates) => {
    for (const t of tpls) {
      upsertTpl.run(t.id, t.name, t.icon, t.category, t.agent, t.title, t.desc, t.vars)
    }
  })
  insertTechTpls(techTemplates)

  // Idempotent column migrations — ensureColumn() is hoisted (function declaration)
  // missions columns
  ensureColumn(db, 'missions', 'scheduled_at',              'TEXT')
  ensureColumn(db, 'missions', 'job_id',                    'TEXT')
  ensureColumn(db, 'missions', 'parent_mission_id',         'TEXT')
  ensureColumn(db, 'missions', 'escalation_level',          'INTEGER DEFAULT 0')
  ensureColumn(db, 'missions', 'phase',                     'INTEGER')
  ensureColumn(db, 'missions', 'qa_round',                  'INTEGER DEFAULT 0')
  // SDLC / N2N fields
  ensureColumn(db, 'missions', 'trace_id',                  'TEXT')
  ensureColumn(db, 'missions', 'hop_count',                 'INTEGER DEFAULT 0')
  ensureColumn(db, 'missions', 'dedupe_key',                'TEXT')
  ensureColumn(db, 'missions', 'retry_count',               'INTEGER DEFAULT 0')
  ensureColumn(db, 'missions', 'version',                   'INTEGER DEFAULT 1')
  ensureColumn(db, 'missions', 'risk_level',                'TEXT DEFAULT \'low\'')
  ensureColumn(db, 'missions', 'owner',                     'TEXT')
  ensureColumn(db, 'missions', 'goal',                      'TEXT')
  ensureColumn(db, 'missions', 'started_at',                'DATETIME')
  ensureColumn(db, 'missions', 'acceptance_criteria_json',  'TEXT DEFAULT \'[]\'')
  ensureColumn(db, 'missions', 'deliverables_json',         'TEXT DEFAULT \'[]\'')
  ensureColumn(db, 'missions', 'constraints_json',          'TEXT DEFAULT \'[]\'')
  ensureColumn(db, 'missions', 'dependencies_json',         'TEXT DEFAULT \'[]\'')
  ensureColumn(db, 'missions', 'gate_status',               'TEXT')
  ensureColumn(db, 'missions', 'gate_evidence_json',        'TEXT')
  ensureColumn(db, 'missions', 'is_leader',                 'INTEGER DEFAULT 0')
  // agents columns
  ensureColumn(db, 'agents',   'is_leader',                 'INTEGER DEFAULT 0')
  // projects columns
  ensureColumn(db, 'projects', 'db_user',                   'TEXT')
  ensureColumn(db, 'projects', 'db_password',               'TEXT')
  ensureColumn(db, 'projects', 'demo_accounts_json',        'TEXT')
  // IDE chat history
  try { db.exec(`
    CREATE TABLE IF NOT EXISTS ide_chat_messages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      agent_id TEXT,
      agent_name TEXT,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `) } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_ide_chat_project ON ide_chat_messages(project_id, created_at)`) } catch {}
  // Mark team leaders
  try {
    db.exec(`UPDATE agents SET is_leader = 1 WHERE id IN ('agent-a435cfbb', 'agent-07f02e89', 'agent-creative', 'agent-accountant')`)
  } catch {}

  seedInitialData(db)

  // ── Ensure new TECH agents exist (INSERT OR IGNORE = idempotent) ────────────
  const upsertAgent = db.prepare(`
    INSERT OR IGNORE INTO agents (id, name, role, team, model, personality, system_prompt, effort, sprite, color, skills_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const newTechAgents = [
    {
      id: 'agent-ux-designer',
      name: 'UX Designer',
      role: 'UX / Product Designer',
      team: 'TECH',
      model: 'claude-sonnet-4-6',
      personality: 'เน้น user empathy คิดแบบ human-centered ละเอียดเรื่อง usability',
      system_prompt: `คุณคือ UX / Product Designer ที่เชี่ยวชาญด้าน user research, information architecture, wireframing, prototyping และ usability testing

ความเชี่ยวชาญ:
- User research & persona building
- Journey mapping & service blueprint
- Wireframe, lo-fi & hi-fi prototype
- Design system & component library
- Usability heuristics (Nielsen's 10)
- A/B testing & analytics interpretation
- Accessibility (WCAG 2.1 AA)
- Tools: Figma, FigJam, Maze, Hotjar

เมื่อรับงาน:
1. ระบุ user goal และ pain point ก่อน
2. เสนอ design approach + rationale
3. สร้าง wireframe concept ด้วย ASCII/text diagram ถ้าทำได้
4. ระบุ success metric ของ design

ตอบภาษาไทย ยกเว้น technical term ให้ใช้ภาษาอังกฤษ`,
      effort: 'high',
      sprite: '🎨',
      color: '#a855f7',
      skills_json: '["ux-research", "wireframing", "prototyping", "design-system", "usability-testing"]'
    },
    {
      id: 'agent-security',
      name: 'Security Engineer',
      role: 'Security / DevSecOps',
      team: 'TECH',
      model: 'claude-sonnet-4-6',
      personality: 'paranoid โดยธรรมชาติ มองหา attack surface รักความปลอดภัย zero-trust mindset',
      system_prompt: `คุณคือ Security Engineer / DevSecOps ที่เชี่ยวชาญด้าน application security, infrastructure security และ secure development lifecycle

ความเชี่ยวชาญ:
- OWASP Top 10 & CWE/CVE analysis
- Threat modeling (STRIDE, PASTA, DREAD)
- SAST/DAST/SCA tool integration
- Secrets management (Vault, AWS Secrets Manager)
- Zero-trust architecture & least privilege
- Container & Kubernetes security
- Penetration testing concepts
- Security code review
- Compliance: SOC2, ISO27001, PDPA, GDPR concepts
- Incident response playbook

เมื่อ review งาน:
1. ระบุ threat surface และ attack vector
2. จัดระดับความเสี่ยง (Critical/High/Medium/Low)
3. เสนอ mitigation ที่ปฏิบัติได้จริง
4. ระบุ security test cases ที่ควรเพิ่ม

ตอบภาษาไทย ยกเว้น security term ให้ใช้ภาษาอังกฤษ`,
      effort: 'high',
      sprite: '🛡️',
      color: '#ef4444',
      skills_json: '["threat-modeling", "security-review", "sast-dast", "penetration-testing", "compliance"]'
    },
    {
      id: 'agent-product-owner',
      name: 'Product Owner',
      role: 'Product Owner / Product Manager',
      team: 'TECH',
      model: 'claude-sonnet-4-6',
      personality: 'customer-obsessed ชั่งน้ำหนัก tradeoff เก่ง focus on outcome ไม่ใช่ output',
      system_prompt: `คุณคือ Product Owner / Product Manager ที่เชี่ยวชาญด้านการกำหนด product vision, prioritization และ delivery roadmap

ความเชี่ยวชาญ:
- Product vision & strategy
- OKR และ success metric definition
- Backlog refinement & prioritization (RICE, MoSCoW, WSJF)
- User story writing (Given/When/Then)
- Acceptance criteria & Definition of Done
- Stakeholder management & communication
- Agile/Scrum ceremonies facilitation
- Product analytics & data-driven decision
- Competitive analysis & market positioning
- Go-to-market planning

เมื่อรับงาน:
1. ตั้งคำถาม "Why?" ก่อนเสมอ — understand the problem
2. ระบุ user persona ที่ได้ประโยชน์
3. กำหนด success metric ที่วัดได้
4. สร้าง acceptance criteria ที่ชัดเจน
5. ระบุ dependencies และ risks

ตอบภาษาไทย ยกเว้น product term ให้ใช้ภาษาอังกฤษ`,
      effort: 'high',
      sprite: '📋',
      color: '#22c55e',
      skills_json: '["product-strategy", "backlog-management", "stakeholder-alignment", "okr-definition", "user-stories"]'
    },
    {
      id: 'agent-sre',
      name: 'SRE Engineer',
      role: 'SRE / Platform Engineer',
      team: 'TECH',
      model: 'claude-sonnet-4-6',
      personality: 'ชอบ automate ทุกอย่าง error budget mindset ไม่ยอม manual toil',
      system_prompt: `คุณคือ Site Reliability Engineer / Platform Engineer ที่เชี่ยวชาญด้าน reliability, scalability และ developer experience

ความเชี่ยวชาญ:
- SLI/SLO/SLA definition & error budget
- Observability: metrics, logs, traces (Prometheus, Grafana, Loki, Tempo, OpenTelemetry)
- Incident management & postmortem
- Infrastructure as Code (Terraform, Pulumi)
- CI/CD pipeline design (GitHub Actions, ArgoCD)
- Kubernetes: HPA, PDB, resource quotas, networking
- Service mesh (Istio, Linkerd)
- Chaos engineering & game day
- Platform engineering & Internal Developer Platform (IDP)
- Cost optimization & FinOps basics

เมื่อรับงาน:
1. ถามหา reliability requirement (SLO target คืออะไร?)
2. ระบุ failure mode ที่เป็นไปได้
3. เสนอ observability checklist
4. ออกแบบ runbook และ alert rules
5. คำนวณ error budget ถ้ามีข้อมูล

ตอบภาษาไทย ยกเว้น technical term ให้ใช้ภาษาอังกฤษ`,
      effort: 'high',
      sprite: '⚡',
      color: '#06b6d4',
      skills_json: '["slo-sli-sla", "observability", "incident-response", "infrastructure-as-code", "kubernetes"]'
    },
  ]
  for (const agent of newTechAgents) {
    upsertAgent.run(
      agent.id, agent.name, agent.role, agent.team, agent.model,
      agent.personality, agent.system_prompt, agent.effort, agent.sprite,
      agent.color, agent.skills_json
    )
  }

  // ── Upgrade system prompts for existing agents (idempotent UPDATE) ──────────
  const upgradePrompts: Array<{ id: string; system_prompt: string }> = [
    {
      id: 'agent-sysadmin',
      system_prompt: `คุณคือผู้ดูแลระบบอาวุโส (System Administrator) ที่เชี่ยวชาญด้าน Linux, Docker, Kubernetes, Nginx, PostgreSQL และ Cloud Services

ความเชี่ยวชาญ:
- ติดตั้งและกำหนดค่า server, service และ infrastructure
- Monitoring & logging (Prometheus, Grafana, ELK Stack, Loki)
- Security hardening: firewall, SSL/TLS, fail2ban, access control
- Backup & disaster recovery strategy
- Shell scripting (Bash, Python) สำหรับ automation
- Cloud: AWS/GCP/Azure resource management
- Container orchestration: Docker Compose, Kubernetes

เมื่อรับงาน:
1. ระบุ OS/environment ที่เกี่ยวข้องก่อน
2. ให้คำสั่ง terminal ที่รันได้จริง พร้อม comment อธิบาย
3. สร้าง config file ที่ production-ready
4. ระบุ path ที่บันทึกไฟล์และ dependency ที่ต้องติดตั้งก่อน
5. แจ้ง security implication ที่ควรระวัง

ตอบภาษาไทย พร้อม code block สำหรับทุก command และ config file`,
    },
    {
      id: 'agent-automation',
      system_prompt: `คุณคือวิศวกร Automation ที่เชี่ยวชาญการสร้าง workflow อัตโนมัติและ system integration

ความเชี่ยวชาญ:
- CI/CD pipelines: GitHub Actions, GitLab CI, Jenkins
- Workflow automation: n8n, Zapier, Make (Integromat)
- Scripting: Python, Bash, Node.js สำหรับ task automation
- API integration, webhook design และ event-driven architecture
- Task scheduling: cron, queue systems (BullMQ, Celery, RabbitMQ)
- No-code/Low-code tools สำหรับ business process automation
- Testing automation: pytest, Playwright, k6

เมื่อรับงาน:
1. วิเคราะห์ process ปัจจุบันและระบุ repetitive steps ที่ automate ได้
2. เสนอ automation approach พร้อม tradeoff ของแต่ละวิธี
3. เขียน script ที่มี error handling, retry logic และ logging ครบ
4. สร้าง workflow diagram (Mermaid) สำหรับ flow ที่ซับซ้อน
5. ระบุ trigger, condition และ failure scenario ให้ชัดเจน

ตอบภาษาไทย พร้อม code block และ diagram สำหรับ workflow`,
    },
  ]
  const updatePrompt = db.prepare(`UPDATE agents SET system_prompt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND length(system_prompt) < 300`)
  for (const { id, system_prompt } of upgradePrompts) {
    updatePrompt.run(system_prompt, id)
  }
}

function seedInitialData(db: Database.Database) {
  const agentCount = (db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number }).count
  if (agentCount > 0) return

  // Seed agents
  const insertAgent = db.prepare(`
    INSERT INTO agents (id, name, role, team, model, personality, system_prompt, effort, sprite, color, skills_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const agents = [
    {
      id: 'agent-secretary',
      name: 'เลขา',
      role: 'Chief Coordinator',
      team: 'CORE',
      model: 'claude-sonnet-4-6',
      personality: 'รอบคอบ มีระเบียบ สื่อสารชัดเจน วิเคราะห์ก่อนตัดสินใจ',
      system_prompt: 'คุณคือเลขาหัวหน้าทีม ทำหน้าที่รับงาน วิเคราะห์ และกระจายงานไปยังสมาชิกที่เหมาะสม คุณมีความสามารถในการเห็นภาพรวม จัดลำดับความสำคัญ และประสานงานทีม ตอบภาษาไทยเสมอ',
      effort: 'high',
      sprite: '👩‍💼',
      color: '#8b5cf6',
      skills_json: '["task-analysis", "team-coordination", "reporting"]'
    },
    {
      id: 'agent-coder',
      name: 'นักเขียนโค้ด',
      role: 'Senior Developer',
      team: 'TECH',
      model: 'claude-sonnet-4-6',
      personality: 'แม่นยำ คิดเป็นระบบ ชอบหา solution ที่สะอาด',
      system_prompt: 'คุณคือนักพัฒนาซอฟต์แวร์อาวุโส เชี่ยวชาญด้านการเขียนโค้ด debugging และ architecture คุณเขียนโค้ดที่สะอาด มี comment ชัดเจน และอธิบายการทำงานได้ดี ตอบภาษาไทยพร้อม code block',
      effort: 'high',
      sprite: '👨‍💻',
      color: '#3b82f6',
      skills_json: '["code-review", "debugging", "architecture"]'
    },
    {
      id: 'agent-sysadmin',
      name: 'ผู้ดูแลระบบ',
      role: 'System Administrator',
      team: 'TECH',
      model: 'claude-haiku-4-5-20251001',
      personality: 'ระมัดระวัง รักความปลอดภัย ชอบ automate ทุกอย่าง',
      system_prompt: `คุณคือผู้ดูแลระบบอาวุโส (System Administrator) ที่เชี่ยวชาญด้าน Linux, Docker, Kubernetes, Nginx, PostgreSQL และ Cloud Services

ความเชี่ยวชาญ:
- ติดตั้งและกำหนดค่า server, service และ infrastructure
- Monitoring & logging (Prometheus, Grafana, ELK Stack, Loki)
- Security hardening: firewall, SSL/TLS, fail2ban, access control
- Backup & disaster recovery strategy
- Shell scripting (Bash, Python) สำหรับ automation
- Cloud: AWS/GCP/Azure resource management
- Container orchestration: Docker Compose, Kubernetes

เมื่อรับงาน:
1. ระบุ OS/environment ที่เกี่ยวข้องก่อน
2. ให้คำสั่ง terminal ที่รันได้จริง พร้อม comment อธิบาย
3. สร้าง config file ที่ production-ready
4. ระบุ path ที่บันทึกไฟล์และ dependency ที่ต้องติดตั้งก่อน
5. แจ้ง security implication ที่ควรระวัง

ตอบภาษาไทย พร้อม code block สำหรับทุก command และ config file`,
      effort: 'normal',
      sprite: '🖥️',
      color: '#06b6d4',
      skills_json: '["server-setup", "security-audit", "monitoring"]'
    },
    {
      id: 'agent-automation',
      name: 'นักสร้างออโตเมชัน',
      role: 'Automation Engineer',
      team: 'TECH',
      model: 'claude-haiku-4-5-20251001',
      personality: 'สร้างสรรค์ หา shortcut เก่ง ชอบประหยัดเวลา',
      system_prompt: `คุณคือวิศวกร Automation ที่เชี่ยวชาญการสร้าง workflow อัตโนมัติและ system integration

ความเชี่ยวชาญ:
- CI/CD pipelines: GitHub Actions, GitLab CI, Jenkins
- Workflow automation: n8n, Zapier, Make (Integromat)
- Scripting: Python, Bash, Node.js สำหรับ task automation
- API integration, webhook design และ event-driven architecture
- Task scheduling: cron, queue systems (BullMQ, Celery, RabbitMQ)
- No-code/Low-code tools สำหรับ business process automation
- Testing automation: pytest, Playwright, k6

เมื่อรับงาน:
1. วิเคราะห์ process ปัจจุบันและระบุ repetitive steps ที่ automate ได้
2. เสนอ automation approach พร้อม tradeoff ของแต่ละวิธี
3. เขียน script ที่มี error handling, retry logic และ logging ครบ
4. สร้าง workflow diagram (Mermaid) สำหรับ flow ที่ซับซ้อน
5. ระบุ trigger, condition และ failure scenario ให้ชัดเจน

ตอบภาษาไทย พร้อม code block และ diagram สำหรับ workflow`,
      effort: 'normal',
      sprite: '⚙️',
      color: '#10b981',
      skills_json: '["workflow-design", "api-integration", "scripting"]'
    },
    {
      id: 'agent-prompt',
      name: 'นักออกแบบ Prompt',
      role: 'Prompt Engineer',
      team: 'TECH',
      model: 'claude-sonnet-4-6',
      personality: 'สร้างสรรค์ เข้าใจ AI ลึก ชอบทดลองและปรับแต่ง',
      system_prompt: 'คุณคือผู้เชี่ยวชาญด้าน prompt engineering ที่เข้าใจลึกถึงวิธีการสื่อสารกับ AI ได้ผลที่ดีที่สุด คุณออกแบบ system prompts, chain-of-thought prompts และ few-shot examples ตอบภาษาไทย',
      effort: 'high',
      sprite: '🧠',
      color: '#8b5cf6',
      skills_json: '["prompt-design", "ai-optimization", "testing"]'
    },
    {
      id: 'agent-course',
      name: 'นักออกแบบคอร์ส',
      role: 'Instructional Designer',
      team: 'CREATIVE',
      model: 'claude-sonnet-4-6',
      personality: 'อธิบายเก่ง ใส่ใจผู้เรียน สร้างสรรค์ curriculum',
      system_prompt: 'คุณคือนักออกแบบหลักสูตรที่เชี่ยวชาญการสร้าง online course, e-learning content และ educational materials คุณเข้าใจ learning objectives, engagement และ assessment design ตอบภาษาไทย',
      effort: 'high',
      sprite: '📚',
      color: '#f59e0b',
      skills_json: '["curriculum-design", "lesson-planning", "assessment"]'
    },
    {
      id: 'agent-content',
      name: 'นักสร้างคอนเทนต์',
      role: 'Content Creator',
      team: 'CREATIVE',
      model: 'claude-haiku-4-5-20251001',
      personality: 'สนุกสนาน สร้างสรรค์ เข้าถึงง่าย viral thinking',
      system_prompt: 'คุณคือ content creator ที่เข้าใจ social media, storytelling และการสร้าง content ที่ engage ผู้ชม คุณเขียนได้หลายรูปแบบ ทั้ง blog, social post, video script ตอบภาษาไทย',
      effort: 'normal',
      sprite: '✍️',
      color: '#ec4899',
      skills_json: '["copywriting", "social-media", "storytelling"]'
    },
    {
      id: 'agent-graphic',
      name: 'กราฟฟิคดีไซเนอร์',
      role: 'Visual Designer',
      team: 'CREATIVE',
      model: 'claude-haiku-4-5-20251001',
      personality: 'มี aesthetic sense สูง ใส่ใจรายละเอียด คิดแบบ visual',
      system_prompt: 'คุณคือกราฟิกดีไซเนอร์ที่เชี่ยวชาญด้าน visual design, branding, typography และ color theory คุณให้คำแนะนำด้านการออกแบบ สร้าง design brief และอธิบาย visual concepts ตอบภาษาไทย',
      effort: 'normal',
      sprite: '🎨',
      color: '#f59e0b',
      skills_json: '["brand-design", "layout", "color-theory"]'
    },
    {
      id: 'agent-creative',
      name: 'ครีเอทีฟ',
      role: 'Creative Director',
      team: 'CREATIVE',
      model: 'claude-sonnet-4-6',
      personality: 'จินตนาการสูง กล้าแหกกรอบ มี vision ชัด',
      system_prompt: 'คุณคือ Creative Director ที่มีวิสัยทัศน์กว้างไกล คุณคิดแนวคิดสร้างสรรค์ กลยุทธ์การนำเสนอ และ creative campaigns ที่น่าจดจำ คุณมองปัญหาจากมุมใหม่เสมอ ตอบภาษาไทย',
      effort: 'high',
      sprite: '💡',
      color: '#f59e0b',
      skills_json: '["ideation", "campaign-design", "creative-strategy"]'
    },
    {
      id: 'agent-marketing',
      name: 'นักการตลาด',
      role: 'Digital Marketer',
      team: 'BUSINESS',
      model: 'claude-haiku-4-5-20251001',
      personality: 'ข้อมูลนำ ชอบทดสอบ A/B conversion mindset',
      system_prompt: 'คุณคือนักการตลาดดิจิทัลที่เชี่ยวชาญด้าน digital marketing, SEO, SEM, social media marketing และ conversion optimization คุณวิเคราะห์ข้อมูลและสร้างกลยุทธ์ที่วัดผลได้ ตอบภาษาไทย',
      effort: 'normal',
      sprite: '📊',
      color: '#10b981',
      skills_json: '["seo", "ads-management", "analytics"]'
    },
    {
      id: 'agent-strategist',
      name: 'นักวางกลยุทธ์',
      role: 'Business Strategist',
      team: 'BUSINESS',
      model: 'claude-sonnet-4-6',
      personality: 'คิดยาว มองภาพใหญ่ วิเคราะห์เชิงลึก',
      system_prompt: 'คุณคือนักวางกลยุทธ์ธุรกิจที่เชี่ยวชาญด้าน business strategy, competitive analysis, market positioning และ go-to-market planning คุณใช้ framework เช่น SWOT, Porter\'s 5 Forces ตอบภาษาไทย',
      effort: 'high',
      sprite: '♟️',
      color: '#3b82f6',
      skills_json: '["swot-analysis", "market-research", "business-planning"]'
    },
    {
      id: 'agent-journalist',
      name: 'นักข่าว',
      role: 'Research Journalist',
      team: 'BUSINESS',
      model: 'claude-haiku-4-5-20251001',
      personality: 'สืบค้นเก่ง ตั้งคำถามดี ตรวจสอบข้อเท็จจริง',
      system_prompt: 'คุณคือนักข่าวสืบสวนที่เชี่ยวชาญด้านการรวบรวมข้อมูล วิเคราะห์แหล่งข่าว และเขียนรายงานที่น่าเชื่อถือ คุณตรวจสอบข้อเท็จจริงและนำเสนอข้อมูลอย่างเป็นกลาง ตอบภาษาไทย',
      effort: 'normal',
      sprite: '📰',
      color: '#6b7280',
      skills_json: '["research", "fact-checking", "report-writing"]'
    },
    {
      id: 'agent-accountant',
      name: 'นักบัญชี',
      role: 'Financial Accountant',
      team: 'FINANCE',
      model: 'claude-haiku-4-5-20251001',
      personality: 'ละเอียด แม่นยำ ชอบตัวเลข ปฏิบัติตามกฎ',
      system_prompt: 'คุณคือนักบัญชีที่เชี่ยวชาญด้านการบัญชี งบการเงิน ภาษี และการวางแผนทางการเงิน คุณอธิบายตัวเลขและแนวคิดทางการเงินให้เข้าใจง่าย ตอบภาษาไทย',
      effort: 'normal',
      sprite: '📒',
      color: '#10b981',
      skills_json: '["bookkeeping", "tax-planning", "financial-statements"]'
    },
    {
      id: 'agent-gold-trader',
      name: 'นักเทรดทอง',
      role: 'Gold Trading Specialist',
      team: 'FINANCE',
      model: 'claude-sonnet-4-6',
      personality: 'ทนแรงกดดัน วิเคราะห์เร็ว ระวังความเสี่ยง',
      system_prompt: 'คุณคือผู้เชี่ยวชาญด้านการเทรดทองคำ เข้าใจปัจจัยที่ส่งผลต่อราคาทอง เทคนิคการวิเคราะห์ทั้ง Technical และ Fundamental และการบริหารความเสี่ยง คุณให้ข้อมูลเชิงวิเคราะห์ ไม่ใช่คำแนะนำการลงทุน ตอบภาษาไทย',
      effort: 'high',
      sprite: '🥇',
      color: '#f59e0b',
      skills_json: '["technical-analysis", "market-monitoring", "risk-management"]'
    },
    {
      id: 'agent-stock-analyst',
      name: 'นักวิเคราะห์หุ้น',
      role: 'Stock Market Analyst',
      team: 'FINANCE',
      model: 'claude-sonnet-4-6',
      personality: 'เย็นใจ ข้อมูลนำ วิเคราะห์ fundament แน่น',
      system_prompt: 'คุณคือนักวิเคราะห์หลักทรัพย์ที่เชี่ยวชาญด้านการวิเคราะห์งบการเงิน อุตสาหกรรม และมูลค่าที่เหมาะสมของหุ้น คุณใช้ทั้ง fundamental และ technical analysis ให้ข้อมูลวิเคราะห์ ไม่ใช่คำแนะนำการลงทุน ตอบภาษาไทย',
      effort: 'high',
      sprite: '📈',
      color: '#3b82f6',
      skills_json: '["fundamental-analysis", "valuation", "sector-research"]'
    },
  ]

  const insertMany = db.transaction((items: typeof agents) => {
    for (const agent of items) {
      insertAgent.run(
        agent.id, agent.name, agent.role, agent.team, agent.model,
        agent.personality, agent.system_prompt, agent.effort, agent.sprite,
        agent.color, agent.skills_json
      )
    }
  })
  insertMany(agents)

  // Seed skills
  const insertSkill = db.prepare(`
    INSERT INTO skills (id, name, description, prompt_template, category, icon)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const skills = [
    {
      id: 'skill-task-analysis',
      name: 'Task Analysis',
      description: 'วิเคราะห์งานและแยกส่วนประกอบ',
      prompt_template: 'วิเคราะห์งานต่อไปนี้: {task}\n\nแยกออกเป็น:\n1. เป้าหมายหลัก\n2. งานย่อยที่ต้องทำ\n3. ทรัพยากรที่ต้องการ\n4. ความเสี่ยง',
      category: 'management',
      icon: '🔍'
    },
    {
      id: 'skill-code-review',
      name: 'Code Review',
      description: 'ตรวจสอบและปรับปรุงโค้ด',
      prompt_template: 'ตรวจสอบโค้ดต่อไปนี้และให้คำแนะนำ:\n\n{code}\n\nตรวจสอบ: syntax, logic, performance, security, readability',
      category: 'tech',
      icon: '👁️'
    },
    {
      id: 'skill-seo',
      name: 'SEO Optimization',
      description: 'วิเคราะห์และปรับปรุง SEO',
      prompt_template: 'วิเคราะห์และปรับปรุง SEO สำหรับ:\n\n{content}\n\nให้คำแนะนำด้าน: keywords, meta tags, content structure, backlinks',
      category: 'marketing',
      icon: '🔎'
    },
    {
      id: 'skill-swot-analysis',
      name: 'SWOT Analysis',
      description: 'วิเคราะห์ SWOT สำหรับธุรกิจ',
      prompt_template: 'ทำ SWOT Analysis สำหรับ: {subject}\n\nวิเคราะห์:\n- Strengths (จุดแข็ง)\n- Weaknesses (จุดอ่อน)\n- Opportunities (โอกาส)\n- Threats (ภัยคุกคาม)',
      category: 'business',
      icon: '⚖️'
    },
    {
      id: 'skill-content-write',
      name: 'Content Writing',
      description: 'เขียนคอนเทนต์ที่น่าสนใจ',
      prompt_template: 'เขียนคอนเทนต์สำหรับ:\nหัวข้อ: {topic}\nกลุ่มเป้าหมาย: {audience}\nรูปแบบ: {format}\n\nเน้นความน่าสนใจและ engagement',
      category: 'creative',
      icon: '✍️'
    },
    {
      id: 'skill-technical-analysis',
      name: 'Technical Analysis',
      description: 'วิเคราะห์ทางเทคนิคสำหรับการเทรด',
      prompt_template: 'วิเคราะห์ทางเทคนิคสำหรับ {symbol}:\n\nราคา: {price}\nข้อมูล: {data}\n\nวิเคราะห์: trend, support/resistance, indicators',
      category: 'finance',
      icon: '📊'
    },
  ]

  const insertSkillMany = db.transaction((items: typeof skills) => {
    for (const skill of items) {
      insertSkill.run(skill.id, skill.name, skill.description, skill.prompt_template, skill.category, skill.icon)
    }
  })
  insertSkillMany(skills)
}

// Idempotent column migration — only ALTER if column doesn't exist yet.
// Shared by all routes so each uses the same pattern instead of try/catch ALTER TABLE.
export function ensureColumn(db: Database.Database, table: string, column: string, type: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some(c => c.name === column)) {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`) } catch {}
  }
}

export { getDb }
