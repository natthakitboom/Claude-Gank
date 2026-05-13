'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Lang = 'EN' | 'TH'

const translations = {
  EN: {
    // Sidebar
    nav_agents: 'AI Team',
    nav_warroom: 'Overview',
    nav_usage: 'Usage & Cost',
    nav_comms: 'Updates',
    nav_missions: 'All Tasks',
    nav_projects: 'Projects',
    nav_sdlc: 'SDLC',
    nav_schedule: 'Schedule',
    nav_templates: 'Templates',
    nav_system: 'System',
    collapse: 'Collapse',
    cmd_center: 'AI Control',

    // Agents page
    agents_title: 'AGENTS',
    agents_subtitle: '// SELECT AN AGENT TO VIEW DETAILS OR DEPLOY A MISSION',
    deploy_new_agent: '+ DEPLOY NEW AGENT',
    loading_agents: 'LOADING AGENTS...',
    loading: 'LOADING...',
    standby: 'STANDBY',
    working: 'WORKING...',
    personality: 'PERSONALITY',
    system_prompt: 'SYSTEM PROMPT',
    mission_history: 'MISSION HISTORY',
    no_missions_yet: 'NO MISSIONS YET',
    edit_agent: 'EDIT AGENT',
    edit: 'EDIT',
    save: 'SAVE',
    cancel: 'CANCEL',
    name: 'NAME',
    role: 'ROLE',
    sprite: 'SPRITE',
    model: 'MODEL',
    effort: 'EFFORT',
    agents_count: 'AGENTS',
    active: 'ACTIVE',

    // War Room
    warroom_title: 'WAR ROOM',
    warroom_subtitle: '// HEADQUARTERS OVERVIEW',
    deploy_mission: '+ DEPLOY MISSION',
    missions_label: 'MISSIONS',
    completed: 'COMPLETED',
    memories: 'MEMORIES',
    tokens: 'TOKENS',
    running_sub: 'running',
    done_sub: 'done',
    stored_sub: 'stored',
    used_sub: 'used',
    loading_hq: 'LOADING HEADQUARTERS...',
    supervisor_alerts: '// SUPERVISOR ALERTS',
    all_clear: '// ALL CLEAR',
    run_supervisor: '⚡ RUN SUPERVISOR CHECK',
    force_learn: '🧠 FORCE LEARN',
    force_learn_loading: '🧠 SENDING...',
    force_learn_done: '✅ DISPATCHED!',
    new_alerts: 'NEW',
    approve: '✅ อนุมัติ',
    reject: '❌ ปฏิเสธ',
    acknowledge: '✓ รับทราบ',

    // Chat page
    nav_chat: 'CHAT',
    chat_conversations: 'conversations',
    chat_no_chats: 'NO CONVERSATIONS YET',
    chat_start_new: 'START NEW CHAT',
    chat_select_or_start: '// SELECT A CONVERSATION OR START A NEW ONE',
    chat_choose_agent: 'CHOOSE AN AGENT TO CHAT WITH',
    chat_choose_desc: 'Select an agent to start an interactive conversation',
    chat_greeting: 'Start a conversation with',
    chat_placeholder: 'Type your message... (Enter to send, Shift+Enter for newline)',

    // Missions page
    missions_title: 'MISSIONS',
    missions_subtitle: '// ACTIVE MISSION LOG',
    new_mission: '+ NEW MISSION',
    deploy_team: '🏢 DEPLOY TO TEAM',
    filter_all: 'ALL',
    filter_pending: 'PENDING',
    filter_running: 'RUNNING',
    filter_done: 'DONE',
    filter_failed: 'FAILED',
    no_missions: 'NO MISSIONS',
    select_agent: 'Select Agent',
    title_label: 'TITLE',
    description_label: 'DESCRIPTION',
    agent_label: 'AGENT',
    priority_label: 'PRIORITY',
    auto_run: 'AUTO-RUN',
    create_deploy: 'CREATE & DEPLOY',
    creating: 'CREATING...',
    deploying: 'DEPLOYING...',
    task_description: 'Task Description',
    team_deploy_title: 'DEPLOY TO TEAM',
    team_deploy_subtitle: 'Secretary will analyze & delegate to team',

    // Projects page
    projects_title: 'Your Projects',
    projects_subtitle: 'Websites and apps built by AI',
    deploy_to_team: 'Create New Project',
    total: 'Total',
    with_files: 'Ready',
    no_projects: 'No projects yet',
    ide: 'View Code',
    path: 'Settings',
    delete: 'Delete',
    deleting: 'Deleting...',
    saving: 'Saving...',
    set_path_title: 'Project Settings',
    work_dir_label: 'Project Folder (will be deleted on remove)',
    compose_label: 'Docker Compose Path',

    // Status
    status_pending: 'PENDING',
    status_running: 'RUNNING',
    status_done: 'DONE',
    status_failed: 'FAILED',
    status_complete: 'COMPLETE',
    status_partial: 'PARTIAL',
    status_in_progress: 'IN PROGRESS',

    // Team labels
    team_core: 'CORE TEAM',
    team_tech: 'TECH TEAM',
    team_creative: 'CREATIVE TEAM',
    team_biz: 'BUSINESS TEAM',
    team_finance: 'FINANCE TEAM',

    // Comms page
    comms_title: 'COMMS',
    comms_subtitle: '// INTER-AGENT COMMUNICATION',

    // Schedule page
    schedule_title: 'SCHEDULE',
    schedule_subtitle: '// AGENT TIMELINE & AUTO-SCHEDULE',
    schedule_new: '+ SCHEDULE MISSION',

    // Usage page
    usage_title: 'USAGE',
    usage_loading: 'LOADING USAGE DATA...',
    usage_subtitle: '// TOKEN CONSUMPTION MONITOR',

    // System page
    system_title: 'SYSTEM',
    system_subtitle: '// SYSTEM CONFIGURATION & DATA MANAGEMENT',

    // SDLC page
    sdlc_title: 'SDLC',

    // Monitor page
    monitor_title: 'LIVE MONITOR',
    monitor_subtitle: '// REAL-TIME AGENT ACTIVITY',

    // Agents scorecard
    scorecard_success: 'Success',
    scorecard_cost: 'Cost',
    scorecard_done: 'Done',
    scorecard_failed: 'Failed',
    scorecard_memories: 'Memories',
    scorecard_last_active: 'Last active',
    effort_label: 'EFFORT',

    // Project status
    status_fixing: 'Fixing...',
    projects_total: 'Total',
    projects_ready: 'Ready',
    projects_building: 'Building',
    projects_deleted_msg: 'Deleted',
    projects_loading: 'Loading...',
    projects_empty_title: 'No projects yet',
    projects_empty_desc: 'Use the button above to create a new AI project',
    projects_create_new: 'Create New Project',
    projects_progress: 'Progress',
    projects_open_web: 'Open Website',

    // Effort levels
    effort_low: 'LOW',
    effort_normal: 'NORMAL',
    effort_high: 'HIGH',

    // Mission health (sidebar)
    health_stuck: 'stuck!',
    health_running: 'running',
    health_ok: 'All good',

    // Update panel (sidebar)
    update_btn: 'Update',
    update_latest: 'Up to date',
    update_title: 'System Update',
    update_new_badge: 'new',
    update_do_now: 'Update Now',
    update_check_again: 'Check Again',
    update_close: 'Close',
    update_on_latest: '✓ Already on the latest version',
    update_check_tooltip: 'Check for updates',

    // Welcome modal
    welcome_title: 'Welcome!',
    welcome_subtitle: 'Claude Gang is an AI system that automatically builds websites and apps for you.',
    welcome_steps_title: '3 Steps to Get Started',
    welcome_step1_title: 'Tell the AI what you want',
    welcome_step1_desc: 'Click "New Project" and describe the website or app you need',
    welcome_step2_title: 'AI works automatically',
    welcome_step2_desc: 'The AI team will write code, test, and deploy it for you',
    welcome_step3_title: 'Launch immediately',
    welcome_step3_desc: 'Go to "Projects" and click "Open Website"',
    welcome_cta: '🚀 Create First Project',
    welcome_browse: 'Browse first',

    // Warroom agent badges
    badge_error_title: '⚠️ Mission failed',
    badge_stuck_title: '⏳ Mission stuck',
    badge_error_label: 'Mission Failed',
    badge_stuck_label: 'Mission Stuck > 30min',
    badge_idle_label: 'Inactive for a while',
    view_monitor_link: 'ACTIVE — View MONITOR →',
  },
  TH: {
    // Sidebar
    nav_agents: 'AI ทีมงาน',
    nav_warroom: 'ภาพรวม',
    nav_usage: 'ค่าใช้จ่าย',
    nav_comms: 'ประกาศ',
    nav_missions: 'งานทั้งหมด',
    nav_projects: 'โปรเจกต์',
    nav_sdlc: 'SDLC',
    nav_schedule: 'นัดหมาย',
    nav_templates: 'เทมเพลต',
    nav_system: 'ระบบ',
    collapse: 'ย่อ',
    cmd_center: 'ศูนย์ควบคุม AI',

    // Agents page
    agents_title: 'AI ทีมงาน',
    agents_subtitle: 'กดที่ตัวละครเพื่อดูรายละเอียดและประวัติการทำงาน',
    deploy_new_agent: '+ เพิ่มสมาชิก AI',
    loading_agents: 'กำลังโหลดทีมงาน...',
    loading: 'กำลังโหลด...',
    standby: 'รอพร้อม',
    working: 'กำลังทำงาน...',
    personality: 'บุคลิกภาพ',
    system_prompt: 'คำสั่งระบบ',
    mission_history: 'ประวัติภารกิจ',
    no_missions_yet: 'ยังไม่มีภารกิจ',
    edit_agent: 'แก้ไขทีมงาน',
    edit: 'แก้ไข',
    save: 'บันทึก',
    cancel: 'ยกเลิก',
    name: 'ชื่อ',
    role: 'บทบาท',
    sprite: 'รูป',
    model: 'โมเดล',
    effort: 'ระดับ',
    agents_count: 'ทีมงาน',
    active: 'ทำงาน',

    // War Room
    warroom_title: 'ห้องรบ',
    warroom_subtitle: '// ภาพรวมสำนักงานใหญ่',
    deploy_mission: '+ มอบภารกิจ',
    missions_label: 'ภารกิจ',
    completed: 'เสร็จแล้ว',
    memories: 'ความทรงจำ',
    tokens: 'โทเค็น',
    running_sub: 'กำลังทำ',
    done_sub: 'เสร็จ',
    stored_sub: 'เก็บแล้ว',
    used_sub: 'ใช้แล้ว',
    loading_hq: 'กำลังโหลดสำนักงาน...',
    supervisor_alerts: '// การแจ้งเตือนหัวหน้า',
    all_clear: '// ทุกอย่างปกติดี',
    run_supervisor: '⚡ ตรวจสอบโดยหัวหน้า',
    force_learn: '🧠 สั่งเรียนรู้ทันที',
    force_learn_loading: '🧠 กำลังส่ง...',
    force_learn_done: '✅ ส่งแล้ว!',
    new_alerts: 'ใหม่',
    approve: '✅ อนุมัติ',
    reject: '❌ ปฏิเสธ',
    acknowledge: '✓ รับทราบ',

    // Chat page
    nav_chat: 'แชท',
    chat_conversations: 'บทสนทนา',
    chat_no_chats: 'ยังไม่มีบทสนทนา',
    chat_start_new: 'เริ่มแชทใหม่',
    chat_select_or_start: '// เลือกบทสนทนาหรือเริ่มใหม่',
    chat_choose_agent: 'เลือกทีมงานที่จะคุยด้วย',
    chat_choose_desc: 'เลือกทีมงานเพื่อเริ่มสนทนาแบบโต้ตอบ',
    chat_greeting: 'เริ่มสนทนากับ',
    chat_placeholder: 'พิมพ์ข้อความ... (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)',

    // Missions page
    missions_title: 'ภารกิจ',
    missions_subtitle: '// บันทึกภารกิจทั้งหมด',
    new_mission: '+ ภารกิจใหม่',
    deploy_team: '🏢 มอบงานทีม',
    filter_all: 'ทั้งหมด',
    filter_pending: 'รอ',
    filter_running: 'กำลังทำ',
    filter_done: 'เสร็จ',
    filter_failed: 'ล้มเหลว',
    no_missions: 'ไม่มีภารกิจ',
    select_agent: 'เลือกทีมงาน',
    title_label: 'หัวข้อ',
    description_label: 'รายละเอียด',
    agent_label: 'ทีมงาน',
    priority_label: 'ความสำคัญ',
    auto_run: 'รันอัตโนมัติ',
    create_deploy: 'สร้างและมอบหมาย',
    creating: 'กำลังสร้าง...',
    deploying: 'กำลังมอบหมาย...',
    task_description: 'รายละเอียดงาน',
    team_deploy_title: 'มอบงานให้ทีม',
    team_deploy_subtitle: 'เลขาจะวิเคราะห์และกระจายงานให้ทีม',

    // Projects page
    projects_title: 'โปรเจกต์ของคุณ',
    projects_subtitle: 'เว็บไซต์และแอปที่สร้างโดย AI',
    deploy_to_team: 'สร้างโปรเจกต์ใหม่',
    total: 'ทั้งหมด',
    with_files: 'พร้อมใช้งาน',
    no_projects: 'ยังไม่มีโปรเจกต์',
    ide: 'ดูโค้ด',
    path: 'ตั้งค่า',
    delete: 'ลบ',
    deleting: 'กำลังลบ...',
    saving: 'กำลังบันทึก...',
    set_path_title: 'ตั้งค่าโปรเจกต์',
    work_dir_label: 'โฟลเดอร์โปรเจกต์ (จะถูกลบเมื่อลบโปรเจกต์)',
    compose_label: 'Docker Compose Path',

    // Status
    status_pending: 'รอดำเนินการ',
    status_running: 'กำลังทำงาน',
    status_done: 'เสร็จสิ้น',
    status_failed: 'มีปัญหา',
    status_complete: 'พร้อมใช้งาน',
    status_partial: 'บางส่วน',
    status_in_progress: 'กำลังสร้าง...',

    // Team labels
    team_core: 'ทีมหัวหน้า',
    team_tech: 'ทีมเทคโนโลยี',
    team_creative: 'ทีมครีเอทีฟ',
    team_biz: 'ทีมธุรกิจ',
    team_finance: 'ทีมการเงิน',

    // Comms page
    comms_title: 'ประกาศ',
    comms_subtitle: '// การสื่อสารระหว่าง AI',

    // Schedule page
    schedule_title: 'ตารางงาน',
    schedule_subtitle: '// ตารางเวลา AI',
    schedule_new: '+ กำหนดงานใหม่',

    // Usage page
    usage_title: 'การใช้งาน',
    usage_loading: 'กำลังโหลดข้อมูล...',
    usage_subtitle: '// ติดตาม Token',

    // System page
    system_title: 'ระบบ',
    system_subtitle: '// ตั้งค่าระบบ',

    // SDLC page
    sdlc_title: 'SDLC',

    // Monitor page
    monitor_title: 'มอนิเตอร์สด',
    monitor_subtitle: '// กิจกรรม AI แบบเรียลไทม์',

    // Agents scorecard
    scorecard_success: 'ความสำเร็จ',
    scorecard_cost: 'ค่าใช้จ่าย',
    scorecard_done: 'เสร็จ',
    scorecard_failed: 'ล้มเหลว',
    scorecard_memories: 'ความทรงจำ',
    scorecard_last_active: 'ทำงานล่าสุด',
    effort_label: 'ระดับ',

    // Project status
    status_fixing: 'กำลังแก้ไขปัญหา...',
    projects_total: 'ทั้งหมด',
    projects_ready: 'พร้อมใช้งาน',
    projects_building: 'กำลังสร้าง',
    projects_deleted_msg: 'ลบเสร็จแล้ว',
    projects_loading: 'กำลังโหลด...',
    projects_empty_title: 'ยังไม่มีโปรเจกต์',
    projects_empty_desc: 'กดปุ่มด้านบนเพื่อสร้างโปรเจกต์ใหม่ด้วย AI',
    projects_create_new: 'สร้างโปรเจกต์ใหม่',
    projects_progress: 'ความคืบหน้า',
    projects_open_web: 'เปิดเว็บไซต์',

    // Effort levels
    effort_low: 'ต่ำ',
    effort_normal: 'ปกติ',
    effort_high: 'สูง',

    // Mission health (sidebar)
    health_stuck: 'งานค้าง!',
    health_running: 'กำลังทำงาน',
    health_ok: 'ทุกอย่างปกติ',

    // Update panel (sidebar)
    update_btn: 'อัปเดต',
    update_latest: 'ล่าสุดแล้ว',
    update_title: 'อัปเดตระบบ',
    update_new_badge: 'ใหม่',
    update_do_now: 'อัปเดตเลย',
    update_check_again: 'ตรวจสอบอีกครั้ง',
    update_close: 'ปิด',
    update_on_latest: '✓ ใช้เวอร์ชันล่าสุดอยู่แล้ว',
    update_check_tooltip: 'เช็ค update',

    // Welcome modal
    welcome_title: 'ยินดีต้อนรับ!',
    welcome_subtitle: 'Claude Gang คือระบบ AI ที่จะสร้างเว็บไซต์และแอปให้คุณโดยอัตโนมัติ',
    welcome_steps_title: 'วิธีเริ่มต้น 3 ขั้นตอน',
    welcome_step1_title: 'บอก AI ว่าอยากได้อะไร',
    welcome_step1_desc: 'กด "สร้างโปรเจกต์" แล้วอธิบายเว็บหรือแอปที่ต้องการ',
    welcome_step2_title: 'AI ทำงานให้อัตโนมัติ',
    welcome_step2_desc: 'ทีม AI จะช่วยกันเขียนโค้ด ทดสอบ และ deploy ให้เสร็จ',
    welcome_step3_title: 'เปิดใช้งานได้เลย',
    welcome_step3_desc: 'กลับมาที่ "โปรเจกต์" แล้วกดปุ่ม "เปิดเว็บไซต์"',
    welcome_cta: '🚀 เริ่มสร้างโปรเจกต์แรก',
    welcome_browse: 'ดูก่อน',

    // Warroom agent badges
    badge_error_title: '⚠️ มี mission ล้มเหลว',
    badge_stuck_title: '⏳ mission ค้างอยู่',
    badge_error_label: 'Mission ล้มเหลว',
    badge_stuck_label: 'Mission ค้าง > 30 นาที',
    badge_idle_label: 'ไม่มีงานมานาน',
    view_monitor_link: 'กำลังทำงาน — ดูหน้า MONITOR →',
  },
} as const

export type TranslationKey = keyof typeof translations.EN

interface LangContextType {
  lang: Lang
  t: (key: TranslationKey) => string
  toggle: () => void
}

const LangContext = createContext<LangContextType>({
  lang: 'EN',
  t: (key) => translations.EN[key],
  toggle: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('TH')

  useEffect(() => {
    const saved = localStorage.getItem('cg_lang') as Lang | null
    if (saved === 'EN' || saved === 'TH') setLang(saved)
  }, [])

  const toggle = () => {
    setLang((prev) => {
      const next = prev === 'EN' ? 'TH' : 'EN'
      localStorage.setItem('cg_lang', next)
      return next
    })
  }

  const t = (key: TranslationKey): string => translations[lang][key] ?? key

  return (
    <LangContext.Provider value={{ lang, t, toggle }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LangContext)
}
