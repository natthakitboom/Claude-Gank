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
  try { db.exec("ALTER TABLE notification_config ADD COLUMN agent_filter_json TEXT DEFAULT '[]'") } catch {}

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

  // Migrations for new columns
  try { db.exec(`ALTER TABLE missions ADD COLUMN scheduled_at TEXT`) } catch {}
  try { db.exec(`ALTER TABLE missions ADD COLUMN job_id TEXT`) } catch {}
  try { db.exec(`ALTER TABLE missions ADD COLUMN parent_mission_id TEXT REFERENCES missions(id)`) } catch {}
  try { db.exec(`ALTER TABLE missions ADD COLUMN escalation_level INTEGER DEFAULT 0`) } catch {}
  try { db.exec(`ALTER TABLE agents ADD COLUMN is_leader INTEGER DEFAULT 0`) } catch {}
  // Mark team leaders
  try {
    db.exec(`UPDATE agents SET is_leader = 1 WHERE id IN ('agent-a435cfbb', 'agent-07f02e89', 'agent-creative', 'agent-accountant')`)
  } catch {}

  seedInitialData(db)
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
      system_prompt: 'คุณคือผู้ดูแลระบบที่มีประสบการณ์ด้าน Linux, Docker, Kubernetes และ Cloud Services คุณให้ความสำคัญกับ security และ reliability ตอบภาษาไทยพร้อมคำสั่ง terminal ที่ชัดเจน',
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
      system_prompt: 'คุณคือวิศวกร automation ที่เชี่ยวชาญด้าน workflow automation, scripting, API integration และ no-code/low-code tools คุณหาวิธีทำให้กระบวนการทำงานอัตโนมัติและมีประสิทธิภาพสูงสุด ตอบภาษาไทย',
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

  const insertMany = db.transaction((agents: typeof agents) => {
    for (const agent of agents) {
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

  const insertSkillMany = db.transaction((skills: typeof skills) => {
    for (const skill of skills) {
      insertSkill.run(skill.id, skill.name, skill.description, skill.prompt_template, skill.category, skill.icon)
    }
  })
  insertSkillMany(skills)
}

export { getDb }
