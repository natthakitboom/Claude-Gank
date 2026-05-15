'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FolderOpen, Trash2, Settings, X, CheckCircle, Loader2, Circle,
  RefreshCw, Code2, Globe, Database, Play, Square, User,
  RotateCcw, Bug, Zap, ChevronDown, ChevronUp, Copy, Check,
  Rocket, Wrench, MoreHorizontal, LayoutTemplate, Eye, EyeOff, ScrollText, ChevronRight, Activity, Camera,
  MessageSquare, Send, Bot, Trash, ExternalLink,
} from 'lucide-react'
import { useLanguage, type TranslationKey } from '@/lib/i18n'
import { parseDemoAccounts } from '@/lib/parseAccounts'


interface ProjectTemplate {
  id: string
  name: string
  description: string
  tech_stack: string
  tags_json: string
  ms_tenant_id?: string
  ms_client_id?: string
  ms_client_secret?: string
}

interface Project {
  id: string
  name: string
  description: string | null
  mission_id: string | null
  work_dir: string | null
  docker_compose_path: string | null
  status: string
  created_at: string
  mission_title: string | null
  mission_status: string | null
  task_count: number
  completed_tasks: number
  failed_tasks: number
  running_tasks: number
  web_port: number | null
  api_port: number | null
  db_port: number | null
  adminer_port: number | null
  db_user: string | null
  db_password: string | null
  integration_output: string | null
  demo_accounts_json: string | null
  stuck: number
  template_id: string | null
  template_name: string | null
  ms_tenant_id: string | null
  ms_client_id: string | null
  ms_client_secret: string | null
  running_agent_name: string | null
  running_agent_sprite: string | null
  running_mission_title: string | null
  running_tasks_deep: number
  current_phase: number | null
  next_phase: number | null
}

interface Agent { id: string; name: string; name_en?: string; role: string; team: string; color: string; sprite?: string }
interface ChatMsg { role: 'user' | 'agent'; text: string; agentName?: string; agentSprite?: string; agentColor?: string }

function parsePorts(output: string | null): { web: number | null; adminer: number | null; api: number | null } {
  if (!output) return { web: null, adminer: null, api: null }
  const web = Number(output.match(/"?web_port"?\s*[=:]\s*(\d+)/i)?.[1] || output.match(/APP.*?:(\d{4})/i)?.[1] || 0) || null
  const adminer = Number(output.match(/"?adminer_port"?\s*[=:]\s*(\d+)/i)?.[1] || output.match(/(?:cloudbeaver|adminer|db.admin).*?:(\d{4,5})/i)?.[1] || 0) || null
  const api = Number(output.match(/"?api_port"?\s*[=:]\s*(\d+)/i)?.[1] || 0) || null
  return { web, adminer, api }
}

function getEffectivePorts(p: Project) {
  const parsed = parsePorts(p.integration_output)
  return {
    web: p.web_port || parsed.web,
    adminer: p.adminer_port || parsed.adminer,
    api: p.api_port || parsed.api,
  }
}

