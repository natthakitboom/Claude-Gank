'use client'

import { useState, useEffect, useCallback } from 'react'
import { FolderOpen, Trash2, Settings, X, CheckCircle, Loader2, Circle, RefreshCw, GitBranch, Code2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

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
  const [pathForm, setPathForm] = useState({ work_dir: '', docker_compose_path: '' })
  const [saving, setSaving] = useState(false)
  const { t } = useLanguage()

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data)
    } catch {}
    setLoading(false)
  }, [])

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
    })
  }

  async function savePath() {
    if (!pathModal) return
    setSaving(true)
    await fetch(`/api/projects/${pathModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pathForm),
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
                  <span
                    className="font-orbitron text-xs px-2 py-0.5 rounded flex-shrink-0"
                    style={{ background: `${color}20`, color, border: `1px solid ${color}40`, fontSize: '9px' }}
                  >
                    {label}
                  </span>
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
