'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FolderOpen, Trash2, Settings, X, CheckCircle, Loader2, Circle,
  RefreshCw, Code2, Globe, Database, Play, Square, User,
  RotateCcw, Bug, Zap, ChevronDown, ChevronUp, ExternalLink, Copy, Check,
  Rocket, Wrench, MoreHorizontal, LayoutTemplate,
} from 'lucide-react'
import { useLanguage, type TranslationKey } from '@/lib/i18n'
import { parseDemoAccounts } from '@/lib/parseAccounts'

interface Agent { id: string; name: string; role: string; team: string; sprite: string; model: string }

interface ProjectTemplate {
  id: string
  name: string
  description: string
  tech_stack: string
  tags_json: string
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
  running_agent_name: string | null
  running_agent_sprite: string | null
  running_mission_title: string | null
  running_tasks_deep: number
}

function parseDbCreds(output: string | null): { user: string; pass: string } | null {
  if (!output) return null
  const user = output.match(/(?:POSTGRES_USER|DB_USER(?:NAME)?|DATABASE_USER)\s*[=:]\s*["']?(\w+)["']?/i)?.[1]
  const pass = output.match(/(?:POSTGRES_PASSWORD|DB_PASS(?:WORD)?|DATABASE_PASSWORD)\s*[=:]\s*["']?([^\s"'\n]+)["']?/i)?.[1]
  if (!user && !pass) return null
  return { user: user || '—', pass: pass || '—' }
}

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
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1 rounded transition-colors hover:bg-white/10"
      title="คัดลอก"
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
  const [pathForm, setPathForm] = useState({ work_dir: '', docker_compose_path: '', db_user: '', db_password: '', web_port: '', adminer_port: '' })
  const [saving, setSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({})

  // ── Flow Selector state ─────────────────────────────────────────────────────
  type FlowMode = 'new' | 'fix' | 'quick' | null
  const [flowMode, setFlowMode] = useState<FlowMode>(null)
  const [newDesc, setNewDesc] = useState('')
  const [launching, setLaunching] = useState(false)
  const [launchResult, setLaunchResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [quickAgent, setQuickAgent] = useState('')
  const [quickDesc, setQuickDesc] = useState('')
  const [fixProject, setFixProject] = useState('')
  const [fixDesc, setFixDesc] = useState('')
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  // ────────────────────────────────────────────────────────────────────────────

  const [dockerLog, setDockerLog] = useState<Record<string, string>>({})
  const [dockerRunning, setDockerRunning] = useState<Record<string, boolean>>({})
  const [containerUp, setContainerUp] = useState<Record<string, boolean>>({})
  const [auditRunning, setAuditRunning] = useState<Record<string, boolean>>({})
  const [n2nRunning, setN2nRunning] = useState<Record<string, boolean>>({})
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({})
  const dockerTermRef = useRef<Record<string, HTMLDivElement | null>>({})
  const dockerLock = useRef<Set<string>>(new Set())
  const dockerRunningRef = useRef<Record<string, boolean>>({})
  const { t } = useLanguage()

  async function runDocker(p: Project, cmd: string) {
    if (dockerLock.current.has(p.id)) return
    if (!p.work_dir) { alert('ยังไม่ได้ตั้งค่าโฟลเดอร์โปรเจกต์'); return }
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
    } catch {}
    setLoading(false)
  }, [checkDockerStatus])

  useEffect(() => {
    let alive = true
    const safeRefresh = async () => { if (alive) await fetchProjects() }
    safeRefresh()
    const interval = setInterval(safeRefresh, 5000)
    return () => { alive = false; clearInterval(interval) }
  }, [fetchProjects])

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then((d: Agent[]) => {
      setAgents(d)
      if (d.length > 0 && !quickAgent) setQuickAgent(d[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/project-templates').then(r => r.json()).then((d: ProjectTemplate[]) => {
      setTemplates(d)
    }).catch(() => {})
  }, [])

  const openFlow = (mode: FlowMode) => {
    setFlowMode(f => f === mode ? null : mode)
    setLaunchResult(null)
  }

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
          ...(selectedTemplateId ? {
            template_id: selectedTemplateId,
            template_name: templates.find(t => t.id === selectedTemplateId)?.name,
          } : {}),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setLaunchResult({ ok: true, message: `✅ เริ่มต้นแล้ว! เลขากำลังวิเคราะห์และแบ่งงาน — ดูความคืบหน้าใน Projects` })
        setNewDesc('')
        setTimeout(() => { setFlowMode(null); setLaunchResult(null); fetchProjects() }, 3000)
      } else {
        setLaunchResult({ ok: false, message: data.error || 'เกิดข้อผิดพลาด' })
      }
    } finally { setLaunching(false) }
  }

  const launchQuickTask = async () => {
    if (!quickDesc.trim() || !quickAgent || launching) return
    setLaunching(true)
    setLaunchResult(null)
    try {
      const agent = agents.find(a => a.id === quickAgent)
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quickDesc.trim().slice(0, 80), description: quickDesc.trim(), agent_id: quickAgent, priority: 'normal' }),
      })
      const data = await res.json()
      if (data.id) {
        fetch(`/api/missions/${data.id}/execute`, { method: 'POST' }).catch(() => {})
        setLaunchResult({ ok: true, message: `✅ ส่งงานให้ ${agent?.name || 'agent'} แล้ว — ดูผลใน Missions` })
        setQuickDesc('')
        setTimeout(() => { setFlowMode(null); setLaunchResult(null) }, 3000)
      } else {
        setLaunchResult({ ok: false, message: data.error || 'เกิดข้อผิดพลาด' })
      }
    } finally { setLaunching(false) }
  }

  const launchFix = async () => {
    if (!fixDesc.trim() || !fixProject || launching) return
    setLaunching(true)
    setLaunchResult(null)
    try {
      const proj = projects.find(p => p.id === fixProject)
      const context = proj?.work_dir ? `\n\nProject: ${proj.name}\nWork Dir: ${proj.work_dir}\n` : ''
      // Find a coder/tech agent as default for fix tasks
      const coder = agents.find(a => a.team === 'TECH') || agents[0]
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[Fix] ${fixDesc.trim().slice(0, 60)}`,
          description: `${fixDesc.trim()}${context}`,
          agent_id: coder?.id || '',
          priority: 'high',
        }),
      })
      const data = await res.json()
      if (data.id) {
        fetch(`/api/missions/${data.id}/execute`, { method: 'POST' }).catch(() => {})
        setLaunchResult({ ok: true, message: `✅ ส่งงานแก้ไขแล้ว — ดูผลใน Missions` })
        setFixDesc('')
        setFixProject('')
        setTimeout(() => { setFlowMode(null); setLaunchResult(null) }, 3000)
      } else {
        setLaunchResult({ ok: false, message: data.error || 'เกิดข้อผิดพลาด' })
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
    setActionMsg(s => ({ ...s, [p.id]: 'กำลังตรวจสอบโค้ด...' }))
    try {
      const result = await createAndExecute(p.id, `/api/projects/${p.id}/audit`, {}, setAuditRunning, '')
      if (result.ok) {
        setActionMsg(s => ({ ...s, [p.id]: '✅ AI กำลังตรวจสอบโค้ด' }))
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
    setActionMsg(s => ({ ...s, [p.id]: 'AI กำลังวิเคราะห์ปัญหา...' }))
    try {
      const result = await createAndExecute(p.id, `/api/projects/${p.id}/n2n`, {}, setN2nRunning, '')
      if (result.ok) {
        setActionMsg(s => ({ ...s, [p.id]: '✅ AI กำลังแก้ไขให้อัตโนมัติ' }))
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
    setPathModal(p)
    setPathForm({
      work_dir: p.work_dir || '',
      docker_compose_path: p.docker_compose_path || '',
      db_user: p.db_user || '',
      db_password: p.db_password || '',
      web_port: p.web_port ? String(p.web_port) : '',
      adminer_port: p.adminer_port ? String(p.adminer_port) : '',
    })
  }

  async function savePath() {
    if (!pathModal) return
    setSaving(true)
    await fetch(`/api/projects/${pathModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...pathForm,
        db_user: pathForm.db_user || null,
        db_password: pathForm.db_password || null,
        web_port: pathForm.web_port ? Number(pathForm.web_port) : null,
        adminer_port: pathForm.adminer_port ? Number(pathForm.adminer_port) : null,
      }),
    })
    setSaving(false)
    setPathModal(null)
    fetchProjects()
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
        <button
          onClick={fetchProjects}
          className="p-2 rounded-lg transition-colors hover:bg-white/5 shrink-0"
          style={{ border: '1px solid #2d2848', color: '#6b7280' }}
          title="รีเฟรช"
        >
          <RefreshCw size={15} />
        </button>
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

      {/* ── Create panel ─────────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#1c1830', border: '1px solid #2d2848' }}>
        <div className="px-4 pt-4 pb-1 flex items-center gap-2">
          <Rocket size={14} style={{ color: '#E8365D' }} />
          <span className="text-sm font-bold text-white">สร้าง Project ใหม่</span>
        </div>
        <div className="p-4 space-y-3">
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
                  ไม่ใช้ template
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
              {/* Selected template info */}
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
          <textarea
            placeholder="เช่น: ระบบจองห้องประชุมออนไลน์ สำหรับพนักงาน 500 คน มี login, จอง, approve, และ dashboard แสดงสถิติการใช้งาน"
            className="w-full rounded-lg px-3 py-2.5 text-sm text-white resize-none"
            style={{ background: '#13101e', border: '1px solid #2d2848', outline: 'none', minHeight: 96 }}
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs" style={{ color: '#4b5563' }}>Secretary จะวางแผนและแบ่งงานให้ทีมอัตโนมัติ</span>
            <button
              onClick={launchNewProject}
              disabled={!newDesc.trim() || launching}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold flex-shrink-0 transition-all"
              style={{
                background: newDesc.trim() && !launching ? '#E8365D' : '#2a1520',
                color: newDesc.trim() && !launching ? 'white' : '#6b7280',
                cursor: !newDesc.trim() || launching ? 'not-allowed' : 'pointer',
              }}
            >
              {launching ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} />}
              {launching ? 'กำลังสร้าง...' : 'เริ่มต้น'}
            </button>
          </div>
          {launchResult && (
            <div className="px-3 py-2 rounded-lg text-sm" style={{
              background: launchResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              color: launchResult.ok ? '#22c55e' : '#ef4444',
              border: `1px solid ${launchResult.ok ? '#22c55e30' : '#ef444430'}`,
            }}>{launchResult.message}</div>
          )}
        </div>
      </div>

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
            onClick={() => openFlow('new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#E8365D', color: 'white' }}
          >
            <Rocket size={14} />
            สร้าง Project แรก
          </button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
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
                  borderLeft: `4px solid ${borderColor}`,
                }}
              >
                {/* Live activity strip — shown when in progress */}
                {(p.running_tasks_deep > 0 || p.running_tasks > 0 || p.mission_status === 'running') && (
                  <div
                    className="relative overflow-hidden flex items-center gap-2 px-3 py-1.5"
                    style={{ background: 'rgba(96,165,250,0.06)', borderBottom: '1px solid rgba(96,165,250,0.15)' }}
                  >
                    {/* shimmer sweep */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(96,165,250,0.08) 50%, transparent 100%)',
                        animation: 'agent-card-shimmer 2s ease-in-out infinite',
                        width: '30%',
                      }}
                    />
                    {/* pulse dot */}
                    <span
                      className="flex-shrink-0 rounded-full"
                      style={{ width: 6, height: 6, background: '#60a5fa', boxShadow: '0 0 6px #60a5fa', animation: 'agent-border-breathe 1s ease-in-out infinite' }}
                    />
                    {/* agent info */}
                    {p.running_agent_sprite && (
                      <span style={{ fontSize: 12, lineHeight: 1 }}>{p.running_agent_sprite}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {p.running_agent_name && (
                          <span className="font-orbitron flex-shrink-0 text-xs font-bold" style={{ fontSize: 9, color: '#93c5fd', letterSpacing: '0.06em' }}>
                            {p.running_agent_name}
                          </span>
                        )}
                        {p.running_mission_title && (
                          <>
                            <span style={{ color: '#374151', fontSize: 9 }}>›</span>
                            <span
                              className="text-xs truncate"
                              style={{ fontSize: 9, color: '#4b5563', fontFamily: 'monospace' }}
                            >
                              {p.running_mission_title.replace(/^\[.*?\]\s*/, '')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="font-orbitron flex-shrink-0" style={{ fontSize: 8, color: '#2563eb', letterSpacing: '0.08em' }}>
                      {p.running_tasks_deep || p.running_tasks} RUNNING
                    </span>
                  </div>
                )}

                {/* Card body */}
                <div className="p-4 flex flex-col gap-3 flex-1">

                  {/* Top row: status badge + date */}
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0"
                      style={{ background: status.bg, color: status.color }}
                    >
                      {status.icon} {status.label}
                      {p.stuck === 1 && (
                        <span className="animate-pulse" style={{ color: '#f59e0b', fontSize: '10px' }}>fixing…</span>
                      )}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: '#4b5563' }}>
                      {new Date(p.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </span>
                  </div>

                  {/* Project name */}
                  <div>
                    {p.template_name && (
                      <div className="flex items-center gap-1 mb-1">
                        <LayoutTemplate size={11} style={{ color: '#a78bfa' }} />
                        <span className="text-xs font-medium" style={{ color: '#a78bfa' }}>{p.template_name}</span>
                      </div>
                    )}
                    <h2
                      className="font-bold text-white leading-snug"
                      style={{
                        fontSize: '15px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {p.name}
                    </h2>
                  </div>

                  {/* Progress bar — only while building */}
                  {p.task_count > 0 && !isComplete && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs" style={{ color: '#6b7280' }}>{t('projects_progress')}</span>
                        <span className="text-xs font-bold" style={{ color: status.color }}>{progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#2d2848' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%`, background: status.color }}
                        />
                      </div>
                      <div className="flex gap-3 mt-1 text-xs" style={{ color: '#4b5563' }}>
                        {p.completed_tasks > 0 && <span style={{ color: '#22c55e' }}>{p.completed_tasks} {t('filter_done')}</span>}
                        {p.running_tasks > 0 && <span style={{ color: '#60a5fa' }}>{p.running_tasks} {t('filter_running')}</span>}
                        {p.failed_tasks > 0 && <span style={{ color: '#ef4444' }}>{p.failed_tasks} {t('filter_failed')}</span>}
                      </div>
                    </div>
                  )}

                  {/* Open Web + DB buttons */}
                  {(ports.web || ports.api || ports.adminer) && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-1.5">
                        {ports.web && (
                          <a
                            href={`http://localhost:${ports.web}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-125 active:scale-95"
                            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }}
                          >
                            <Globe size={13} />
                            Frontend
                            <ExternalLink size={10} style={{ opacity: 0.55 }} />
                          </a>
                        )}
                        {ports.api ? (
                          <a
                            href={`http://localhost:${ports.api}/admin`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-125 active:scale-95"
                            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}
                          >
                            <Code2 size={13} />
                            Admin
                            <ExternalLink size={10} style={{ opacity: 0.55 }} />
                          </a>
                        ) : ports.web ? (
                          <a
                            href={`http://localhost:${ports.web}/admin`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-125 active:scale-95"
                            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}
                          >
                            <Code2 size={13} />
                            Admin
                            <ExternalLink size={10} style={{ opacity: 0.55 }} />
                          </a>
                        ) : null}
                        {ports.adminer && (
                          <a
                            href={`http://localhost:${ports.adminer}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-125 active:scale-95"
                            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: '#a855f7' }}
                            title={`จัดการฐานข้อมูล — localhost:${ports.adminer}`}
                          >
                            <Database size={13} />
                            DB
                            <ExternalLink size={10} style={{ opacity: 0.55 }} />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Demo accounts */}
                  {accounts.length > 0 && (
                    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1a2234' }}>
                      <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: '#13101e', borderBottom: '1px solid #1a2234' }}>
                        <User size={12} style={{ color: '#60a5fa' }} />
                        <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>บัญชีสำหรับเข้าใช้งาน</span>
                      </div>
                      {accounts.map((a, i) => (
                        <div
                          key={i}
                          className="px-3 py-2 flex items-center gap-3"
                          style={{
                            background: i % 2 === 0 ? '#0d0b14' : 'rgba(13,11,20,0.5)',
                            borderTop: i > 0 ? '1px solid #0f1520' : undefined,
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold mb-0.5" style={{ color: a.role.toLowerCase().includes('admin') ? '#f59e0b' : '#94a3b8' }}>
                              {a.role}
                            </div>
                            <div className="text-xs font-mono truncate" style={{ color: '#cbd5e1' }}>{a.email}</div>
                          </div>
                          <div className="flex items-center gap-1 rounded-md px-2 py-0.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            <span className="text-xs font-mono" style={{ color: '#6b7280' }}>{a.password}</span>
                            <CopyButton text={a.password} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No accounts buttons — only show when project is complete */}
                  {accounts.length === 0 && isComplete && (
                    <div className="flex flex-col gap-1.5">
                      {p.integration_output && (
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/projects/${p.id}`, {
                              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ rescan_accounts: true }),
                            })
                            const data = await res.json()
                            if (data.accounts?.length > 0 || data.web_port) fetchProjects()
                            else alert('ไม่พบข้อมูลบัญชี — ลองกด "สร้างบัญชีทดสอบ" แทน')
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all"
                          style={{ background: '#1c1830', border: '1px solid rgba(42,22,34,0.5)', color: '#6b7280' }}
                        >
                          <User size={13} />
                          ค้นหาบัญชีที่มีอยู่
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (!confirm('ให้ AI สร้างบัญชีทดสอบสำหรับโปรเจกต์นี้?')) return
                          await fetch('/api/missions', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              title: `[SEED] บัญชีทดสอบ — ${p.name}`,
                              description: `สร้างบัญชีทดสอบสำหรับโปรเจกต์ ${p.name}\nWork Dir: \`${p.work_dir}\`\nDocker Compose: \`${p.docker_compose_path || (p.work_dir + '/docker-compose.yml')}\`\n\n1. ตรวจสอบว่า containers รันอยู่\n2. สร้าง demo accounts ใน database\n3. ทดสอบ login ด้วย curl\n4. Output:\n\`\`\`\n---ACCESS-INFO---\n{"demo_accounts":[{"role":"Admin","email":"admin@demo.com","password":"demo1234"},{"role":"User","email":"user@demo.com","password":"demo1234"}]}\n---END---\n\`\`\``,
                              priority: 'high', parent_mission_id: p.mission_id, phase: 4,
                            }),
                          })
                          alert('AI กำลังสร้างบัญชีให้ — ดูความคืบหน้าที่หน้า "งานทั้งหมด"')
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all"
                        style={{ background: 'rgba(99,92,138,0.08)', border: '1px solid rgba(99,92,138,0.3)', color: '#c4bfe8' }}
                      >
                        <User size={13} />
                        สร้างบัญชีทดสอบ
                      </button>
                    </div>
                  )}

                  {/* Auto-Fix button — show directly when there are failed tasks */}
                  {p.failed_tasks > 0 && p.running_tasks === 0 && (
                    <button
                      onClick={() => handleN2n(p)}
                      disabled={!!n2nRunning[p.id]}
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: n2nRunning[p.id] ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.35)',
                        color: '#f87171',
                        cursor: n2nRunning[p.id] ? 'not-allowed' : 'pointer',
                        opacity: n2nRunning[p.id] ? 0.6 : 1,
                      }}
                    >
                      {n2nRunning[p.id]
                        ? <><Loader2 size={12} className="animate-spin" /> AI กำลังวิเคราะห์และแก้ไข…</>
                        : <><Wrench size={12} /> Auto-Fix {p.failed_tasks} งานที่ล้มเหลว</>
                      }
                    </button>
                  )}

                  {/* Action status message */}
                  {actionMsg[p.id] && (
                    <div
                      className="px-3 py-2 rounded-lg text-xs text-center"
                      style={{
                        background: '#0d0b14',
                        border: '1px solid #2A1622',
                        color: actionMsg[p.id].startsWith('✅') ? '#22c55e' : actionMsg[p.id].startsWith('❌') ? '#ef4444' : '#94a3b8',
                      }}
                    >
                      {actionMsg[p.id]}
                    </div>
                  )}

                  {/* ── Footer ──────────────────────────────────────────────── */}
                  <div className="mt-auto" style={{ borderTop: '1px solid #2d2848', paddingTop: '10px' }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1.5">
                        <a
                          href={`/projects/${p.id}`}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          style={{ background: 'rgba(99,92,138,0.12)', border: '1px solid rgba(99,92,138,0.25)', color: '#c4bfe8' }}
                          title="ดูและแก้ไขโค้ด"
                        >
                          <Code2 size={12} />
                          {t('ide')}
                        </a>
                        <button
                          onClick={() => handleSetPath(p)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/5"
                          style={{ color: '#6b7280', border: '1px solid #2d2848' }}
                          title="ตั้งค่า path และ port"
                        >
                          <Settings size={12} />
                          ตั้งค่า
                        </button>
                      </div>
                      <button
                        onClick={() => setShowAdvanced(s => ({ ...s, [p.id]: !s[p.id] }))}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/5"
                        style={{
                          color: isAdvanced ? '#e5e7eb' : '#4b5563',
                          border: isAdvanced ? '1px solid #2d2848' : '1px solid transparent',
                        }}
                      >
                        <MoreHorizontal size={13} />
                        More
                        {isAdvanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                    </div>

                    {/* Advanced section */}
                    {isAdvanced && (
                      <div className="mt-3 space-y-3 rounded-lg p-3" style={{ background: '#13101e', border: '1px solid #2d2848' }}>

                        {/* AI tools */}
                        <div>
                          <p className="text-xs mb-2" style={{ color: '#4b5563' }}>เครื่องมือ AI</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAudit(p)}
                              disabled={!!auditRunning[p.id]}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-1 justify-center"
                              style={{
                                background: '#1a0d00', border: '1px solid rgba(249,115,22,0.67)', color: '#fb923c',
                                cursor: auditRunning[p.id] ? 'not-allowed' : 'pointer',
                                opacity: auditRunning[p.id] ? 0.5 : 1,
                              }}
                            >
                              {auditRunning[p.id] ? <Loader2 size={11} className="animate-spin" /> : <Bug size={11} />}
                              ตรวจสอบโค้ด
                            </button>
                            <button
                              onClick={() => handleN2n(p)}
                              disabled={!!n2nRunning[p.id]}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-1 justify-center"
                              style={{
                                background: '#001a1a', border: '1px solid rgba(6,182,212,0.67)', color: '#22d3ee',
                                cursor: n2nRunning[p.id] ? 'not-allowed' : 'pointer',
                                opacity: n2nRunning[p.id] ? 0.5 : 1,
                              }}
                            >
                              {n2nRunning[p.id] ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                              แก้ไขอัตโนมัติ
                            </button>
                          </div>
                        </div>

                        {/* Docker controls */}
                        {p.docker_compose_path && (
                          <div>
                            <p className="text-xs mb-2" style={{ color: '#4b5563' }}>Docker</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => { const f = p.docker_compose_path ? `-f "${p.docker_compose_path}"` : ''; runDocker(p, `docker compose ${f} up --build -d`) }}
                                disabled={isBusy || isUp}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-1 justify-center"
                                style={{
                                  background: isBusy || isUp ? '#0a1a0a' : '#003d1a',
                                  border: '1px solid rgba(0,200,83,0.25)',
                                  color: isBusy || isUp ? '#374151' : '#00c853',
                                  cursor: (isBusy || isUp) ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {isBusy && !isUp ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                                {isUp ? 'รันอยู่' : 'เริ่มต้น'}
                              </button>
                              <button
                                onClick={() => { const f = p.docker_compose_path ? `-f "${p.docker_compose_path}"` : ''; runDocker(p, `docker compose ${f} restart`) }}
                                disabled={!isUp || isBusy}
                                title="รีสตาร์ท"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold justify-center"
                                style={{
                                  background: !isUp ? '#0a0a0a' : '#0d1a2e',
                                  border: '1px solid rgba(59,130,246,0.25)',
                                  color: !isUp ? '#374151' : '#3b82f6',
                                  cursor: (!isUp || isBusy) ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {isBusy && isUp ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                              </button>
                              <button
                                onClick={() => stopDocker(p)}
                                disabled={!isUp && !isBusy}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-1 justify-center"
                                style={{
                                  background: !isUp && !isBusy ? '#0a0a0a' : '#1a0a0a',
                                  border: '1px solid rgba(239,68,68,0.25)',
                                  color: !isUp && !isBusy ? '#374151' : '#ef4444',
                                  cursor: (!isUp && !isBusy) ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {isBusy && isUp ? <Loader2 size={11} className="animate-spin" /> : <Square size={11} />}
                                หยุด
                              </button>
                            </div>
                            {dockerLog[p.id] && (
                              <div
                                ref={el => { dockerTermRef.current[p.id] = el }}
                                className="mt-2 rounded-lg p-2 overflow-y-auto"
                                style={{
                                  background: '#0d0b14', border: '1px solid #0f1a25',
                                  fontFamily: 'monospace', fontSize: '10px', color: '#4ade80',
                                  maxHeight: 120, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                }}
                              >
                                {dockerLog[p.id]}
                                {dockerRunning[p.id] && (
                                  <span className="inline-block w-2 h-3 ml-0.5 animate-pulse" style={{ background: '#4ade80' }} />
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Path info */}
                        <div>
                          {p.work_dir ? (
                            <div className="flex items-center gap-1.5 text-xs truncate" style={{ color: '#4b5563' }}>
                              <CheckCircle size={10} style={{ color: '#16a34a', flexShrink: 0 }} />
                              <span className="font-mono truncate" title={p.work_dir}>{p.work_dir}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#4b5563' }}>
                              <Circle size={10} style={{ flexShrink: 0 }} />
                              <span className="italic">ยังไม่ได้ตั้งค่าโฟลเดอร์</span>
                            </div>
                          )}
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={isDeleting}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm justify-center transition-colors"
                          style={{ background: '#1a0a0a', border: '1px solid #3a1515', color: isDeleting ? '#6b7280' : '#ff4d4f' }}
                        >
                          {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          {isDeleting ? 'กำลังลบ...' : 'ลบโปรเจกต์นี้'}
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
                    <label className="text-xs text-gray-500 block mb-1">เว็บไซต์ (App Port)</label>
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
                    <label className="text-xs text-gray-500 block mb-1">จัดการ DB (CloudBeaver)</label>
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
                <p className="text-sm font-medium text-gray-400 mb-3">ข้อมูลฐานข้อมูล</p>
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
    </div>
  )
}
