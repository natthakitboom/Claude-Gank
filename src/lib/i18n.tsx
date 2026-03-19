'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Lang = 'EN' | 'TH'

const translations = {
  EN: {
    // Sidebar
    nav_agents: 'AGENTS',
    nav_warroom: 'WAR ROOM',
    nav_comms: 'COMMS',
    nav_missions: 'MISSIONS',
    nav_projects: 'PROJECTS',
    nav_schedule: 'SCHEDULE',
    nav_system: 'SYSTEM',
    collapse: 'COLLAPSE',
    cmd_center: 'COMMAND CENTER',

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
    projects_title: 'PROJECTS',
    projects_subtitle: '// DEPLOYED DOCKER PROJECTS',
    deploy_to_team: 'DEPLOY TO TEAM',
    total: 'TOTAL',
    with_files: 'WITH FILES',
    no_projects: 'NO PROJECTS YET',
    ide: 'IDE',
    path: 'PATH',
    delete: 'DELETE',
    deleting: 'DELETING...',
    saving: 'SAVING...',
    set_path_title: 'SET PROJECT PATH',
    work_dir_label: 'WORK DIRECTORY (will be removed on delete)',
    compose_label: 'DOCKER COMPOSE PATH (docker compose down -v)',

    // Status
    status_pending: 'PENDING',
    status_running: 'RUNNING',
    status_done: 'DONE',
    status_failed: 'FAILED',
    status_complete: 'COMPLETE',
    status_partial: 'PARTIAL',
    status_in_progress: 'IN PROGRESS',

    // Team labels
    team_core: 'CORE',
    team_tech: 'TECH',
    team_creative: 'CREATIVE',
    team_biz: 'BIZ',
    team_finance: 'FINANCE',
  },
  TH: {
    // Sidebar
    nav_agents: 'ทีมงาน',
    nav_warroom: 'ห้องรบ',
    nav_comms: 'สื่อสาร',
    nav_missions: 'ภารกิจ',
    nav_projects: 'โปรเจค',
    nav_schedule: 'ตารางงาน',
    nav_system: 'ระบบ',
    collapse: 'ย่อ',
    cmd_center: 'ศูนย์บัญชาการ',

    // Agents page
    agents_title: 'ทีมงาน',
    agents_subtitle: '// เลือกทีมงานเพื่อดูรายละเอียดหรือมอบภารกิจ',
    deploy_new_agent: '+ เพิ่มทีมงาน',
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
    projects_title: 'โปรเจค',
    projects_subtitle: '// โปรเจค Docker ที่ deploy แล้ว',
    deploy_to_team: 'มอบงานทีม',
    total: 'ทั้งหมด',
    with_files: 'มีไฟล์',
    no_projects: 'ยังไม่มีโปรเจค',
    ide: 'IDE',
    path: 'ตั้งค่า',
    delete: 'ลบ',
    deleting: 'กำลังลบ...',
    saving: 'กำลังบันทึก...',
    set_path_title: 'ตั้งค่า path โปรเจค',
    work_dir_label: 'โฟลเดอร์งาน (จะถูกลบเมื่อ delete)',
    compose_label: 'Docker Compose Path (docker compose down -v)',

    // Status
    status_pending: 'รอดำเนินการ',
    status_running: 'กำลังทำ',
    status_done: 'เสร็จสิ้น',
    status_failed: 'ล้มเหลว',
    status_complete: 'เสร็จสิ้น',
    status_partial: 'บางส่วน',
    status_in_progress: 'กำลังดำเนินการ',

    // Team labels
    team_core: 'หัวหน้า',
    team_tech: 'เทค',
    team_creative: 'ครีเอทีฟ',
    team_biz: 'ธุรกิจ',
    team_finance: 'การเงิน',
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
  const [lang, setLang] = useState<Lang>('EN')

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