function getStatusInfo(p: Project, t: (key: TranslationKey) => string): { label: string; color: string; bg: string; icon: string } {
  if (p.stuck === 1) return { label: t('status_fixing'), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '🔧' }
  if (p.running_tasks_deep > 0 || p.running_tasks > 0 || p.mission_status === 'running') return { label: t('status_in_progress'), color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', icon: '⚙️' }
  if (p.task_count > 0 && p.completed_tasks === p.task_count) return { label: t('status_complete'), color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: '✅' }
  if (p.failed_tasks > 0 && p.completed_tasks < p.task_count) return { label: t('status_failed'), color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '❌' }
  if (p.task_count === 0) return { label: t('status_pending'), color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: '⏳' }
  return { label: t('status_in_progress'), color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', icon: '⚙️' }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const { t } = useLanguage()
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1 rounded transition-colors hover:bg-white/10"
      title={t('missions_copy')}
    >
      {copied ? <Check size={12} style={{ color: '#22c55e' }} /> : <Copy size={12} style={{ color: '#6b7280' }} />}
    </button>
  )
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLog, setDeleteLog] = useState<{ id: string; log: string[] } | null>(null)
  const [pathModal, setPathModal] = useState<Project | null>(null)
  const [pathForm, setPathForm] = useState({ name: '', work_dir: '', docker_compose_path: '', db_user: '', db_password: '', web_port: '', adminer_port: '', ms_tenant_id: '', ms_client_id: '', ms_client_secret: '' })
  const [pathFormFromTemplate, setPathFormFromTemplate] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [showProjectSecret, setShowProjectSecret] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [launching, setLaunching] = useState(false)
  const [launchResult, setLaunchResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const [dockerLog, setDockerLog] = useState<Record<string, string>>({})
  const [dockerRunning, setDockerRunning] = useState<Record<string, boolean>>({})
  const [containerUp, setContainerUp] = useState<Record<string, boolean>>({})
  const [auditRunning, setAuditRunning] = useState<Record<string, boolean>>({})
  const [n2nRunning, setN2nRunning] = useState<Record<string, boolean>>({})
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({})
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const [screenshotting, setScreenshotting] = useState<Record<string, boolean>>({})
  const [accountsExpanded, setAccountsExpanded] = useState<Record<string, boolean>>({})
  const [promptModal, setPromptModal] = useState<Project | null>(null)
  const [advancingPhase, setAdvancingPhase] = useState<Record<string, boolean>>({})
  const [askModal, setAskModal] = useState<Project | null>(null)
  const [askAgents, setAskAgents] = useState<Agent[]>([])
  const [askSelectedAgent, setAskSelectedAgent] = useState<string>('')
  const [askChat, setAskChat] = useState<ChatMsg[]>([])
  const [askInput, setAskInput] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const askChatRef = useRef<HTMLDivElement>(null)
  const dockerTermRef = useRef<Record<string, HTMLDivElement | null>>({})
  const dockerLock = useRef<Set<string>>(new Set())
  const dockerRunningRef = useRef<Record<string, boolean>>({})
  const { t, lang } = useLanguage()

  async function runDocker(p: Project, cmd: string) {
    if (dockerLock.current.has(p.id)) return
    if (!p.work_dir) { alert(t('projects_no_work_dir_alert')); return }
    dockerLock.current.add(p.id)
    dockerRunningRef.current[p.id] = true
    setDockerRunning(r => ({ ...r, [p.id]: true }))
    setDockerLog(l => ({ ...l, [p.id]: `$ ${cmd}\n` }))
    const isUp = cmd.includes('up')
    const isDown = cmd.includes('down') || cmd.includes('stop')
    try {
      const res = await fetch(`/api/projects/${p.id}/exec`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const { text } = JSON.parse(line.slice(6))
              setDockerLog(l => {
                const next = { ...l, [p.id]: (l[p.id] || '') + text }
                setTimeout(() => { const el = dockerTermRef.current[p.id]; if (el) el.scrollTop = el.scrollHeight }, 30)
                return next
              })
            } catch {}
          }
        }
      }
      if (isUp) setContainerUp(s => ({ ...s, [p.id]: true }))
      if (isDown) setContainerUp(s => ({ ...s, [p.id]: false }))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setDockerLog(l => ({ ...l, [p.id]: (l[p.id] || '') + '\n[error: ' + msg + ']\n' }))
    } finally {
      dockerLock.current.delete(p.id)
      dockerRunningRef.current[p.id] = false
      setDockerRunning(r => ({ ...r, [p.id]: false }))
    }
  }

  async function stopDocker(p: Project) {
    if (!p.work_dir || !p.docker_compose_path) return
    const f = `-f "${p.docker_compose_path}"`
    await runDocker(p, `docker compose ${f} stop -t 3`)
    setTimeout(() => checkDockerStatus(p), 800)
  }

  const checkDockerStatus = useCallback(async (p: Project) => {
    if (!p.docker_compose_path || dockerRunningRef.current[p.id]) return
    try {
      const res = await fetch(`/api/projects/${p.id}/docker-status`, { method: 'GET' })
      if (!res.ok) return
      const { up } = await res.json() as { up: boolean; containers: string[] }
      setContainerUp(s => ({ ...s, [p.id]: up }))
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      const data: Project[] = await res.json()
      setProjects(data)
      data.forEach(p => { if (p.docker_compose_path) checkDockerStatus(p) })
      // Load existing thumbnails
      data.forEach(async p => {
        try {
          const r = await fetch(`/api/projects/${p.id}/screenshot`)
          const d = await r.json()
          if (d.exists) setThumbnails(prev => ({ ...prev, [p.id]: d.url + `?t=${Date.now()}` }))
        } catch {}
      })
    } catch {}
    setLoading(false)
  }, [checkDockerStatus])

  async function captureScreenshot(p: Project) {
    if (screenshotting[p.id]) return
    setScreenshotting(s => ({ ...s, [p.id]: true }))
    try {
      const res = await fetch(`/api/projects/${p.id}/screenshot`, { method: 'POST' })
      const data = await res.json()
      if (data.url) setThumbnails(prev => ({ ...prev, [p.id]: data.url }))
    } catch {}
    setScreenshotting(s => ({ ...s, [p.id]: false }))
  }

  useEffect(() => {
    let alive = true
    const safeRefresh = async () => { if (alive) await fetchProjects() }
    safeRefresh()
    const interval = setInterval(safeRefresh, 5000)
    return () => { alive = false; clearInterval(interval) }
  }, [fetchProjects])

  // Scheduler watchdog — ping every 30s so stuck pending missions self-rescue even on this page
  useEffect(() => {
    const ping = () => fetch('/api/scheduler').catch(() => {})
    ping()
    const i = setInterval(ping, 30_000)
    return () => clearInterval(i)
  }, [])


  useEffect(() => {
    fetch('/api/project-templates').then(r => r.json()).then((d: ProjectTemplate[]) => {
      setTemplates(d)
    }).catch(() => {})
  }, [])

  const launchNewProject = async () => {
    if (!newDesc.trim() || launching) return
    setLaunching(true)
    setLaunchResult(null)
    try {
      const res = await fetch('/api/orchestra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newDesc.trim(),
          priority: 'high',
          ...(newName.trim() ? { name: newName.trim() } : {}),
          ...(selectedTemplateId ? {
            template_id: selectedTemplateId,
            template_name: templates.find(t => t.id === selectedTemplateId)?.name,
          } : {}),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setLaunchResult({ ok: true, message: t('projects_launch_success') })
        setNewDesc('')
        setNewName('')
        setSelectedTemplateId(null)
        setTimeout(() => { setShowCreateModal(false); setLaunchResult(null); fetchProjects() }, 2500)
      } else {
        setLaunchResult({ ok: false, message: data.error || t('projects_launch_error') })
      }
    } finally { setLaunching(false) }
  }

  async function handleDelete(p: Project) {
    if (!confirm(`ลบโปรเจกต์ "${p.name}" ?\n\nจะลบ:\n- Docker containers + volumes\n- ไฟล์ทั้งหมดใน ${p.work_dir || '(ไม่ได้ตั้งค่า)'}\n- งานทั้งหมดที่เกี่ยวข้อง\n\nไม่สามารถกู้คืนได้`)) return
    setDeletingId(p.id)
    try {
      const res = await fetch(`/api/projects/${p.id}`, { method: 'DELETE' })
      const data = await res.json()
      setDeleteLog({ id: p.id, log: data.log || [] })
      fetchProjects()
    } catch (e: unknown) {
      alert('เกิดข้อผิดพลาด: ' + (e instanceof Error ? e.message : String(e)))
    }
    setDeletingId(null)
  }

  async function createAndExecute(
    projectId: string, endpoint: string, body: object,
    setRunning: (fn: (s: Record<string, boolean>) => Record<string, boolean>) => void,
    pendingMsg: string,
  ): Promise<{ ok: boolean; missionId?: string; error?: string }> {
    void projectId; void setRunning; void pendingMsg
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!data.ok || !data.missionId) return { ok: false, error: data.error || 'No missionId returned' }
    fetch(`/api/missions/${data.missionId}/execute`, { method: 'POST' }).catch(() => {})
    return { ok: true, missionId: data.missionId }
  }

  async function handleAudit(p: Project) {
    if (auditRunning[p.id]) return
    setAuditRunning(s => ({ ...s, [p.id]: true }))
    setActionMsg(s => ({ ...s, [p.id]: t('projects_audit_checking') }))
    try {
      const result = await createAndExecute(p.id, `/api/projects/${p.id}/audit`, {}, setAuditRunning, '')
      if (result.ok) {
        setActionMsg(s => ({ ...s, [p.id]: t('projects_audit_done') }))
        setTimeout(() => setActionMsg(s => ({ ...s, [p.id]: '' })), 6000)
      } else {
        setActionMsg(s => ({ ...s, [p.id]: `❌ ${result.error}` }))
        setTimeout(() => setActionMsg(s => ({ ...s, [p.id]: '' })), 4000)
      }
    } catch (e: unknown) {
      setActionMsg(s => ({ ...s, [p.id]: `❌ ${e instanceof Error ? e.message : String(e)}` }))
      setTimeout(() => setActionMsg(s => ({ ...s, [p.id]: '' })), 4000)
    }
    setAuditRunning(s => ({ ...s, [p.id]: false }))
  }

  async function handleN2n(p: Project) {
    if (n2nRunning[p.id]) return
    setN2nRunning(s => ({ ...s, [p.id]: true }))
    setActionMsg(s => ({ ...s, [p.id]: t('projects_n2n_analyzing') }))
    try {
      const result = await createAndExecute(p.id, `/api/projects/${p.id}/n2n`, {}, setN2nRunning, '')
      if (result.ok) {
        setActionMsg(s => ({ ...s, [p.id]: t('projects_n2n_done') }))
        setTimeout(() => setActionMsg(s => ({ ...s, [p.id]: '' })), 6000)
      } else {
        setActionMsg(s => ({ ...s, [p.id]: `❌ ${result.error}` }))
        setTimeout(() => setActionMsg(s => ({ ...s, [p.id]: '' })), 4000)
      }
    } catch (e: unknown) {
      setActionMsg(s => ({ ...s, [p.id]: `❌ ${e instanceof Error ? e.message : String(e)}` }))
      setTimeout(() => setActionMsg(s => ({ ...s, [p.id]: '' })), 4000)
    }
    setN2nRunning(s => ({ ...s, [p.id]: false }))
  }

  async function handleSetPath(p: Project) {
    const tpl = p.template_id ? templates.find(t => t.id === p.template_id) : null
    const fromTpl = new Set<string>()

    function fallback(projectVal: string | null | undefined, tplVal: string | undefined, key: string): string {
      if (projectVal) return projectVal
      if (tplVal) { fromTpl.add(key); return tplVal }
      return ''
    }

    setPathModal(p)
    setPathFormFromTemplate(fromTpl)
    setPathForm({
      name: p.name || '',
      work_dir: p.work_dir || '',
      docker_compose_path: p.docker_compose_path || '',
      db_user: p.db_user || '',
      db_password: p.db_password || '',
      web_port: p.web_port ? String(p.web_port) : '',
      adminer_port: p.adminer_port ? String(p.adminer_port) : '',
      ms_tenant_id: fallback(p.ms_tenant_id, tpl?.ms_tenant_id, 'ms_tenant_id'),
      ms_client_id: fallback(p.ms_client_id, tpl?.ms_client_id, 'ms_client_id'),
      ms_client_secret: fallback(null, tpl?.ms_client_secret, 'ms_client_secret'),
    })
    setPathFormFromTemplate(new Set(fromTpl))
  }

  async function savePath() {
    if (!pathModal) return
    setSaving(true)
    await fetch(`/api/projects/${pathModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...pathForm,
        name: pathForm.name || null,
        db_user: pathForm.db_user || null,
        db_password: pathForm.db_password || null,
        web_port: pathForm.web_port ? Number(pathForm.web_port) : null,
        adminer_port: pathForm.adminer_port ? Number(pathForm.adminer_port) : null,
        ms_tenant_id: pathForm.ms_tenant_id || null,
        ms_client_id: pathForm.ms_client_id || null,
        ms_client_secret: pathForm.ms_client_secret || null,
      }),
    })
    setSaving(false)
    setPathModal(null)
    setPathFormFromTemplate(new Set())
    fetchProjects()
  }

  // ── Ask Agent ─────────────────────────────────────────────────────────────
  async function openAsk(p: Project) {
    setAskModal(p)
    setAskInput('')
    setAskLoading(false)
    // load agents on first open
    if (askAgents.length === 0) {
      const list: Agent[] = await fetch('/api/agents').then(r => r.json())
      setAskAgents(list)
      const preferred = list.find(a => a.id === 'agent-coder')
        || list.find(a => a.role?.toLowerCase().includes('senior'))
        || list.find(a => a.team === 'TECH')
        || list[0]
      if (preferred && !askSelectedAgent) setAskSelectedAgent(preferred.id)
    }
    // load chat history
    const history = await fetch(`/api/projects/${p.id}/chat`).then(r => r.json())
    if (history.messages?.length > 0) {
      setAskChat(history.messages.map((m: any) => ({ role: m.role, text: m.text, agentName: m.agent_name })))
    } else {
      setAskChat([])
    }
  }

  async function streamMission(missionId: string, onChunk: (text: string) => void) {
    const execRes = await fetch(`/api/missions/${missionId}/execute`, { method: 'POST' })
    if (!execRes.body) return ''
    const reader = execRes.body.getReader()
    const decoder = new TextDecoder()
    let partial = ''; let full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      partial += decoder.decode(value)
      const lines = partial.split('\n'); partial = lines.pop() || ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try { const ev = JSON.parse(line.slice(6)); if (ev.type === 'chunk') { full += ev.text; onChunk(full) } } catch {}
        }
      }
    }
    return full
  }

  async function sendAsk(e?: React.FormEvent) {
    e?.preventDefault()
    if (!askInput.trim() || askLoading || !askSelectedAgent || !askModal) return
    const userMsg = askInput.trim()
    setAskInput('')
    setAskLoading(true)
    const agent = askAgents.find(a => a.id === askSelectedAgent)
    setAskChat(c => [...c, { role: 'user', text: userMsg }])
    // save user msg
    fetch(`/api/projects/${askModal.id}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ role: 'user', text: userMsg }]),
    }).catch(() => {})
    setTimeout(() => { if (askChatRef.current) askChatRef.current.scrollTop = askChatRef.current.scrollHeight }, 50)

    const historyMsgs = askChat.slice(-20)
    const historyBlock = historyMsgs.length > 0
      ? `## บทสนทนาก่อนหน้า\n${historyMsgs.map(m => m.role === 'user' ? `User: ${m.text}` : `${m.agentName || 'Agent'}: ${m.text.slice(0, 600)}`).join('\n\n')}\n\n---\n\n`
      : ''
    const description = `## โปรเจกต์: ${askModal.name}\nWork Dir: \`${askModal.work_dir || '(ไม่ได้ตั้งค่า)'}\`\n\n${historyBlock}## คำถาม\n${userMsg}`

    try {
      const missionRes = await fetch('/api/missions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: userMsg.slice(0, 80), description, agent_id: askSelectedAgent, priority: 'high', parent_mission_id: askModal.mission_id || null }),
      })
      const mission = await missionRes.json()
      await streamMission(mission.id, text => {
        setAskChat(c => {
          const last = c[c.length - 1]
          if (last?.role === 'agent') return [...c.slice(0, -1), { ...last, text }]
          return [...c, { role: 'agent', text, agentName: agent?.name, agentColor: agent?.color, agentSprite: agent?.sprite }]
        })
        setTimeout(() => { if (askChatRef.current) askChatRef.current.scrollTop = askChatRef.current.scrollHeight }, 30)
      })
      // save agent response
      setAskChat(c => {
        const agentMsgs = c.filter(m => m.role === 'agent').slice(-1)
        fetch(`/api/projects/${askModal.id}/chat`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agentMsgs.map(m => ({ role: m.role, text: m.text, agent_name: m.agentName, agent_id: askSelectedAgent }))),
        }).catch(() => {})
        return c
      })
    } catch (err) {
      setAskChat(c => [...c, { role: 'agent', text: `Error: ${String(err)}`, agentName: agent?.name }])
    }
    setAskLoading(false)
  }

  const completeCount = projects.filter(p => p.task_count > 0 && p.completed_tasks === p.task_count).length
  const activeCount = projects.filter(p => p.running_tasks_deep > 0 || p.running_tasks > 0 || p.mission_status === 'running').length

  // Derive status border color for cards
  function getStatusBorderColor(p: Project): string {
    if (p.stuck === 1) return '#f59e0b'
    if (p.running_tasks_deep > 0 || p.running_tasks > 0 || p.mission_status === 'running') return '#60a5fa'
    if (p.task_count > 0 && p.completed_tasks === p.task_count) return '#22c55e'
    if (p.failed_tasks > 0 && p.completed_tasks < p.task_count) return '#ef4444'
    return '#374151'
  }

  return (
    <div className="p-6 space-y-5" style={{ maxWidth: '100%' }}>

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white shrink-0">{t('projects_title')}</h1>
          {/* Stat pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #2d2848', color: '#9ca3af' }}>
              <span style={{ color: '#e5e7eb' }}>{projects.length}</span>
              {t('projects_total')}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}>
              <span className="font-bold">{activeCount}</span>
              {t('projects_building')}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}>
              <span className="font-bold">{completeCount}</span>
              {t('projects_ready')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setShowCreateModal(true); setLaunchResult(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-110 active:scale-95"
            style={{ background: '#E8365D', color: 'white' }}
          >
            <Rocket size={14} />
            {t('projects_create_btn')}
          </button>
          <button
            onClick={fetchProjects}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ border: '1px solid #2d2848', color: '#6b7280' }}
            title={t('projects_refresh_title')}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── Delete log toast ──────────────────────────────────────────────── */}
      {deleteLog && (
        <div className="rounded-xl p-3" style={{ background: '#13101e', border: '1px solid rgba(34,197,94,0.25)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>{t('projects_deleted_msg')}</span>
            <button onClick={() => setDeleteLog(null)} className="p-0.5 rounded hover:bg-white/5">
              <X size={13} style={{ color: '#6b7280' }} />
            </button>
          </div>
          <div className="space-y-0.5 max-h-24 overflow-y-auto">
            {deleteLog.log.map((line, i) => (
              <div key={i} className="font-mono text-xs py-0.5" style={{ color: '#4b5563' }}>{'> '}{line}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── Projects grid ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3" style={{ color: '#6b7280' }}>
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm">{t('projects_loading')}</span>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24">
          <FolderOpen size={44} className="mx-auto mb-4" style={{ color: '#374151' }} />
          <h2 className="text-base font-semibold mb-1" style={{ color: '#6b7280' }}>{t('projects_empty_title')}</h2>
          <p className="text-sm mb-6" style={{ color: '#4b5563' }}>{t('projects_empty_desc')}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#E8365D', color: 'white' }}
          >
            <Rocket size={14} />
            {t('projects_create_first_btn')}
          </button>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map(p => {
            const status = getStatusInfo(p, t)
            const borderColor = getStatusBorderColor(p)
            const progress = p.task_count > 0 ? Math.round((p.completed_tasks / p.task_count) * 100) : 0
            const isDeleting = deletingId === p.id
            const ports = getEffectivePorts(p)
            const isComplete = p.task_count > 0 && p.completed_tasks === p.task_count
            const isAdvanced = showAdvanced[p.id]

            let accounts: { role: string; email: string; password: string }[] = []
            if (p.demo_accounts_json) {
              try { accounts = JSON.parse(p.demo_accounts_json) } catch {}
            }
            if (accounts.length === 0) {
              try { accounts = parseDemoAccounts(p.integration_output ?? '') } catch {}
            }

            const isBusy = !!dockerRunning[p.id]
            const isUp = !!containerUp[p.id]

            return (
              <div
                key={p.id}
                className="rounded-xl overflow-hidden flex flex-col"
                style={{
                  background: '#1c1830',
                  border: '1px solid #2d2848',
                  borderTop: `3px solid ${borderColor}`,
                }}
              >
                {/* Live activity strip */}
                {(p.running_tasks_deep > 0 || p.running_tasks > 0 || p.mission_status === 'running') && (
                  <div
                    className="relative overflow-hidden flex items-center gap-1.5 px-2.5 py-1"
                    style={{ background: 'rgba(96,165,250,0.06)', borderBottom: '1px solid rgba(96,165,250,0.15)' }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(96,165,250,0.08) 50%, transparent 100%)',
                        animation: 'agent-card-shimmer 2s ease-in-out infinite',
                        width: '30%',
                      }}
                    />
                    <span
                      className="flex-shrink-0 rounded-full"
                      style={{ width: 5, height: 5, background: '#60a5fa', boxShadow: '0 0 5px #60a5fa', animation: 'agent-border-breathe 1s ease-in-out infinite' }}
                    />
                    {p.running_agent_sprite && (
                      <span style={{ fontSize: 10, lineHeight: 1 }}>{p.running_agent_sprite}</span>
                    )}
                    <span className="flex-1 truncate font-orbitron" style={{ fontSize: 8, color: '#93c5fd', letterSpacing: '0.05em' }}>
                      {p.running_agent_name || ''}
                      {p.running_mission_title ? ` › ${p.running_mission_title.replace(/^\[.*?\]\s*/, '')}` : ''}
                    </span>
                    <span className="font-orbitron flex-shrink-0" style={{ fontSize: 7, color: '#2563eb', letterSpacing: '0.08em' }}>
                      {p.running_tasks_deep || p.running_tasks}▶
                    </span>
                  </div>
                )}

                {/* Thumbnail */}
                <div className="relative overflow-hidden" style={{ height: 200 }}>
                  {thumbnails[p.id] ? (
                    <img
                      src={thumbnails[p.id]}
                      alt={p.name}
                      className="w-full h-full object-cover object-top"
                      style={{ opacity: 0.85 }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${borderColor}22 0%, #13101e 60%)`,
                        borderBottom: '1px solid #2d2848',
                      }}
                    >
                      <span style={{ fontSize: 36, opacity: 0.15 }}>
                        {p.name?.slice(0, 2).toUpperCase() || '??'}
                      </span>
                    </div>
                  )}
                  {/* Screenshot button */}
                  {p.web_port && (
                    <button
                      onClick={() => captureScreenshot(p)}
                      disabled={!!screenshotting[p.id]}
                      className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-1.5 py-1 rounded-lg transition-all"
                      style={{
                        background: 'rgba(0,0,0,0.65)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#9ca3af',
                        fontSize: 9,
                        backdropFilter: 'blur(4px)',
                      }}
                      title={t('projects_screenshot_title')}
                    >
                      {screenshotting[p.id]
                        ? <Loader2 size={9} className="animate-spin" />
                        : <Camera size={9} />
                      }
                    </button>
                  )}
                </div>

                {/* Card body */}
                <div className="p-3 flex flex-col gap-2 flex-1">

                  {/* Status + date */}
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                      style={{ background: status.bg, color: status.color, fontSize: 10 }}
                    >
                      {status.icon} {status.label}
                      {p.stuck === 1 && <span className="animate-pulse ml-0.5" style={{ color: '#f59e0b', fontSize: 9 }}>fixing…</span>}
                    </span>
                    <span style={{ color: '#4b5563', fontSize: 10 }}>
                      {new Date(p.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>

                  {/* Project name */}
                  <div>
                    {p.template_name && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <LayoutTemplate size={10} style={{ color: '#a78bfa' }} />
                        <span style={{ color: '#a78bfa', fontSize: 10 }} className="font-medium truncate">{p.template_name}</span>
                      </div>
                    )}
                    <h2
                      className="font-bold text-white leading-snug"
                      style={{
                        fontSize: '13px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {p.name}
                    </h2>
                  </div>

                  {/* Progress bar */}
                  {p.task_count > 0 && !isComplete && (
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="flex gap-2" style={{ fontSize: 10, color: '#4b5563' }}>
                          {p.completed_tasks > 0 && <span style={{ color: '#22c55e' }}>{p.completed_tasks}✓</span>}
                          {p.running_tasks > 0 && <span style={{ color: '#60a5fa' }}>{p.running_tasks}▶</span>}
                          {p.failed_tasks > 0 && <span style={{ color: '#ef4444' }}>{p.failed_tasks}✗</span>}
                        </div>
                        <span style={{ color: status.color, fontSize: 10 }} className="font-bold">{progress}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: '#2d2848' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%`, background: status.color }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Phase trigger */}
                  {p.next_phase != null && p.running_tasks_deep === 0 && p.running_tasks === 0 && (
                    <button
                      disabled={!!advancingPhase[p.id]}
                      onClick={async () => {
                        setAdvancingPhase(s => ({ ...s, [p.id]: true }))
                        try {
                          await fetch(`/api/projects/${p.id}/advance-phase`, { method: 'POST' })
                          setTimeout(fetchProjects, 1500)
                        } finally {
                          setAdvancingPhase(s => ({ ...s, [p.id]: false }))
                        }
                      }}
                      className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg font-semibold transition-all"
                      style={{
                        background: advancingPhase[p.id] ? 'rgba(99,92,138,0.06)' : 'rgba(99,92,138,0.14)',
                        border: '1px solid rgba(99,92,138,0.4)',
                        color: '#c4bfe8', fontSize: 10,
                        cursor: advancingPhase[p.id] ? 'not-allowed' : 'pointer',
                        opacity: advancingPhase[p.id] ? 0.6 : 1,
                      }}
                    >
                      {advancingPhase[p.id]
                        ? <><Loader2 size={10} className="animate-spin" /> {t('projects_phase_triggering')}</>
                        : <><ChevronRight size={10} /> ▶ Phase {p.next_phase}{p.current_phase != null ? ` (${t('projects_phase_next_suffix')} ${p.current_phase})` : ''}</>
                      }
                    </button>
                  )}

                  {/* Port links */}
                  {(ports.web || ports.api || ports.adminer) && (
                    <div className="flex gap-1">
                      {ports.web && (
                        <a
                          href={`http://localhost:${ports.web}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 flex-1 py-1.5 rounded-lg font-semibold transition-all hover:brightness-125 active:scale-95"
                          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', fontSize: 10 }}
                        >
                          <Globe size={10} /> Web
                        </a>
                      )}
                      {ports.web && (
                        <a
                          href={`http://localhost:${ports.web}/admin`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 flex-1 py-1.5 rounded-lg font-semibold transition-all hover:brightness-125 active:scale-95"
                          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', fontSize: 10 }}
                        >
                          <Code2 size={10} /> Admin
                        </a>
                      )}
                      {ports.adminer && (
                        <a
                          href={`http://localhost:${ports.adminer}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 flex-1 py-1.5 rounded-lg font-semibold transition-all hover:brightness-125 active:scale-95"
                          style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: '#a855f7', fontSize: 10 }}
                          title={`localhost:${ports.adminer}`}
                        >
                          <Database size={10} /> DB
                        </a>
                      )}
                    </div>
                  )}

                  {/* Demo accounts — collapsible */}
                  {accounts.length > 0 && (
                    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1a2234' }}>
                      <button
                        className="w-full px-2 py-1 flex items-center gap-1.5 transition-colors hover:brightness-125"
                        style={{ background: '#13101e', borderBottom: accountsExpanded[p.id] ? '1px solid #1a2234' : undefined }}
                        onClick={() => setAccountsExpanded(s => ({ ...s, [p.id]: !s[p.id] }))}
                      >
                        <User size={10} style={{ color: '#60a5fa' }} />
                        <span style={{ color: '#60a5fa', fontSize: 10 }} className="font-semibold flex-1 text-left">{t('projects_demo_accounts')} ({accounts.length})</span>
                        {accountsExpanded[p.id] ? <ChevronUp size={10} style={{ color: '#60a5fa' }} /> : <ChevronDown size={10} style={{ color: '#60a5fa' }} />}
                      </button>
                      {accountsExpanded[p.id] && accounts.map((a, i) => {
                        const isAdmin = a.role.toLowerCase().includes('admin') || a.role.toLowerCase().includes('superuser') || a.role.toLowerCase().includes('owner')
                        const webUrl = ports.web ? `http://localhost:${ports.web}` : null
                        const targetPath = isAdmin ? '/admin' : '/'
                        return (
                          <div
                            key={i}
                            className="px-2 py-1 flex items-center gap-2"
                            style={{
                              background: i % 2 === 0 ? '#0d0b14' : 'rgba(13,11,20,0.5)',
                              borderTop: i > 0 ? '1px solid #0f1520' : undefined,
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate" style={{ color: isAdmin ? '#f59e0b' : '#94a3b8', fontSize: 9 }}>{a.role}</div>
                              <div className="font-mono truncate" style={{ color: '#cbd5e1', fontSize: 9 }}>{a.email}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="flex items-center gap-0.5 rounded px-1.5 py-0.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                <span className="font-mono" style={{ color: '#6b7280', fontSize: 9 }}>{a.password}</span>
                                <CopyButton text={a.password} />
                              </div>
                              {webUrl && (
                                <a
                                  href={`${webUrl}${targetPath}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`${webUrl}${targetPath}`}
                                  className="p-0.5 rounded transition-colors hover:bg-white/10"
                                >
                                  <ExternalLink size={9} style={{ color: isAdmin ? '#f59e0b' : '#60a5fa' }} />
                                </a>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Seed accounts — compact */}
                  {accounts.length === 0 && isComplete && (
                    <div className="flex gap-1">
                      {p.integration_output && (
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/projects/${p.id}`, {
                              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ rescan_accounts: true }),
                            })
                            const data = await res.json()
                            if (data.accounts?.length > 0 || data.web_port) fetchProjects()
                            else alert(t('projects_no_accounts_alert'))
                          }}
                          className="flex items-center gap-1 flex-1 px-2 py-1.5 rounded-lg transition-all justify-center"
                          style={{ background: '#1c1830', border: '1px solid rgba(42,22,34,0.5)', color: '#6b7280', fontSize: 10 }}
                        >
                          <User size={10} /> {t('projects_find_accounts_btn')}
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (!confirm(t('projects_create_accounts_confirm'))) return
                          await fetch('/api/missions', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              title: `[SEED] บัญชีทดสอบ — ${p.name}`,
                              description: `สร้างบัญชีทดสอบสำหรับโปรเจกต์ ${p.name}\nWork Dir: \`${p.work_dir}\`\nDocker Compose: \`${p.docker_compose_path || (p.work_dir + '/docker-compose.yml')}\`\n\n1. ตรวจสอบว่า containers รันอยู่\n2. สร้าง demo accounts ใน database\n3. ทดสอบ login ด้วย curl\n4. Output:\n\`\`\`\n---ACCESS-INFO---\n{"demo_accounts":[{"role":"Admin","email":"admin@demo.com","password":"demo1234"},{"role":"User","email":"user@demo.com","password":"demo1234"}]}\n---END---\n\`\`\``,
                              priority: 'high', parent_mission_id: p.mission_id, phase: 4,
                            }),
                          })
                          alert(t('projects_accounts_created_alert'))
                        }}
                        className="flex items-center gap-1 flex-1 px-2 py-1.5 rounded-lg transition-all justify-center"
                        style={{ background: 'rgba(99,92,138,0.08)', border: '1px solid rgba(99,92,138,0.3)', color: '#c4bfe8', fontSize: 10 }}
                      >
                        <User size={10} /> {t('projects_create_accounts_btn')}
                      </button>
                    </div>
                  )}

                  {/* Auto-Fix */}
                  {p.failed_tasks > 0 && p.running_tasks === 0 && (
                    <button
                      onClick={() => handleN2n(p)}
                      disabled={!!n2nRunning[p.id]}
                      className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg font-semibold transition-all"
                      style={{
                        background: n2nRunning[p.id] ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.35)',
                        color: '#f87171', fontSize: 10,
                        cursor: n2nRunning[p.id] ? 'not-allowed' : 'pointer',
                        opacity: n2nRunning[p.id] ? 0.6 : 1,
                      }}
                    >
                      {n2nRunning[p.id]
                        ? <><Loader2 size={10} className="animate-spin" /> {t('projects_fixing_btn')}</>
                        : <><Wrench size={10} /> {t('projects_auto_fix_btn')} {p.failed_tasks} {t('projects_tasks_suffix')}</>
                      }
                    </button>
                  )}

                  {/* Action message */}
                  {actionMsg[p.id] && (
                    <div
                      className="px-2 py-1.5 rounded-lg text-center"
                      style={{
                        background: '#0d0b14', border: '1px solid #2A1622', fontSize: 10,
                        color: actionMsg[p.id].startsWith('✅') ? '#22c55e' : actionMsg[p.id].startsWith('❌') ? '#ef4444' : '#94a3b8',
                      }}
                    >
                      {actionMsg[p.id]}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-auto" style={{ borderTop: '1px solid #2d2848', paddingTop: '8px' }}>
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex gap-1">
                        <a
                          href={`/projects/${p.id}`}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg font-semibold transition-colors"
                          style={{ background: 'rgba(99,92,138,0.12)', border: '1px solid rgba(99,92,138,0.25)', color: '#c4bfe8', fontSize: 10 }}
                          title={t('projects_view_code_title')}
                        >
                          <Code2 size={10} /> {t('ide')}
                        </a>
                        <a
                          href={`/monitor?project=${p.id}`}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg font-semibold transition-colors hover:brightness-125"
                          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontSize: 10 }}
                          title={t('projects_monitor_title')}
                        >
                          <Activity size={10} />
                        </a>
                        <button
                          onClick={() => handleSetPath(p)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors hover:bg-white/5"
                          style={{ color: '#6b7280', border: '1px solid #2d2848', fontSize: 10 }}
                          title={t('projects_settings_title')}
                        >
                          <Settings size={10} />
                        </button>
                        {p.description && (
                          <button
                            onClick={() => setPromptModal(p)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors hover:bg-white/5"
                            style={{ color: '#6b7280', border: '1px solid #2d2848', fontSize: 10 }}
                            title={t('projects_prompt_title')}
                          >
                            <ScrollText size={10} />
                          </button>
                        )}
                        <button
                          onClick={() => openAsk(p)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg font-semibold transition-colors hover:brightness-125"
                          style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontSize: 10 }}
                          title={t('projects_ask_title')}
                        >
                          <MessageSquare size={10} /> {t('projects_ask_btn')}
                        </button>
                      </div>
                      <button
                        onClick={() => setShowAdvanced(s => ({ ...s, [p.id]: !s[p.id] }))}
                        className="flex items-center gap-0.5 px-2 py-1 rounded-lg transition-colors hover:bg-white/5"
                        style={{
                          color: isAdvanced ? '#e5e7eb' : '#4b5563', fontSize: 10,
                          border: isAdvanced ? '1px solid #2d2848' : '1px solid transparent',
                        }}
                      >
                        <MoreHorizontal size={11} />
                        {isAdvanced ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                      </button>
                    </div>

                    {/* Advanced section */}
                    {isAdvanced && (
                      <div className="mt-2 space-y-2 rounded-lg p-2.5" style={{ background: '#13101e', border: '1px solid #2d2848' }}>

                        {/* AI tools */}
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleAudit(p)}
                            disabled={!!auditRunning[p.id]}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg font-semibold flex-1 justify-center"
                            style={{
                              background: '#1a0d00', border: '1px solid rgba(249,115,22,0.67)', color: '#fb923c', fontSize: 10,
                              cursor: auditRunning[p.id] ? 'not-allowed' : 'pointer',
                              opacity: auditRunning[p.id] ? 0.5 : 1,
                            }}
                          >
                            {auditRunning[p.id] ? <Loader2 size={9} className="animate-spin" /> : <Bug size={9} />}
                            Audit
                          </button>
                          <button
                            onClick={() => handleN2n(p)}
                            disabled={!!n2nRunning[p.id]}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg font-semibold flex-1 justify-center"
                            style={{
                              background: '#001a1a', border: '1px solid rgba(6,182,212,0.67)', color: '#22d3ee', fontSize: 10,
                              cursor: n2nRunning[p.id] ? 'not-allowed' : 'pointer',
                              opacity: n2nRunning[p.id] ? 0.5 : 1,
                            }}
                          >
                            {n2nRunning[p.id] ? <Loader2 size={9} className="animate-spin" /> : <Zap size={9} />}
                            Fix
                          </button>
                        </div>

                        {/* Docker controls */}
                        {p.docker_compose_path && (
                          <div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => { const f = p.docker_compose_path ? `-f "${p.docker_compose_path}"` : ''; runDocker(p, `docker compose ${f} up --build -d`) }}
                                disabled={isBusy || isUp}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg font-semibold flex-1 justify-center"
                                style={{
                                  background: isBusy || isUp ? '#0a1a0a' : '#003d1a',
                                  border: '1px solid rgba(0,200,83,0.25)',
                                  color: isBusy || isUp ? '#374151' : '#00c853', fontSize: 10,
                                  cursor: (isBusy || isUp) ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {isBusy && !isUp ? <Loader2 size={9} className="animate-spin" /> : <Play size={9} />}
                                {isUp ? 'Up' : 'Start'}
                              </button>
                              <button
                                onClick={() => { const f = p.docker_compose_path ? `-f "${p.docker_compose_path}"` : ''; runDocker(p, `docker compose ${f} restart`) }}
                                disabled={!isUp || isBusy}
                                title={t('projects_restart_title')}
                                className="flex items-center justify-center px-2 py-1 rounded-lg font-semibold"
                                style={{
                                  background: !isUp ? '#0a0a0a' : '#0d1a2e',
                                  border: '1px solid rgba(59,130,246,0.25)',
                                  color: !isUp ? '#374151' : '#3b82f6',
                                  cursor: (!isUp || isBusy) ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {isBusy && isUp ? <Loader2 size={9} className="animate-spin" /> : <RotateCcw size={9} />}
                              </button>
                              <button
                                onClick={() => stopDocker(p)}
                                disabled={!isUp && !isBusy}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg font-semibold flex-1 justify-center"
                                style={{
                                  background: !isUp && !isBusy ? '#0a0a0a' : '#1a0a0a',
                                  border: '1px solid rgba(239,68,68,0.25)',
                                  color: !isUp && !isBusy ? '#374151' : '#ef4444', fontSize: 10,
                                  cursor: (!isUp && !isBusy) ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {isBusy && isUp ? <Loader2 size={9} className="animate-spin" /> : <Square size={9} />}
                                Stop
                              </button>
                            </div>
                            {dockerLog[p.id] && (
                              <div
                                ref={el => { dockerTermRef.current[p.id] = el }}
                                className="mt-1.5 rounded-lg p-1.5 overflow-y-auto"
                                style={{
                                  background: '#0d0b14', border: '1px solid #0f1a25',
                                  fontFamily: 'monospace', fontSize: '9px', color: '#4ade80',
                                  maxHeight: 100, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                }}
                              >
                                {dockerLog[p.id]}
                                {dockerRunning[p.id] && (
                                  <span className="inline-block w-1.5 h-2.5 ml-0.5 animate-pulse" style={{ background: '#4ade80' }} />
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Path info */}
                        {p.work_dir ? (
                          <div className="flex items-center gap-1 truncate" style={{ color: '#4b5563', fontSize: 9 }}>
                            <CheckCircle size={9} style={{ color: '#16a34a', flexShrink: 0 }} />
                            <span className="font-mono truncate" title={p.work_dir}>{p.work_dir}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1" style={{ color: '#4b5563', fontSize: 9 }}>
                            <Circle size={9} style={{ flexShrink: 0 }} />
                            <span className="italic">{t('projects_no_folder_set')}</span>
                          </div>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={isDeleting}
                          className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg justify-center transition-colors"
                          style={{ background: '#1a0a0a', border: '1px solid #3a1515', color: isDeleting ? '#6b7280' : '#ff4d4f', fontSize: 10 }}
                        >
                          {isDeleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                          {isDeleting ? t('projects_deleting_btn') : t('projects_delete_btn')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Set Path Modal (unchanged) ────────────────────────────────────── */}
      {promptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setPromptModal(null)}>
          <div className="rounded-2xl w-full max-w-2xl flex flex-col" style={{ background: '#1c1830', border: '1px solid #2A1622', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2d2848' }}>
              <div className="flex items-center gap-2">
                <ScrollText size={16} style={{ color: '#a78bfa' }} />
                <div>
                  <h2 className="text-sm font-bold text-white">Prompt</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{promptModal.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { navigator.clipboard.writeText(promptModal.description || '') }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all hover:brightness-125"
                  style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontSize: 12 }}
                >
                  <Copy size={12} /> Copy Prompt
                </button>
                <button onClick={() => setPromptModal(null)} className="p-1 rounded hover:bg-white/5">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
            </div>
            {/* Body */}
            <div className="overflow-y-auto px-5 py-4" style={{ flex: 1 }}>
              <pre className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: '#e2e8f0', fontFamily: 'inherit' }}>
                {promptModal.description}
              </pre>
            </div>
          </div>
        </div>
      )}

      {pathModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 w-full max-w-lg space-y-4" style={{ background: '#1c1830', border: '1px solid #2A1622' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">{t('set_path_title')}</h2>
                <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>{pathModal.name}</p>
              </div>
              <button onClick={() => setPathModal(null)} className="p-1 rounded hover:bg-white/5">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1.5">{t('projects_name_label')}</label>
                <input
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white"
                  style={{ background: '#13101e', border: '1px solid #2A1622', outline: 'none' }}
                  placeholder={t('projects_name_ph')}
                  value={pathForm.name}
                  onChange={e => setPathForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1.5">{t('work_dir_label')}</label>
                <input
                  className="w-full rounded-lg px-3 py-2.5 text-sm font-mono text-white"
                  style={{ background: '#13101e', border: '1px solid #2A1622', outline: 'none' }}
                  placeholder="/private/tmp/my-project"
                  value={pathForm.work_dir}
                  onChange={e => setPathForm(f => ({ ...f, work_dir: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1.5">{t('compose_label')}</label>
                <input
                  className="w-full rounded-lg px-3 py-2.5 text-sm font-mono text-white"
                  style={{ background: '#13101e', border: '1px solid #2A1622', outline: 'none' }}
                  placeholder="/private/tmp/my-project/docker-compose.yml"
                  value={pathForm.docker_compose_path}
                  onChange={e => setPathForm(f => ({ ...f, docker_compose_path: e.target.value }))}
                />
              </div>
              <div style={{ borderTop: '1px solid #181218', paddingTop: '12px' }}>
                <p className="text-sm font-medium text-gray-400 mb-3">Ports</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">{t('projects_web_port_label')}</label>
                    <input
                      type="number"
                      className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white"
                      style={{ background: '#13101e', border: '1px solid #2A1622', outline: 'none' }}
                      placeholder="3001"
                      value={pathForm.web_port}
                      onChange={e => setPathForm(f => ({ ...f, web_port: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">{t('projects_adminer_port_label')}</label>
                    <input
                      type="number"
                      className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white"
                      style={{ background: '#13101e', border: '1px solid #2A1622', outline: 'none' }}
                      placeholder="8978"
                      value={pathForm.adminer_port}
                      onChange={e => setPathForm(f => ({ ...f, adminer_port: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #181218', paddingTop: '12px' }}>
                <p className="text-sm font-medium text-gray-400 mb-3">{t('projects_db_section')}</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">Username</label>
                    <input
                      className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white"
                      style={{ background: '#13101e', border: '1px solid #2A1622', outline: 'none' }}
                      placeholder="app_user"
                      value={pathForm.db_user}
                      onChange={e => setPathForm(f => ({ ...f, db_user: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">Password</label>
                    <input
                      className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white"
                      style={{ background: '#13101e', border: '1px solid #2A1622', outline: 'none' }}
                      placeholder="app_pass"
                      value={pathForm.db_password}
                      onChange={e => setPathForm(f => ({ ...f, db_password: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #181218', paddingTop: '12px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm font-medium text-gray-400">Microsoft SSO (Azure AD)</p>
                  {pathFormFromTemplate.size > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa', fontSize: 9 }}>
                      ✦ {t('projects_from_template_badge')} {pathModal?.template_name}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                      Tenant ID
                      {pathFormFromTemplate.has('ms_tenant_id') && <span style={{ fontSize: 8, color: '#a78bfa' }}>✦ template</span>}
                    </label>
                    <input
                      className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white"
                      style={{ background: '#13101e', border: `1px solid ${pathFormFromTemplate.has('ms_tenant_id') ? 'rgba(167,139,250,0.3)' : '#2A1622'}`, outline: 'none' }}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={pathForm.ms_tenant_id}
                      onChange={e => { setPathForm(f => ({ ...f, ms_tenant_id: e.target.value })); setPathFormFromTemplate(s => { const n = new Set(s); n.delete('ms_tenant_id'); return n }) }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                      Client ID (Application ID)
                      {pathFormFromTemplate.has('ms_client_id') && <span style={{ fontSize: 8, color: '#a78bfa' }}>✦ template</span>}
                    </label>
                    <input
                      className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white"
                      style={{ background: '#13101e', border: `1px solid ${pathFormFromTemplate.has('ms_client_id') ? 'rgba(167,139,250,0.3)' : '#2A1622'}`, outline: 'none' }}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={pathForm.ms_client_id}
                      onChange={e => { setPathForm(f => ({ ...f, ms_client_id: e.target.value })); setPathFormFromTemplate(s => { const n = new Set(s); n.delete('ms_client_id'); return n }) }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                      Client Secret
                      {pathFormFromTemplate.has('ms_client_secret') && <span style={{ fontSize: 8, color: '#a78bfa' }}>✦ template</span>}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showProjectSecret ? 'text' : 'password'}
                        className="w-full rounded-lg px-3 py-2 text-sm font-mono text-white"
                        style={{ background: '#13101e', border: `1px solid ${pathFormFromTemplate.has('ms_client_secret') ? 'rgba(167,139,250,0.3)' : '#2A1622'}`, outline: 'none', paddingRight: 36 }}
                        placeholder={pathFormFromTemplate.has('ms_client_secret') ? t('projects_secret_from_template') : t('projects_secret_ph')}
                        value={pathForm.ms_client_secret}
                        onChange={e => { setPathForm(f => ({ ...f, ms_client_secret: e.target.value })); setPathFormFromTemplate(s => { const n = new Set(s); n.delete('ms_client_secret'); return n }) }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowProjectSecret(s => !s)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        {showProjectSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  {pathModal?.web_port && (
                    <div className="rounded-lg px-3 py-2" style={{ background: '#0F0B0D', border: '1px solid #2A1622', fontSize: '10px', color: '#4b5563' }}>
                      Redirect URI: <span style={{ color: '#00A4EF' }}>http://localhost:{pathModal.web_port}/api/auth/callback/azure-ad</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setPathModal(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-500"
                style={{ background: '#13101e', border: '1px solid #2A1622' }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={savePath}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: saving ? '#1a3a6e' : '#0066ff' }}
              >
                {saving ? t('saving') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Project Modal ──────────────────────────────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowCreateModal(false); setLaunchResult(null) } }}
        >
          <div className="rounded-2xl w-full max-w-xl overflow-hidden" style={{ background: '#1c1830', border: '1px solid #2d2848' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2d2848' }}>
              <div className="flex items-center gap-2">
                <Rocket size={16} style={{ color: '#E8365D' }} />
                <span className="text-base font-bold text-white">{t('projects_create_new_title')}</span>
              </div>
              <button
                onClick={() => { setShowCreateModal(false); setLaunchResult(null) }}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
              >
                <X size={16} style={{ color: '#6b7280' }} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">
              {/* Template picker */}
              {templates.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <LayoutTemplate size={12} style={{ color: '#a78bfa' }} />
                    <span className="text-xs font-semibold" style={{ color: '#a78bfa' }}>Template</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedTemplateId(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: selectedTemplateId === null ? 'rgba(167,139,250,0.15)' : '#13101e',
                        border: `1px solid ${selectedTemplateId === null ? '#a78bfa' : '#2d2848'}`,
                        color: selectedTemplateId === null ? '#a78bfa' : '#6b7280',
                      }}
                    >
                      {t('projects_no_template')}
                    </button>
                    {templates.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(id => id === tpl.id ? null : tpl.id)}
                        title={tpl.description || tpl.tech_stack || ''}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: selectedTemplateId === tpl.id ? 'rgba(167,139,250,0.15)' : '#13101e',
                          border: `1px solid ${selectedTemplateId === tpl.id ? '#a78bfa' : '#2d2848'}`,
                          color: selectedTemplateId === tpl.id ? '#a78bfa' : '#9ca3af',
                        }}
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                  {selectedTemplateId && (() => {
                    const tpl = templates.find(t => t.id === selectedTemplateId)
                    if (!tpl) return null
                    return (
                      <div className="mt-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)' }}>
                        {tpl.description && <p className="text-xs mb-1" style={{ color: '#c4b5fd' }}>{tpl.description}</p>}
                        {tpl.tech_stack && <p className="text-xs font-mono" style={{ color: '#6b7280' }}>{tpl.tech_stack}</p>}
                      </div>
                    )
                  })()}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#9ca3af' }}>{t('projects_name_label')} <span style={{ color: '#4b5563', fontWeight: 400 }}>{t('projects_name_optional_note')}</span></label>
                <input
                  placeholder={t('projects_name_ph_long')}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white"
                  style={{ background: '#13101e', border: '1px solid #2d2848', outline: 'none' }}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#9ca3af' }}>{t('projects_desc_label')}</label>
                <textarea
                  placeholder={t('projects_desc_ph')}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white resize-none"
                  style={{ background: '#13101e', border: '1px solid #2d2848', outline: 'none', minHeight: 110 }}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  autoFocus
                />
                <p className="text-xs mt-1.5" style={{ color: '#4b5563' }}>{t('projects_secretary_hint')}</p>
              </div>

              {launchResult && (
                <div className="px-3 py-2.5 rounded-lg text-sm" style={{
                  background: launchResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  color: launchResult.ok ? '#22c55e' : '#ef4444',
                  border: `1px solid ${launchResult.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                }}>{launchResult.message}</div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid #2d2848' }}>
              <button
                onClick={() => { setShowCreateModal(false); setLaunchResult(null) }}
                className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                style={{ color: '#6b7280', border: '1px solid #2d2848' }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={launchNewProject}
                disabled={!newDesc.trim() || launching}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: newDesc.trim() && !launching ? '#E8365D' : '#2a1520',
                  color: newDesc.trim() && !launching ? 'white' : '#6b7280',
                  cursor: !newDesc.trim() || launching ? 'not-allowed' : 'pointer',
                }}
              >
                {launching ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} />}
                {launching ? t('projects_launching') : t('projects_launch_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ask Agent Modal ──────────────────────────────────────────────────── */}
      {askModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setAskModal(null)}
        >
          <div
            className="w-full sm:max-w-xl flex flex-col rounded-t-2xl sm:rounded-2xl"
            style={{ background: '#1c1830', border: '1px solid rgba(167,139,250,0.25)', maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #2d2848' }}>
              <MessageSquare size={15} style={{ color: '#a78bfa' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{t('projects_ask_title')}</p>
                <p className="text-xs truncate" style={{ color: '#6b7280' }}>{askModal.name}</p>
              </div>
              {/* Agent selector */}
              <select
                value={askSelectedAgent}
                onChange={e => setAskSelectedAgent(e.target.value)}
                className="text-xs rounded-lg px-2 py-1 max-w-[140px]"
                style={{ background: '#13101e', border: '1px solid #2d2848', color: '#c4bfe8', outline: 'none' }}
              >
                {askAgents.map(a => (
                  <option key={a.id} value={a.id}>
                    {lang === 'EN' && a.name_en ? a.name_en : a.name}
                  </option>
                ))}
              </select>
              {askChat.length > 0 && (
                <button
                  onClick={() => {
                    setAskChat([])
                    fetch(`/api/projects/${askModal.id}/chat`, { method: 'DELETE' }).catch(() => {})
                  }}
                  className="p-1 rounded hover:bg-white/5 transition-colors"
                  title={t('projects_ask_clear')}
                >
                  <Trash size={13} style={{ color: '#4b5563' }} />
                </button>
              )}
              <button onClick={() => setAskModal(null)} className="p-1 rounded hover:bg-white/5">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Chat messages */}
            <div
              ref={askChatRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
              style={{ minHeight: 120, maxHeight: '55vh' }}
            >
              {askChat.length === 0 && !askLoading && (
                <div className="flex flex-col items-center justify-center h-24 gap-2" style={{ color: '#4b5563' }}>
                  <Bot size={24} />
                  <p className="text-xs">{t('projects_ask_title')}</p>
                </div>
              )}
              {askChat.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    style={{
                      background: msg.role === 'user' ? '#2d2848' : (msg.agentColor ? `${msg.agentColor}22` : 'rgba(167,139,250,0.15)'),
                      border: `1px solid ${msg.role === 'user' ? '#3d3860' : (msg.agentColor || 'rgba(167,139,250,0.4)')}`,
                    }}
                  >
                    {msg.role === 'user'
                      ? <User size={11} style={{ color: '#9ca3af' }} />
                      : (msg.agentSprite
                          ? <span style={{ fontSize: 12 }}>{msg.agentSprite}</span>
                          : <Bot size={11} style={{ color: msg.agentColor || '#a78bfa' }} />
                        )
                    }
                  </div>
                  <div className="flex flex-col gap-0.5 max-w-[80%]">
                    <span className="text-xs" style={{ color: '#4b5563' }}>
                      {msg.role === 'user' ? t('projects_ask_you') : (msg.agentName || 'Agent')}
                    </span>
                    <div
                      className="px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap break-words"
                      style={{
                        background: msg.role === 'user' ? '#2d2848' : '#13101e',
                        border: `1px solid ${msg.role === 'user' ? '#3d3860' : '#1a1a2e'}`,
                        color: '#e2e8f0',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              {askLoading && (
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)' }}>
                    <Bot size={11} style={{ color: '#a78bfa' }} />
                  </div>
                  <div className="px-3 py-2 rounded-xl text-xs" style={{ background: '#13101e', border: '1px solid #1a1a2e', color: '#6b7280' }}>
                    <Loader2 size={10} className="animate-spin inline mr-1.5" />
                    {t('projects_ask_thinking')}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={sendAsk}
              className="flex items-end gap-2 px-3 py-3 flex-shrink-0"
              style={{ borderTop: '1px solid #2d2848' }}
            >
              <textarea
                value={askInput}
                onChange={e => setAskInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAsk() }
                }}
                placeholder={t('projects_ask_placeholder')}
                rows={1}
                className="flex-1 rounded-xl px-3 py-2 text-sm text-white resize-none"
                style={{
                  background: '#13101e', border: '1px solid #2d2848', outline: 'none',
                  maxHeight: 100, overflowY: 'auto',
                }}
                disabled={askLoading}
              />
              <button
                type="submit"
                disabled={!askInput.trim() || askLoading || !askSelectedAgent}
                className="flex-shrink-0 p-2 rounded-xl transition-colors"
                style={{
                  background: askInput.trim() && !askLoading ? 'rgba(167,139,250,0.2)' : '#13101e',
                  border: '1px solid rgba(167,139,250,0.3)',
                  color: askInput.trim() && !askLoading ? '#a78bfa' : '#4b5563',
                  cursor: !askInput.trim() || askLoading ? 'not-allowed' : 'pointer',
                }}
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
