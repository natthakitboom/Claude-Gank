'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FolderOpen, Trash2, Settings, X, CheckCircle, Loader2, Circle, RefreshCw, GitBranch, Code2, Globe, Cpu, Database, Play, Square, ChevronDown, ChevronUp, User, Terminal, RotateCcw } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { parseDemoAccounts } from '@/lib/parseAccounts'

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
  stuck: number // 1 = has orphaned waiting phase, 0 = ok
}


// Parse DB credentials from integration output (fallback when not stored in DB)
function parseDbCreds(output: string | null): { user: string; pass: string } | null {
  if (!output) return null
  const user = output.match(/(?:POSTGRES_USER|DB_USER(?:NAME)?|DATABASE_USER)\s*[=:]\s*["']?(\w+)["']?/i)?.[1]
  const pass = output.match(/(?:POSTGRES_PASSWORD|DB_PASS(?:WORD)?|DATABASE_PASSWORD)\s*[=:]\s*["']?([^\s"'\n]+)["']?/i)?.[1]
  if (!user && !pass) return null
  return { user: user || '—', pass: pass || '—' }
}

function statusColor(p: Project) {
  if (p.running_tasks > 0) return '#00e5ff'
  if (p.failed_tasks > 0 && p.completed_tasks < p.task_count) return '#ff4d4f'
  if (p.task_count > 0 && p.completed_tasks === p.task_count) return '#22c55e'
  return '#6b7280'
}

function statusLabel(p: Project) {
  if (p.running_tasks > 0) return 'RUNNING'
  if (p.task_count === 0) return 'PENDING'
  if (p.completed_tasks === p.task_count) return 'COMPLETE'
  if (p.failed_tasks > 0) return 'PARTIAL'
  return 'IN PROGRESS'
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteLog, setDeleteLog] = useState<{ id: string; log: string[] } | null>(null)
  const [pathModal, setPathModal] = useState<Project | null>(null)
  const [pathForm, setPathForm] = useState({ work_dir: '', docker_compose_path: '', db_user: '', db_password: '', web_port: '', adminer_port: '' })
  const [saving, setSaving] = useState(false)
  const [showDemo, setShowDemo] = useState<Record<string, boolean>>({})
  const [dockerLog, setDockerLog] = useState<Record<string, string>>({})
  const [dockerRunning, setDockerRunning] = useState<Record<string, boolean>>({}) // CLI stream กำลังทำงาน
  const [containerUp, setContainerUp] = useState<Record<string, boolean>>({})    // containers ยัง up อยู่
  const dockerTermRef = useRef<Record<string, HTMLDivElement | null>>({})
  const dockerLock = useRef<Set<string>>(new Set()) // prevent double-click before re-render
  const dockerRunningRef = useRef<Record<string, boolean>>({}) // live mirror of dockerRunning for callbacks
  const { t } = useLanguage()

  async function runDocker(p: Project, cmd: string) {
    if (dockerLock.current.has(p.id)) return   // guard against double-click before re-render
    if (!p.work_dir) { alert('ยังไม่ได้ตั้งค่า work_dir'); return }
    dockerLock.current.add(p.id)
    dockerRunningRef.current[p.id] = true
    setDockerRunning(r => ({ ...r, [p.id]: true }))
    setDockerLog(l => ({ ...l, [p.id]: `$ ${cmd}\n` }))

    const isUp = cmd.includes('up')
    const isDown = cmd.includes('down')

    try {
      const res = await fetch(`/api/projects/${p.id}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
                setTimeout(() => {
                  const el = dockerTermRef.current[p.id]
                  if (el) el.scrollTop = el.scrollHeight
                }, 30)
                return next
              })
            } catch {}
          }
        }
      }
      // update containerUp after command completes successfully
      if (isUp) setContainerUp(s => ({ ...s, [p.id]: true }))
      if (isDown) setContainerUp(s => ({ ...s, [p.id]: false }))
    } catch (e: any) {
      setDockerLog(l => ({ ...l, [p.id]: (l[p.id] || '') + '\n[error: ' + e.message + ']\n' }))
    } finally {
      dockerLock.current.delete(p.id)
      dockerRunningRef.current[p.id] = false
      setDockerRunning(r => ({ ...r, [p.id]: false }))
    }
  }

  async function stopDocker(p: Project) {
    if (!p.work_dir || !p.docker_compose_path) return
    const f = `-f "${p.docker_compose_path}"`
    // use `stop -t 3` — force kill after 3s grace, faster than `down`, keeps volumes intact
    await runDocker(p, `docker compose ${f} stop -t 3`)
    // re-verify actual status via lightweight GET (does NOT kill any running process)
    setTimeout(() => checkDockerStatus(p), 800)
  }

  // Check actual docker container status — uses dedicated GET endpoint (non-destructive,
  // never kills a running exec stream unlike the POST /exec route).
  const checkDockerStatus = useCallback(async (p: Project) => {
    // skip if no compose file, or if a docker command is actively running
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
      // check real docker status for all projects after fetching
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

  async function handleDelete(p: Project) {
    if (!confirm(`ลบ project "${p.name}" ?\n\nจะลบ:\n- Docker containers + volumes\n- ไฟล์ทั้งหมดใน ${p.work_dir || '(ไม่ได้ตั้งค่า)'}\n- Missions ทั้งหมด\n\nไม่สามารถกู้คืนได้`)) return
    setDeletingId(p.id)
    try {
      const res = await fetch(`/api/projects/${p.id}`, { method: 'DELETE' })
      const data = await res.json()
      setDeleteLog({ id: p.id, log: data.log || [] })
      fetchProjects()
    } catch (e: any) {
      alert('Error: ' + e.message)
    }
    setDeletingId(null)
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

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-xl font-bold text-white">{t('projects_title')}</h1>
          <p className="text-xs mt-1" style={{ color: '#4a5568', fontFamily: 'monospace' }}>
            {t('projects_subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProjects}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors"
            style={{ background: '#0d1117', border: '1px solid #1a2535', color: '#6b7280' }}
          >
            <RefreshCw size={12} />
          </button>
          <a
            href="/missions"
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
            style={{ background: '#0d1117', border: '1px solid #1a2535', color: '#00e5ff' }}
          >
            <GitBranch size={12} />
            DEPLOY TO TEAM
          </a>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: t('total'), value: projects.length },
          { label: t('active'), value: projects.filter(p => p.running_tasks > 0).length },
          { label: t('status_complete'), value: projects.filter(p => p.task_count > 0 && p.completed_tasks === p.task_count).length },
          { label: t('with_files'), value: projects.filter(p => p.work_dir).length },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: '#0d1117', border: '1px solid #111820' }}>
            <div className="font-orbitron text-lg font-bold text-white">{s.value}</div>
            <div className="font-orbitron text-gray-600 mt-0.5" style={{ fontSize: '9px', letterSpacing: '0.1em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Delete log */}
      {deleteLog && (
        <div className="rounded-lg p-4" style={{ background: '#0a0e14', border: '1px solid #1a2535' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-orbitron text-xs text-green-400">// CLEANUP LOG</span>
            <button onClick={() => setDeleteLog(null)}><X size={14} className="text-gray-500" /></button>
          </div>
          {deleteLog.log.map((line, i) => (
            <div key={i} className="font-mono text-xs text-gray-400 py-0.5">{'> '}{line}</div>
          ))}
        </div>
      )}

      {/* Projects grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gray-600" size={24} />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-orbitron text-xs">{t('no_projects')}</p>
          <p className="text-xs mt-2 text-gray-500">Projects จะสร้างอัตโนมัติเมื่อกด <span style={{ color: '#00e5ff' }}>🏢 DEPLOY TO TEAM</span> ใน Missions</p>
          <a
            href="/missions"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded text-xs font-semibold"
            style={{ background: '#0d1117', border: '1px solid #1a2535', color: '#00e5ff' }}
          >
            <GitBranch size={12} />
            ไปที่ Missions
          </a>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {projects.map(p => {
            const color = statusColor(p)
            const label = statusLabel(p)
            const progress = p.task_count > 0 ? Math.round((p.completed_tasks / p.task_count) * 100) : 0
            const isDeleting = deletingId === p.id

            return (
              <div
                key={p.id}
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: '#0d1117', border: `1px solid #111820` }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                    />
                    <div className="min-w-0">
                      <a
                        href={`/projects/${p.id}`}
                        className="font-orbitron text-sm font-bold text-white truncate block hover:text-cyan-400 transition-colors"
                        title="เปิด IDE"
                      >
                        {p.name}
                      </a>
                      {p.description && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">{p.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="font-orbitron text-xs px-2 py-0.5 rounded flex-shrink-0"
                      style={{ background: `${color}20`, color, border: `1px solid ${color}40`, fontSize: '9px' }}
                    >
                      {label}
                    </span>
                    {p.stuck === 1 && (
                      <span
                        className="font-orbitron px-2 py-0.5 rounded flex-shrink-0 animate-pulse"
                        style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)', fontSize: '8px', letterSpacing: '0.05em' }}
                        title="Phase ค้างอยู่ — ระบบกำลัง auto-rescue"
                      >
                        ⚠️ STUCK — AUTO-FIXING...
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {p.task_count > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1" style={{ fontSize: '10px' }}>
                      <span>{p.completed_tasks}/{p.task_count} tasks</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a2535' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progress}%`, background: color }}
                      />
                    </div>
                    <div className="flex gap-3 mt-1.5" style={{ fontSize: '10px' }}>
                      {p.completed_tasks > 0 && <span className="text-green-500">{p.completed_tasks} done</span>}
                      {p.running_tasks > 0 && <span style={{ color: '#00e5ff' }}>{p.running_tasks} running</span>}
                      {p.failed_tasks > 0 && <span className="text-red-400">{p.failed_tasks} failed</span>}
                    </div>
                  </div>
                )}

                {/* Access Info */}
                {(() => {
                  const creds = p.db_user || p.db_password ? { user: p.db_user, pass: p.db_password } : parseDbCreds(p.integration_output)
                  const rows = [
                    { label: 'App', value: p.web_port ? `http://localhost:${p.web_port}` : null, isLink: true, color: '#00c853' },
                    { label: 'DB Admin', value: (p.adminer_port || p.db_port) ? `http://localhost:${p.adminer_port || p.db_port}` : null, isLink: true, color: '#a855f7' },
                    { label: 'DB Username', value: creds?.user ?? null, isLink: false, color: '#94a3b8' },
                    { label: 'Pass', value: creds?.pass ?? null, isLink: false, color: '#64748b' },
                  ]
                  const hasAny = rows.some(r => r.value)
                  if (!hasAny) return null
                  return (
                    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #0f1a25' }}>
                      <div className="px-3 py-1" style={{ background: '#090c14', borderBottom: '1px solid #0f1a25' }}>
                        <span className="font-orbitron" style={{ fontSize: '8px', color: '#1f2937', letterSpacing: '0.12em' }}>ACCESS INFO</span>
                      </div>
                      {rows.map(row => (
                        <div key={row.label} className="flex items-center justify-between px-3 py-1.5" style={{ borderTop: '1px solid #0a0d14', background: '#070a0f' }}>
                          <span className="font-orbitron" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.06em', minWidth: 72 }}>{row.label}</span>
                          {row.value ? (
                            row.isLink ? (
                              <a href={row.value} target="_blank" rel="noopener noreferrer"
                                className="font-mono text-xs hover:underline truncate ml-2"
                                style={{ color: row.color, maxWidth: 180 }}>
                                {row.value}
                              </a>
                            ) : (
                              <span className="font-mono text-xs truncate ml-2" style={{ color: row.color }}>{row.value}</span>
                            )
                          ) : (
                            <span className="font-mono text-xs" style={{ color: '#1f2937' }}>—</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* File paths */}
                <div className="space-y-1">
                  {p.work_dir ? (
                    <div className="flex items-center gap-1.5 font-mono text-xs text-gray-500 truncate">
                      <CheckCircle size={10} className="text-green-500 flex-shrink-0" />
                      <span className="truncate" title={p.work_dir}>{p.work_dir}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 font-mono text-xs text-gray-600">
                      <Circle size={10} className="flex-shrink-0" />
                      <span className="italic">ยังไม่ได้ตั้งค่า work dir</span>
                    </div>
                  )}
                  {p.docker_compose_path ? (
                    <div className="flex items-center gap-1.5 font-mono text-xs text-gray-500 truncate">
                      <CheckCircle size={10} className="text-blue-400 flex-shrink-0" />
                      <span className="truncate" title={p.docker_compose_path}>{p.docker_compose_path.split('/').pop()}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 font-mono text-xs text-gray-600">
                      <Circle size={10} className="flex-shrink-0" />
                      <span className="italic">ยังไม่ได้ตั้งค่า docker-compose</span>
                    </div>
                  )}
                </div>

                {/* Quick-launch buttons: WEB / API / DB */}
                {(p.web_port || p.api_port || p.adminer_port) && (
                  <div className="flex gap-2 flex-wrap">
                    {p.web_port && (
                      <a
                        href={`http://localhost:${p.web_port}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all hover:scale-105"
                        style={{ background: '#003320', border: '1px solid #00c85340', color: '#00c853' }}
                        title={`Web — localhost:${p.web_port}`}
                      >
                        <Globe size={11} />
                        WEB :{p.web_port}
                      </a>
                    )}
                    {p.api_port && (
                      <a
                        href={`http://localhost:${p.api_port}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all hover:scale-105"
                        style={{ background: '#1a1400', border: '1px solid #f59e0b40', color: '#f59e0b' }}
                        title={`API — localhost:${p.api_port}`}
                      >
                        <Cpu size={11} />
                        API :{p.api_port}
                      </a>
                    )}
                    {p.adminer_port && (
                      <a
                        href={`http://localhost:${p.adminer_port}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all hover:scale-105"
                        style={{ background: '#0d0030', border: '1px solid #a855f740', color: '#a855f7' }}
                        title={`CloudBeaver — localhost:${p.adminer_port}`}
                      >
                        <Database size={11} />
                        DB :{p.adminer_port}
                      </a>
                    )}
                  </div>
                )}

                {/* Docker Controls */}
                {p.docker_compose_path && (
                  <div className="space-y-2">
                    {(() => {
                      const isBusy    = !!dockerRunning[p.id]
                      const isUp      = !!containerUp[p.id]
                      const canBuild  = !isBusy && !isUp
                      const canStop   = isUp || isBusy
                      const canRestart = isUp && !isBusy
                      return (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const f = p.docker_compose_path ? `-f "${p.docker_compose_path}"` : ''
                              runDocker(p, `docker compose ${f} up --build -d`)
                            }}
                            disabled={!canBuild}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all hover:scale-105 flex-1 justify-center"
                            style={{
                              background: canBuild ? '#003d1a' : '#0a1a0a',
                              border: '1px solid #00c85340',
                              color: canBuild ? '#00c853' : '#374151',
                              cursor: canBuild ? 'pointer' : 'not-allowed',
                            }}
                          >
                            {isBusy && !isUp ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                            {isUp ? 'RUNNING' : 'BUILD & START'}
                          </button>
                          {/* RESTART — only active when containers are up */}
                          <button
                            onClick={() => {
                              const f = p.docker_compose_path ? `-f "${p.docker_compose_path}"` : ''
                              runDocker(p, `docker compose ${f} restart`)
                            }}
                            disabled={!canRestart}
                            title="Restart containers (no rebuild)"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all hover:scale-105 justify-center"
                            style={{
                              background: canRestart ? '#0d1a2e' : '#0a0a0a',
                              border: '1px solid #3b82f640',
                              color: canRestart ? '#3b82f6' : '#374151',
                              cursor: canRestart ? 'pointer' : 'not-allowed',
                            }}
                          >
                            {isBusy && isUp ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                          </button>
                          <button
                            onClick={() => stopDocker(p)}
                            disabled={!canStop}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all hover:scale-105 flex-1 justify-center"
                            style={{
                              background: canStop ? '#1a0a0a' : '#0a0a0a',
                              border: '1px solid #ef444440',
                              color: canStop ? '#ef4444' : '#374151',
                              cursor: canStop ? 'pointer' : 'not-allowed',
                            }}
                          >
                            {isBusy && isUp ? <Loader2 size={11} className="animate-spin" /> : <Square size={11} />}
                            STOP
                          </button>
                        </div>
                      )
                    })()}
                    {/* Docker terminal output */}
                    {dockerLog[p.id] && (
                      <div
                        ref={el => { dockerTermRef.current[p.id] = el }}
                        className="rounded p-2 overflow-y-auto"
                        style={{
                          background: '#030506',
                          border: '1px solid #0f1a25',
                          fontFamily: 'monospace',
                          fontSize: '10px',
                          color: '#4ade80',
                          maxHeight: 140,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {dockerLog[p.id]}
                        {dockerRunning[p.id] && <span className="inline-block w-2 h-3 ml-0.5 animate-pulse" style={{ background: '#4ade80' }} />}
                      </div>
                    )}
                  </div>
                )}

                {/* Demo Accounts */}
                {(() => {
                  // Use DB-stored JSON first (parsed by execute route), fall back to client-side regex
                  let accounts: { role: string; email: string; password: string }[] = []
                  if (p.demo_accounts_json) {
                    try { accounts = JSON.parse(p.demo_accounts_json) } catch {}
                  }
                  if (accounts.length === 0) accounts = parseDemoAccounts(p.integration_output ?? '')

                  // Show scan button for projects with integration_output but no accounts found
                  if (accounts.length === 0) {
                    if (!p.integration_output) return null
                    return (
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/projects/${p.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ rescan_accounts: true }),
                          })
                          const data = await res.json()
                          if (data.accounts?.length > 0) fetchProjects()
                          else alert('ไม่พบ Demo Accounts ในผลลัพธ์ Phase 4')
                        }}
                        className="flex items-center gap-1.5 w-full px-3 py-1.5 rounded text-xs transition-all"
                        style={{ background: '#0a0d14', border: '1px solid #1e3a5f30', color: '#374151' }}
                      >
                        <User size={11} />
                        <span className="font-orbitron" style={{ fontSize: '9px', letterSpacing: '0.05em' }}>SCAN DEMO ACCOUNTS</span>
                      </button>
                    )
                  }

                  const open = showDemo[p.id]
                  return (
                    <div>
                      <button
                        onClick={() => setShowDemo(s => ({ ...s, [p.id]: !s[p.id] }))}
                        className="flex items-center gap-1.5 w-full px-3 py-1.5 rounded text-xs transition-all"
                        style={{
                          background: open ? '#0d1a2e' : '#0a0d14',
                          border: '1px solid #1e3a5f40',
                          color: open ? '#60a5fa' : '#475569',
                        }}
                      >
                        <User size={11} />
                        <span className="font-orbitron" style={{ fontSize: '9px', letterSpacing: '0.05em' }}>
                          DEMO ACCOUNTS ({accounts.length})
                        </span>
                        <span className="ml-auto">
                          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </span>
                      </button>
                      {open && (
                        <div className="mt-1 rounded overflow-hidden" style={{ border: '1px solid #1e3a5f30' }}>
                          <table className="w-full" style={{ fontSize: '10px', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#0a1220' }}>
                                {['Role', 'Email', 'Password'].map(h => (
                                  <th key={h} className="text-left px-2 py-1.5 font-orbitron" style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.08em' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {accounts.map((a, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? '#060810' : '#080b14', borderTop: '1px solid #0f1a25' }}>
                                  <td className="px-2 py-1.5 font-orbitron" style={{ color: '#60a5fa', fontSize: '9px' }}>{a.role}</td>
                                  <td className="px-2 py-1.5 font-mono" style={{ color: '#94a3b8' }}>{a.email}</td>
                                  <td className="px-2 py-1.5 font-mono" style={{ color: '#6b7280' }}>{a.password}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid #111820' }}>
                  <span className="font-mono text-xs text-gray-600">
                    {new Date(p.created_at).toLocaleDateString('th-TH')}
                  </span>
                  <div className="flex gap-2">
                    <a
                      href={`/projects/${p.id}`}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors"
                      style={{ background: '#001a2e', border: '1px solid #00e5ff30', color: '#00e5ff' }}
                      title={t('ide')}
                    >
                      <Code2 size={11} />
                      {t('ide')}
                    </a>
                    <button
                      onClick={() => handleSetPath(p)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:text-white"
                      style={{ color: '#6b7280' }}
                    >
                      <Settings size={11} />
                      {t('path')}
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={isDeleting}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
                      style={{
                        background: '#1a0a0a',
                        border: '1px solid #3a1515',
                        color: isDeleting ? '#6b7280' : '#ff4d4f',
                      }}
                    >
                      {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      {isDeleting ? t('deleting') : t('delete')}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Set Path Modal */}
      {pathModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-xl p-6 w-full max-w-lg space-y-4" style={{ background: '#0d1117', border: '1px solid #1a2535' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-orbitron text-sm font-bold text-white">{t('set_path_title')}</h2>
              <button onClick={() => setPathModal(null)}><X size={16} className="text-gray-500" /></button>
            </div>
            <p className="text-xs text-gray-500">{pathModal.name}</p>

            <div className="space-y-3">
              <div>
                <label className="font-orbitron text-xs text-gray-400 block mb-1" style={{ fontSize: '10px' }}>
                  {t('work_dir_label')}
                </label>
                <input
                  className="w-full rounded px-3 py-2 text-xs font-mono text-white"
                  style={{ background: '#070b10', border: '1px solid #1a2535', outline: 'none' }}
                  placeholder="/private/tmp/my-project"
                  value={pathForm.work_dir}
                  onChange={e => setPathForm(f => ({ ...f, work_dir: e.target.value }))}
                />
              </div>
              <div>
                <label className="font-orbitron text-xs text-gray-400 block mb-1" style={{ fontSize: '10px' }}>
                  {t('compose_label')}
                </label>
                <input
                  className="w-full rounded px-3 py-2 text-xs font-mono text-white"
                  style={{ background: '#070b10', border: '1px solid #1a2535', outline: 'none' }}
                  placeholder="/private/tmp/my-project/docker-compose.yml"
                  value={pathForm.docker_compose_path}
                  onChange={e => setPathForm(f => ({ ...f, docker_compose_path: e.target.value }))}
                />
              </div>
              {/* Ports */}
              <div className="pt-1" style={{ borderTop: '1px solid #111820' }}>
                <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.1em' }}>PORTS</div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="font-orbitron text-xs text-gray-500 block mb-1" style={{ fontSize: '9px' }}>App Port</label>
                    <input
                      type="number"
                      className="w-full rounded px-3 py-2 text-xs font-mono text-white"
                      style={{ background: '#070b10', border: '1px solid #1a2535', outline: 'none' }}
                      placeholder="3001"
                      value={pathForm.web_port}
                      onChange={e => setPathForm(f => ({ ...f, web_port: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="font-orbitron text-xs text-gray-500 block mb-1" style={{ fontSize: '9px' }}>CloudBeaver Port</label>
                    <input
                      type="number"
                      className="w-full rounded px-3 py-2 text-xs font-mono text-white"
                      style={{ background: '#070b10', border: '1px solid #1a2535', outline: 'none' }}
                      placeholder="8978"
                      value={pathForm.adminer_port}
                      onChange={e => setPathForm(f => ({ ...f, adminer_port: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              {/* DB credentials */}
              <div className="pt-1" style={{ borderTop: '1px solid #111820' }}>
                <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.1em' }}>DB CREDENTIALS</div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="font-orbitron text-xs text-gray-500 block mb-1" style={{ fontSize: '9px' }}>Username</label>
                    <input
                      className="w-full rounded px-3 py-2 text-xs font-mono text-white"
                      style={{ background: '#070b10', border: '1px solid #1a2535', outline: 'none' }}
                      placeholder="app_user"
                      value={pathForm.db_user}
                      onChange={e => setPathForm(f => ({ ...f, db_user: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="font-orbitron text-xs text-gray-500 block mb-1" style={{ fontSize: '9px' }}>Password</label>
                    <input
                      className="w-full rounded px-3 py-2 text-xs font-mono text-white"
                      style={{ background: '#070b10', border: '1px solid #1a2535', outline: 'none' }}
                      placeholder="app_pass"
                      value={pathForm.db_password}
                      onChange={e => setPathForm(f => ({ ...f, db_password: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPathModal(null)}
                className="px-4 py-2 rounded text-xs text-gray-500"
                style={{ background: '#0a0e14', border: '1px solid #1a2535' }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={savePath}
                disabled={saving}
                className="px-4 py-2 rounded text-xs font-semibold text-white"
                style={{ background: '#0066ff' }}
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
