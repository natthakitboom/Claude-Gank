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
    nav_monitor: 'Monitor',
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
    welcome_subtitle: 'MII Gang is an AI system that automatically builds websites and apps for you.',
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

    // Templates page
    templates_title: 'TEMPLATES',
    templates_subtitle: '// Templates for creating new projects with AI',
    templates_new_btn: '+ NEW TEMPLATE',
    templates_loading: 'LOADING TEMPLATES...',
    templates_empty_title: 'No templates yet',
    templates_empty_desc: 'Create a template to start new projects faster with a predefined tech stack and Figma design.',
    templates_create_first: 'Create First Template',
    templates_modal_create: 'NEW TEMPLATE',
    templates_modal_edit: 'EDIT TEMPLATE',
    templates_creating: 'CREATING...',
    templates_create_btn: 'CREATE',
    templates_save_btn: 'SAVE',

    // Template form fields
    tpl_name_label: 'Template Name *',
    tpl_name_placeholder: 'e.g. Web App + Auth',
    tpl_desc_label: 'Description',
    tpl_desc_placeholder: 'Describe what type of projects this template is suited for',
    tpl_tags_label: 'Tags (comma separated)',
    tpl_figma_hint: 'Add a Figma link for thumbnail and extract styles',
    tpl_design_context_label: 'Design Context',
    tpl_design_context_suffix: '✦ agents will receive this info',
    tpl_design_context_placeholder: 'Design system for agents: colors, fonts, component styles, layout rules...\nPaste from Figma or write a design spec directly.\n\nOr press Extract Design (from Figma URL) or AI Fill to generate automatically.',
    tpl_design_context_hint: 'This info is sent to the UX/UI and Frontend agents for every task — the more detail the better.',
    tpl_system_prompt_label: 'Additional System Prompt',
    tpl_system_prompt_placeholder: 'Special instructions to be appended to the prompt when using this template...',
    tpl_ms_hint: 'Set up Azure AD for this project — Client Secret can be configured in Project Settings later.',
    tpl_edit_btn: 'Edit',
    tpl_ai_fill_btn: 'AI Fill',
    tpl_ai_filling: 'AI Generating...',

    // Template alert/error messages
    err_figma_fetch: 'Unable to fetch Figma preview',
    err_extract_context: 'Unable to extract design context',
    err_connection: 'Connection error. Please try again.',
    err_save_failed: 'An error occurred while saving',
    err_delete_failed: 'Delete failed',
    err_generic: 'An error occurred',

    // System page — agents tab
    sys_select_all: 'SELECT ALL',
    sys_selected: 'SELECTED',
    sys_applying: '⏳ APPLYING...',
    sys_apply_to: '⚡ APPLY TO',
    sys_apply_to_all: '⚡ APPLY TO ALL',
    sys_agents_label: 'AGENTS',
    sys_ai_analyzing: 'AI ANALYZING...',
    sys_ai_auto_effort: '🤖 AI AUTO EFFORT',
    sys_ai_effort_applied: '🤖 AI EFFORT RECOMMENDATIONS — APPLIED',
    sys_no_change: '— No change —',

    // System page — skills tab
    sys_skill_library: 'SKILL LIBRARY',
    sys_create_skill: '+ CREATE SKILL',
    sys_create_skill_modal: 'CREATE NEW SKILL',

    // System page — memory tab
    sys_memory_db: 'MEMORY DATABASE',
    sys_add_memory: '+ ADD MEMORY',
    sys_add_memory_modal: 'ADD MEMORY',
    sys_no_memories: 'NO MEMORIES STORED',
    sys_high_importance: 'HIGH IMPORTANCE',

    // System page — notify tab
    sys_notify_title: 'Notification Integrations',
    sys_notify_desc: 'Connect LINE / Microsoft Teams to receive agent notifications',
    sys_notify_empty: 'No connections yet — click + LINE or + TEAMS to start',
    sys_notify_sending: 'Sending...',

    // System page — alerts
    err_ai_analyze: 'AI could not analyze',

    // SDLC page
    sdlc_loading: 'Loading SDLC config…',
    sdlc_reset_btn: 'RESET',
    sdlc_save_btn: 'SAVE',
    sdlc_saving: 'SAVING…',
    sdlc_tab_pipeline: 'PIPELINE',
    sdlc_tab_quality: 'QUALITY GATES',
    sdlc_tab_engine: 'ENGINE & RULES',
    sdlc_pipeline_flow: 'PIPELINE FLOW',
    sdlc_phases_label: 'PHASES',
    sdlc_add_phase: '+ ADD PHASE',

    // Templates page — missing field
    tpl_tech_stack_label: 'Tech Stack',
    tpl_ai_fill_tooltip: 'Let Claude AI generate design context from the info you filled in',

    // System page — tab labels
    sys_tab_agents: 'AGENTS',
    sys_tab_skills: 'SKILLS',
    sys_tab_memory: 'MEMORY',
    sys_tab_notify: '🔔 NOTIFY',
    sys_tab_deploy: '🚀 DEPLOY',
    sys_tab_info: 'SYSTEM INFO',

    // System page — effort options (inline dropdowns)
    effort_option_low: 'Low',
    effort_option_normal: 'Normal',
    effort_option_high: 'High',

    // System page — skill modal
    sys_skill_create_btn: 'CREATE',
    sys_skill_cancel_btn: 'CANCEL',

    // System page — memory modal
    sys_mem_content_placeholder: 'Things you want the agent to remember…',
    sys_mem_save_btn: 'SAVE',
    sys_mem_cancel_btn: 'CANCEL',

    // System page — notify tab
    sys_notify_active: 'ACTIVE',
    sys_notify_disabled: 'DISABLED',
    sys_notify_test_btn: '🔔 SEND TEST NOTIFICATION',
    sys_notify_all_agents_hint: 'ALL = notify from every agent / selected = notify only selected agents',
    sys_notify_line_channel_hint: 'Create a Messaging API channel at developers.line.biz → Channel settings → Channel access token',
    sys_notify_line_target_hint: 'userId from webhook event / groupId when you invite bot to a group',
    sys_notify_teams_hint: '⚠️ O365 Connectors expire 30 Apr 2026 — use Power Automate Workflows instead',
    sys_notify_teams_steps: 'Teams → Channel → Workflows → Post to a channel when a webhook request is received → copy URL',
    sys_notify_done_label: '✅ Mission Done',
    sys_notify_failed_label: '❌ Mission Failed',
    sys_notify_skill_label: '🧠 Skill Update',
    sys_notify_when_label: 'NOTIFY WHEN',
    sys_notify_agents_label: 'AGENTS TO NOTIFY',

    // System page — deploy tab
    sys_deploy_title: 'VPS DEPLOY SETTINGS',
    sys_deploy_subtitle: 'Configure once, deploy any project with one click',
    sys_deploy_save_btn: '💾 SAVE SETTINGS',
    sys_deploy_saving: '⏳ SAVING...',
    sys_deploy_saved: '✅ SAVED!',
    sys_deploy_test_btn: '🔌 TEST CONNECTION',
    sys_deploy_testing: '⏳ CONNECTING...',
    sys_deploy_success: '✅ CONNECTION SUCCESSFUL',
    sys_deploy_failed: '❌ CONNECTION FAILED',
    sys_deploy_no_projects: 'No projects yet — create one in Projects menu first',
    sys_deploy_check_hint: 'Check: Is IP correct? Auth method correct? Port 22 open? VPS firewall allows SSH?',
    sys_deploy_how_it_works: 'HOW IT WORKS',
    sys_deploy_cloudflare_dns: '⚠️ CLOUDFLARE DNS — one-time setup',

    // System page — system info tab
    sys_info_online: 'SYSTEM ONLINE',
    sys_info_save_test: '💾 SAVE & TEST',
    sys_info_saving: '⏳...',
    sys_info_connect: '🔌 CONNECT',
    sys_info_save_jira: '🔗 SAVE & TEST',
    sys_info_save_figma: '🎨 SAVE & TEST',
    sys_info_save_ms: '💾 SAVE',
    sys_info_auto_detected: '⚡ AUTO DETECTED',
    sys_info_which_claude: 'Find path with',
    sys_info_ollama_install: 'Install Ollama and run',
    sys_info_ollama_models_tab: 'AVAILABLE MODELS — select for Agent in AGENTS tab',
    sys_info_available_models_hint: 'Go to AGENTS tab → select Agent → change MODEL dropdown to Ollama (Local) section',
    sys_info_jira_cleared: '✅ Jira credentials cleared',
    sys_info_figma_cleared: '✅ Figma token cleared',
    sys_info_sso_cleared: '✅ SSO credentials cleared',
    sys_info_figma_how_to_create: 'How to create a token →',
    sys_info_mcp_restart: 'Restart Claude Code for MCP to take effect',

    // System page — skill usage
    sys_skill_used: 'USED',
    sys_skill_created: 'CREATED',

    // Monitor page
    mon_running: 'RUNNING',
    mon_waiting: 'WAITING',
    mon_all_idle: 'ALL IDLE',
    mon_no_active: 'NO ACTIVE MISSIONS',
    mon_no_active_desc: 'Deploy a mission via 🏢 TEAM to see live agent output here',
    mon_thinking: 'Thinking...',
    mon_waiting_phase: '⏳ Waiting for Phase',
    mon_waiting_phase_suffix: 'to finish first',
    mon_waiting_result: '⏳ Waiting for result...',
    mon_no_output: '— No output yet —',
    mon_view_active: 'ACTIVE',
    mon_view_all_phases: 'ALL PHASES',
    mon_grid_view: '← GRID VIEW',
    mon_project_label: 'Project:',
    mon_see_all: '× See all',

    // Missions page
    missions_search_placeholder: '🔍 Search missions...',
    missions_filter_all_agents: 'All Agents',
    missions_date_all: 'All',
    missions_date_today: 'Today',
    missions_date_week: '7 days',
    missions_date_month: '30 days',
    missions_execute: 'EXECUTE',
    missions_abort: 'ABORT',
    missions_retry: '🔄 RETRY',
    missions_rerun: 'RE-RUN',
    missions_copy: 'COPY',
    missions_processing: 'PROCESSING...',
    missions_output_terminal: 'OUTPUT TERMINAL',
    missions_mission_brief: 'MISSION BRIEF',
    missions_select_or_deploy: '// SELECT A MISSION OR DEPLOY A NEW ONE',
    missions_deploy_btn: '+ DEPLOY MISSION',
    missions_press_execute: '// PRESS EXECUTE TO START AGENT',
    missions_no_output: '// NO OUTPUT',
    missions_all_pending: '▶▶ ALL PENDING',
    missions_tpl_btn: '📋 TPL',
    missions_team_btn: '🏢 TEAM',
    missions_deploy_short: 'DEPLOY',
    missions_running_badge: 'RUNNING',
    missions_queued: 'QUEUED',
    missions_context_template: 'CONTEXT TEMPLATE',
    missions_hide_tpl: '▲ HIDE',
    missions_pick_tpl: '▼ PICK TEMPLATE',
    missions_task_input_label: 'Task description',
    missions_task_placeholder: 'Describe what you want the team to do, or pick a Template above',
    missions_team_analyze_hint: 'Secretary will analyze the task, break it down, and assign to team members automatically',
    missions_deploy_to_team_btn: '🏢 DEPLOY TO TEAM',
    missions_analyzing: 'ANALYZING...',
    missions_success_title: 'Tasks assigned!',
    missions_success_body: 'missions created for team — agents are working',
    missions_view_result: 'VIEW RESULTS',
    missions_cancel_team: 'CANCEL',

    // Projects page
    projects_create_btn: 'Create Project',
    projects_create_first_btn: 'Create First Project',
    projects_refresh_title: 'Refresh',
    projects_no_work_dir_alert: 'Project folder has not been set',
    projects_create_new_title: 'Create New Project',
    projects_no_template: 'No template',
    projects_secretary_hint: 'Secretary will plan and assign tasks to the team automatically',
    projects_launching: 'Creating...',
    projects_launch_btn: 'Launch',
    projects_screenshot_title: 'Capture screenshot',
    projects_demo_accounts: 'Test Accounts',
    projects_find_accounts_btn: 'Find Accounts',
    projects_create_accounts_btn: 'Create Accounts',
    projects_create_accounts_confirm: 'Let AI create test accounts for this project?',
    projects_accounts_created_alert: 'AI is creating accounts — check "All Tasks" for progress',
    projects_no_accounts_alert: 'No accounts found — try "Create Accounts"',
    projects_auto_fix_btn: 'Auto-Fix',
    projects_fixing_btn: 'Fixing…',
    projects_triggering_btn: 'Triggering…',
    projects_tasks_suffix: 'tasks',
    projects_from_phase: 'from',
    projects_no_folder_set: 'Folder not configured',
    projects_delete_project_btn: 'Delete Project',
    projects_view_code_title: 'View and edit code',
    projects_monitor_title: 'View project monitor',
    projects_settings_title: 'Configure path and port',
    projects_prompt_title: 'View creation prompt',
    projects_restart_title: 'Restart',
    projects_name_label: 'Project Name',
    projects_name_ph: 'Project name',
    projects_ports_label: 'Ports',
    projects_web_port_label: 'Website (App Port)',
    projects_adminer_port_label: 'DB Admin (CloudBeaver)',
    projects_db_section: 'Database Info',
    projects_ms_sso: 'Microsoft SSO (Azure AD)',
    projects_from_template_badge: 'Value from template:',
    projects_secret_ph: 'Enter only when changing',
    projects_secret_from_template: '••••••• (from template)',
    projects_name_optional_note: '(optional)',
    projects_name_ph_long: 'e.g. Pandora Luxe, Meeting Room System',
    projects_desc_label: 'Project Description',
    projects_desc_ph: 'e.g. Online meeting room booking for 500 staff with login, booking, approval and analytics dashboard',
    projects_launch_success: '✅ Started! Secretary is analyzing and assigning tasks — track progress in Projects',
    projects_launch_error: 'An error occurred',
    projects_audit_checking: 'Checking code...',
    projects_audit_done: '✅ AI is reviewing the code',
    projects_n2n_analyzing: 'AI is analyzing the issue...',
    projects_n2n_done: '✅ AI is fixing automatically',
    projects_deleting_btn: 'Deleting...',
    projects_delete_btn: 'Delete Project',
    projects_phase_next_suffix: 'from',
    projects_phase_triggering: 'Triggering…',
    projects_ask_btn: 'Ask',
    projects_ask_title: 'Ask Agent',
    projects_ask_placeholder: 'Ask anything about this project… (Enter to send)',
    projects_ask_thinking: 'Thinking…',
    projects_ask_clear: 'Clear chat',
    projects_ask_select_agent: 'Select agent',
    projects_ask_you: 'You',
  },
  TH: {
    // Sidebar
    nav_agents: 'AI ทีมงาน',
    nav_warroom: 'ภาพรวม',
    nav_usage: 'ค่าใช้จ่าย',
    nav_comms: 'ประกาศ',
    nav_missions: 'งานทั้งหมด',
    nav_monitor: 'มอนิเตอร์',
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
    welcome_subtitle: 'MII Gang คือระบบ AI ที่จะสร้างเว็บไซต์และแอปให้คุณโดยอัตโนมัติ',
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

    // Templates page
    templates_title: 'เทมเพลต',
    templates_subtitle: '// เทมเพลตสำหรับสร้างโปรเจกต์ใหม่ด้วย AI',
    templates_new_btn: '+ เทมเพลตใหม่',
    templates_loading: 'กำลังโหลดเทมเพลต...',
    templates_empty_title: 'ยังไม่มีเทมเพลต',
    templates_empty_desc: 'สร้างเทมเพลตเพื่อเริ่มต้นโปรเจกต์ใหม่ได้เร็วขึ้น พร้อม tech stack และ Figma design ที่กำหนดไว้แล้ว',
    templates_create_first: 'สร้างเทมเพลตแรก',
    templates_modal_create: 'เทมเพลตใหม่',
    templates_modal_edit: 'แก้ไขเทมเพลต',
    templates_creating: 'กำลังสร้าง...',
    templates_create_btn: 'สร้าง',
    templates_save_btn: 'บันทึก',

    // Template form fields
    tpl_name_label: 'ชื่อเทมเพลต *',
    tpl_name_placeholder: 'เช่น Web App + Auth',
    tpl_desc_label: 'คำอธิบาย',
    tpl_desc_placeholder: 'อธิบายว่าเทมเพลตนี้เหมาะกับงานแบบไหน',
    tpl_tags_label: 'Tags (คั่นด้วย ,)',
    tpl_figma_hint: 'เพิ่ม Figma link สำหรับ thumbnail และ extract styles',
    tpl_design_context_label: 'Design Context',
    tpl_design_context_suffix: '✦ agents จะได้รับข้อมูลนี้',
    tpl_design_context_placeholder: 'Design system ที่ agent จะใช้ เช่น สี, font, component style, layout rules...\nสามารถ paste มาจาก Figma หรือเขียน design spec ได้เลย\n\nหรือกด Extract Design (จาก Figma URL) หรือ AI Fill เพื่อสร้างอัตโนมัติ',
    tpl_design_context_hint: 'ข้อมูลนี้จะถูกส่งให้ UX/UI agent และ Frontend agent ทุก task — ยิ่งละเอียดยิ่งดี',
    tpl_system_prompt_label: 'System Prompt เพิ่มเติม',
    tpl_system_prompt_placeholder: 'คำสั่งพิเศษที่จะถูกเพิ่มเข้าไปใน prompt เมื่อใช้เทมเพลตนี้...',
    tpl_ms_hint: 'ตั้งค่า Azure AD สำหรับ project นี้ — Client Secret ตั้งค่าได้ใน Project Settings ภายหลัง',
    tpl_edit_btn: 'แก้ไข',
    tpl_ai_fill_btn: 'AI Fill',
    tpl_ai_filling: 'AI กำลังสร้าง...',

    // Template alert/error messages
    err_figma_fetch: 'ไม่สามารถ fetch Figma ได้',
    err_extract_context: 'ไม่สามารถ Extract design context ได้',
    err_connection: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
    err_save_failed: 'เกิดข้อผิดพลาดในการบันทึก',
    err_delete_failed: 'ลบไม่สำเร็จ',
    err_generic: 'เกิดข้อผิดพลาด',

    // System page — agents tab
    sys_select_all: 'เลือกทั้งหมด',
    sys_selected: 'เลือกแล้ว',
    sys_applying: '⏳ กำลังใช้...',
    sys_apply_to: '⚡ ใช้กับ',
    sys_apply_to_all: '⚡ ใช้กับทั้งหมด',
    sys_agents_label: 'ทีมงาน',
    sys_ai_analyzing: 'AI กำลังวิเคราะห์...',
    sys_ai_auto_effort: '🤖 AI ปรับ Effort อัตโนมัติ',
    sys_ai_effort_applied: '🤖 AI แนะนำ Effort — ปรับใช้แล้ว',
    sys_no_change: '— ไม่เปลี่ยน —',

    // System page — skills tab
    sys_skill_library: 'คลัง Skill',
    sys_create_skill: '+ สร้าง Skill',
    sys_create_skill_modal: 'สร้าง Skill ใหม่',

    // System page — memory tab
    sys_memory_db: 'ฐานข้อมูลความทรงจำ',
    sys_add_memory: '+ เพิ่มความทรงจำ',
    sys_add_memory_modal: 'เพิ่มความทรงจำ',
    sys_no_memories: 'ยังไม่มีความทรงจำ',
    sys_high_importance: 'ความสำคัญสูง',

    // System page — notify tab
    sys_notify_title: 'การแจ้งเตือน',
    sys_notify_desc: 'เชื่อมต่อ LINE / Microsoft Teams เพื่อรับแจ้งเตือนจาก agents',
    sys_notify_empty: 'ยังไม่มีการเชื่อมต่อ — กด + LINE หรือ + TEAMS เพื่อเริ่ม',
    sys_notify_sending: 'กำลังส่ง...',

    // System page — alerts
    err_ai_analyze: 'AI ไม่สามารถวิเคราะห์ได้',

    // SDLC page
    sdlc_loading: 'กำลังโหลดการตั้งค่า SDLC…',
    sdlc_reset_btn: 'รีเซ็ต',
    sdlc_save_btn: 'บันทึก',
    sdlc_saving: 'กำลังบันทึก…',
    sdlc_tab_pipeline: 'ไปป์ไลน์',
    sdlc_tab_quality: 'ประตูคุณภาพ',
    sdlc_tab_engine: 'เอนจิน & กฎ',
    sdlc_pipeline_flow: 'ไปป์ไลน์',
    sdlc_phases_label: 'เฟส',
    sdlc_add_phase: '+ เพิ่มเฟส',

    // Templates page — missing field
    tpl_tech_stack_label: 'Tech Stack',
    tpl_ai_fill_tooltip: 'ให้ Claude AI สร้าง design context จากข้อมูลที่กรอกไว้',

    // System page — tab labels
    sys_tab_agents: 'ทีมงาน',
    sys_tab_skills: 'สกิล',
    sys_tab_memory: 'ความทรงจำ',
    sys_tab_notify: '🔔 แจ้งเตือน',
    sys_tab_deploy: '🚀 ดีพลอย',
    sys_tab_info: 'ข้อมูลระบบ',

    // System page — effort options (inline dropdowns)
    effort_option_low: 'ต่ำ',
    effort_option_normal: 'ปกติ',
    effort_option_high: 'สูง',

    // System page — skill modal
    sys_skill_create_btn: 'สร้าง',
    sys_skill_cancel_btn: 'ยกเลิก',

    // System page — memory modal
    sys_mem_content_placeholder: 'สิ่งที่ต้องการให้ agent จำ...',
    sys_mem_save_btn: 'บันทึก',
    sys_mem_cancel_btn: 'ยกเลิก',

    // System page — notify tab
    sys_notify_active: 'ใช้งาน',
    sys_notify_disabled: 'ปิดอยู่',
    sys_notify_test_btn: '🔔 ส่งทดสอบ',
    sys_notify_all_agents_hint: 'ALL = แจ้งเตือนจากทุก agent / เลือกเฉพาะ = แจ้งเตือนเฉพาะ agent ที่เลือก',
    sys_notify_line_channel_hint: 'สร้าง Messaging API channel ที่ developers.line.biz → Channel settings → Channel access token',
    sys_notify_line_target_hint: 'userId ได้จาก webhook event / groupId ได้เมื่อ invite bot เข้ากลุ่ม',
    sys_notify_teams_hint: '⚠️ O365 Connectors หมดอายุ 30 เม.ย. 2026 — ใช้ Power Automate Workflows แทน',
    sys_notify_teams_steps: 'Teams → Channel → Workflows → Post to a channel when a webhook request is received → copy URL',
    sys_notify_done_label: '✅ Mission เสร็จ',
    sys_notify_failed_label: '❌ Mission ล้มเหลว',
    sys_notify_skill_label: '🧠 Skill อัปเดต',
    sys_notify_when_label: 'แจ้งเตือนเมื่อ',
    sys_notify_agents_label: 'Agent ที่รับแจ้งเตือน',

    // System page — deploy tab
    sys_deploy_title: 'ตั้งค่า VPS DEPLOY',
    sys_deploy_subtitle: 'ตั้งค่าครั้งเดียว ใช้ deploy ทุก project ด้วยปุ่มเดียว',
    sys_deploy_save_btn: '💾 บันทึกการตั้งค่า',
    sys_deploy_saving: '⏳ กำลังบันทึก...',
    sys_deploy_saved: '✅ บันทึกแล้ว!',
    sys_deploy_test_btn: '🔌 ทดสอบการเชื่อมต่อ',
    sys_deploy_testing: '⏳ กำลังเชื่อมต่อ...',
    sys_deploy_success: '✅ เชื่อมต่อสำเร็จ',
    sys_deploy_failed: '❌ เชื่อมต่อไม่สำเร็จ',
    sys_deploy_no_projects: 'ยังไม่มี Projects — ไปสร้างที่ Projects menu ก่อน',
    sys_deploy_check_hint: 'ตรวจสอบ: IP ถูกต้อง? Auth method ถูกต้อง? Port 22 เปิดอยู่? VPS firewall อนุญาต SSH?',
    sys_deploy_how_it_works: 'วิธีการทำงาน',
    sys_deploy_cloudflare_dns: '⚠️ CLOUDFLARE DNS — ตั้งค่าครั้งเดียว',

    // System page — system info tab
    sys_info_online: 'ระบบออนไลน์',
    sys_info_save_test: '💾 บันทึกและทดสอบ',
    sys_info_saving: '⏳...',
    sys_info_connect: '🔌 เชื่อมต่อ',
    sys_info_save_jira: '🔗 บันทึกและทดสอบ',
    sys_info_save_figma: '🎨 บันทึกและทดสอบ',
    sys_info_save_ms: '💾 บันทึก',
    sys_info_auto_detected: '⚡ ตรวจพบอัตโนมัติ',
    sys_info_which_claude: 'หา path ได้ด้วย',
    sys_info_ollama_install: 'ติดตั้ง Ollama แล้วรัน',
    sys_info_ollama_models_tab: 'โมเดลที่มี — เลือกให้ Agent ได้ใน AGENTS tab',
    sys_info_available_models_hint: 'ไปที่ AGENTS tab → เลือก Agent → เปลี่ยน MODEL dropdown เป็น Ollama (Local) section',
    sys_info_jira_cleared: '✅ ลบ Jira credentials แล้ว',
    sys_info_figma_cleared: '✅ ลบ Figma token แล้ว',
    sys_info_sso_cleared: '✅ ลบ SSO credentials แล้ว',
    sys_info_figma_how_to_create: 'ดูวิธีสร้าง token →',
    sys_info_mcp_restart: 'รีสตาร์ท Claude Code เพื่อให้ MCP มีผล',

    // System page — skill usage
    sys_skill_used: 'ใช้แล้ว',
    sys_skill_created: 'สร้างเมื่อ',

    // Monitor page
    mon_running: 'กำลังทำงาน',
    mon_waiting: 'รออยู่',
    mon_all_idle: 'ว่างทั้งหมด',
    mon_no_active: 'ไม่มี Mission ที่ทำงานอยู่',
    mon_no_active_desc: 'มอบงานผ่าน 🏢 ทีม เพื่อดู output แบบเรียลไทม์ที่นี่',
    mon_thinking: 'กำลังคิด...',
    mon_waiting_phase: '⏳ รอ Phase',
    mon_waiting_phase_suffix: 'เสร็จก่อน',
    mon_waiting_result: '⏳ รอผลลัพธ์...',
    mon_no_output: '— ยังไม่มี output —',
    mon_view_active: 'กำลังทำงาน',
    mon_view_all_phases: 'ทุก Phase',
    mon_grid_view: '← กลับ Grid',
    mon_project_label: 'โปรเจกต์:',
    mon_see_all: '× ดูทั้งหมด',

    // Missions page
    missions_search_placeholder: '🔍 ค้นหา mission...',
    missions_filter_all_agents: 'ทุก Agent',
    missions_date_all: 'ทั้งหมด',
    missions_date_today: 'วันนี้',
    missions_date_week: '7 วัน',
    missions_date_month: '30 วัน',
    missions_execute: 'เริ่มทำงาน',
    missions_abort: 'หยุด',
    missions_retry: '🔄 ลองใหม่',
    missions_rerun: 'รันอีกครั้ง',
    missions_copy: 'คัดลอก',
    missions_processing: 'กำลังประมวลผล...',
    missions_output_terminal: 'ผลลัพธ์',
    missions_mission_brief: 'รายละเอียด Mission',
    missions_select_or_deploy: '// เลือก Mission หรือสร้างใหม่',
    missions_deploy_btn: '+ มอบ Mission',
    missions_press_execute: '// กดปุ่มเริ่มทำงานเพื่อให้ Agent เริ่ม',
    missions_no_output: '// ยังไม่มีผลลัพธ์',
    missions_all_pending: '▶▶ ทำงานที่รอทั้งหมด',
    missions_tpl_btn: '📋 แม่แบบ',
    missions_team_btn: '🏢 ทีม',
    missions_deploy_short: 'มอบงาน',
    missions_running_badge: 'กำลังทำ',
    missions_queued: 'คิวรอ',
    missions_context_template: 'แม่แบบ Context',
    missions_hide_tpl: '▲ ซ่อน',
    missions_pick_tpl: '▼ เลือกแม่แบบ',
    missions_task_input_label: 'งานที่ต้องการ',
    missions_task_placeholder: 'อธิบายงานที่ต้องการให้ทีมทำ หรือเลือก Template ด้านบน',
    missions_team_analyze_hint: 'เลขาจะวิเคราะห์งาน แบ่งย่อย และส่งให้แต่ละคนในทีมอัตโนมัติ',
    missions_deploy_to_team_btn: '🏢 มอบงานให้ทีม',
    missions_analyzing: 'กำลังวิเคราะห์...',
    missions_success_title: 'แบ่งงานเสร็จแล้ว!',
    missions_success_body: 'missions สร้างให้ทีม — agents กำลังทำงาน',
    missions_view_result: 'ดูผลลัพธ์',
    missions_cancel_team: 'ยกเลิก',

    // Projects page
    projects_create_btn: 'สร้าง Project',
    projects_create_first_btn: 'สร้าง Project แรก',
    projects_refresh_title: 'รีเฟรช',
    projects_no_work_dir_alert: 'ยังไม่ได้ตั้งค่าโฟลเดอร์โปรเจกต์',
    projects_create_new_title: 'สร้าง Project ใหม่',
    projects_no_template: 'ไม่ใช้ template',
    projects_secretary_hint: 'Secretary จะวางแผนและแบ่งงานให้ทีมอัตโนมัติ',
    projects_launching: 'กำลังสร้าง...',
    projects_launch_btn: 'เริ่มต้น',
    projects_screenshot_title: 'ถ่ายภาพหน้าเว็บ',
    projects_demo_accounts: 'บัญชีทดสอบ',
    projects_find_accounts_btn: 'ค้นหาบัญชี',
    projects_create_accounts_btn: 'สร้างบัญชี',
    projects_create_accounts_confirm: 'ให้ AI สร้างบัญชีทดสอบสำหรับโปรเจกต์นี้?',
    projects_accounts_created_alert: 'AI กำลังสร้างบัญชีให้ — ดูความคืบหน้าที่หน้า "งานทั้งหมด"',
    projects_no_accounts_alert: 'ไม่พบข้อมูลบัญชี — ลองกด "สร้างบัญชีทดสอบ" แทน',
    projects_auto_fix_btn: 'Auto-Fix',
    projects_fixing_btn: 'กำลังแก้ไข…',
    projects_triggering_btn: 'กำลัง trigger…',
    projects_tasks_suffix: 'งาน',
    projects_from_phase: 'จาก',
    projects_no_folder_set: 'ยังไม่ได้ตั้งค่าโฟลเดอร์',
    projects_delete_project_btn: 'ลบโปรเจกต์',
    projects_view_code_title: 'ดูและแก้ไขโค้ด',
    projects_monitor_title: 'ดู Monitor ของ project นี้',
    projects_settings_title: 'ตั้งค่า path และ port',
    projects_prompt_title: 'ดู Prompt ที่ใช้สร้าง',
    projects_restart_title: 'รีสตาร์ท',
    projects_name_label: 'ชื่อ Project',
    projects_name_ph: 'ชื่อ project',
    projects_ports_label: 'Ports',
    projects_web_port_label: 'เว็บไซต์ (App Port)',
    projects_adminer_port_label: 'จัดการ DB (CloudBeaver)',
    projects_db_section: 'ข้อมูลฐานข้อมูล',
    projects_ms_sso: 'Microsoft SSO (Azure AD)',
    projects_from_template_badge: 'ค่าจาก template:',
    projects_secret_ph: 'ใส่เฉพาะเมื่อต้องการเปลี่ยน',
    projects_secret_from_template: '••••••• (จาก template)',
    projects_name_optional_note: '(ไม่บังคับ)',
    projects_name_ph_long: 'เช่น: Pandora Luxe, ระบบจองห้องประชุม',
    projects_desc_label: 'รายละเอียด Project',
    projects_desc_ph: 'เช่น: ระบบจองห้องประชุมออนไลน์ สำหรับพนักงาน 500 คน มี login, จอง, approve, และ dashboard แสดงสถิติการใช้งาน',
    projects_launch_success: '✅ เริ่มต้นแล้ว! เลขากำลังวิเคราะห์และแบ่งงาน — ดูความคืบหน้าใน Projects',
    projects_launch_error: 'เกิดข้อผิดพลาด',
    projects_audit_checking: 'กำลังตรวจสอบโค้ด...',
    projects_audit_done: '✅ AI กำลังตรวจสอบโค้ด',
    projects_n2n_analyzing: 'AI กำลังวิเคราะห์ปัญหา...',
    projects_n2n_done: '✅ AI กำลังแก้ไขให้อัตโนมัติ',
    projects_deleting_btn: 'กำลังลบ...',
    projects_delete_btn: 'ลบโปรเจกต์',
    projects_phase_next_suffix: 'จาก',
    projects_phase_triggering: 'กำลัง trigger…',
    projects_ask_btn: 'ถาม',
    projects_ask_title: 'ถาม Agent',
    projects_ask_placeholder: 'ถามอะไรก็ได้เกี่ยวกับโปรเจกต์นี้… (Enter เพื่อส่ง)',
    projects_ask_thinking: 'กำลังคิด…',
    projects_ask_clear: 'ล้างบทสนทนา',
    projects_ask_select_agent: 'เลือก agent',
    projects_ask_you: 'คุณ',
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
