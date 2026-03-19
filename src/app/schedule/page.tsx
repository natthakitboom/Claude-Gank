'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Agent } from '@/lib/types'
import type { ScheduledJob } from '@/lib/scheduler'
import { describeSchedule } from '@/lib/scheduler'
import PixelSprite from '@/components/PixelSprite'
import { Trash2, Power } from 'lucide-react'

const TEAM_COLOR: Record<string, string> = { CORE: '#ff2d78', TECH: '#2d7fff', CREATIVE: '#a855f7', BUSINESS: '#22c55e', FINANCE: '#06b6d4' }
const STATUS_COLOR: Record<string, string> = { done: '#22c55e', running: '#2d7fff', failed: '#ef4444', pending: '#374151' }
const STATUS_BG: Record<string, string> = { done: 'rgba(34,197,94,0.2)', running: 'rgba(45,127,255,0.2)', failed: 'rgba(239,68,68,0.2)', pending: 'rgba(55,65,81,0.2)' }

interface MissionRow {
  id: string; title: string; agent_id: string; agent_name: string; agent_team: string
  status: string; priority: string; created_at: string; completed_at: string | null
  scheduled_at: string | null; tokens_used: number
}

interface SchedulerData {
  fired: number
  upcoming: MissionRow[]
}

/* ── Timeline Bar ── */
function TimelineRow({ agent, missions, windowStart, windowMs }: {
  agent: Agent; missions: MissionRow[]; windowStart: number; windowMs: number
}) {
  const agentMissions = missions.filter(m => m.agent_id === agent.id)

  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="flex items-center gap-1.5 flex-shrink-0" style={{ width: 120 }}>
        <PixelSprite agentId={agent.id} size={20} />
        <span className="font-orbitron truncate" style={{ fontSize: '8px', color: '#64748b', maxWidth: 90 }}>{agent.name}</span>
      </div>
      <div className="flex-1 relative rounded" style={{ height: 20, background: '#0a0c12' }}>
        {agentMissions.map(m => {
          const start = new Date(m.created_at).getTime()
          const end = m.completed_at ? new Date(m.completed_at).getTime() : Date.now()
          const left = Math.max(0, (start - windowStart) / windowMs * 100)
          const width = Math.max(0.8, (end - start) / windowMs * 100)
          if (left > 100) return null
          return (
            <div
              key={m.id}
              className="absolute top-1 rounded-sm cursor-pointer group"
              style={{
                left: `${left}%`,
                width: `${Math.min(width, 100 - left)}%`,
                height: 12,
                background: STATUS_BG[m.status],
                border: `1px solid ${STATUS_COLOR[m.status]}`,
              }}
              title={`${m.title} [${m.status}]`}
            >
              <div className="hidden group-hover:block absolute bottom-5 left-0 z-20 rounded px-2 py-1 whitespace-nowrap"
                style={{ background: '#1e2535', border: `1px solid ${STATUS_COLOR[m.status]}`, fontSize: '9px', color: '#e2e8f0' }}>
                {m.title}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Time axis ── */
function TimeAxis({ windowStart, windowMs }: { windowStart: number; windowMs: number }) {
  const ticks = 6
  return (
    <div className="flex ml-32 mb-1">
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const t = new Date(windowStart + (windowMs / ticks) * i)
        const label = t.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        return (
          <div key={i} className="flex-1 text-center font-orbitron" style={{ fontSize: '7px', color: '#374151' }}>
            {label}
          </div>
        )
      })}
    </div>
  )
}

/* ── Countdown ── */
function Countdown({ scheduledAt }: { scheduledAt: string }) {
  const [diff, setDiff] = useState('')
  useEffect(() => {
    const update = () => {
      const ms = new Date(scheduledAt).getTime() - Date.now()
      if (ms <= 0) { setDiff('กำลังรัน...'); return }
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setDiff(h > 0 ? `${h}ชม ${m}น` : m > 0 ? `${m}น ${s}ว` : `${s}ว`)
    }
    update()
    const i = setInterval(update, 1000)
    return () => clearInterval(i)
  }, [scheduledAt])
  return <span style={{ color: '#f59e0b' }}>{diff}</span>
}

/* ── Default form state ── */
const DEFAULT_JOB_FORM = {
  title: '', description: '', agent_id: '', priority: 'normal',
  frequency: 'daily', run_time: '09:00', day_of_week: 1, interval_hours: 4,
}

export default function SchedulePage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [missions, setMissions] = useState<MissionRow[]>([])
  const [upcoming, setUpcoming] = useState<MissionRow[]>([])
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showJobForm, setShowJobForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [creatingJob, setCreatingJob] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', agent_id: '', priority: 'normal', scheduled_at: '' })
  const [jobForm, setJobForm] = useState({ ...DEFAULT_JOB_FORM })
  const [windowHours, setWindowHours] = useState(12)

  const windowMs = windowHours * 3600 * 1000
  const windowStart = Date.now() - windowMs

  const fetchAll = useCallback(async () => {
    const [aRes, mRes, sRes, jRes] = await Promise.all([
      fetch('/api/agents'),
      fetch('/api/missions'),
      fetch('/api/scheduler'),
      fetch('/api/scheduler/jobs'),
    ])
    const agentsData = await aRes.json()
    setAgents(agentsData)
    if (agentsData.length > 0 && !form.agent_id) setForm(f => ({ ...f, agent_id: agentsData[0].id }))
    if (agentsData.length > 0 && !jobForm.agent_id) setJobForm(f => ({ ...f, agent_id: agentsData[0].id }))
    setMissions(await mRes.json())
    const sData: SchedulerData = await sRes.json()
    setUpcoming(sData.upcoming || [])
    setJobs(await jRes.json())
  }, [])

  useEffect(() => {
    fetchAll()
    const i = setInterval(fetchAll, 10000)
    return () => clearInterval(i)
  }, [fetchAll])

  const createScheduled = async () => {
    if (!form.title || !form.description || !form.agent_id || !form.scheduled_at) return
    setCreating(true)
    try {
      await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setShowForm(false)
      setForm(f => ({ ...f, title: '', description: '', scheduled_at: '' }))
      fetchAll()
    } finally { setCreating(false) }
  }

  const createJob = async () => {
    if (!jobForm.title || !jobForm.description || !jobForm.agent_id) return
    setCreatingJob(true)
    try {
      await fetch('/api/scheduler/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...jobForm,
          day_of_week: jobForm.frequency === 'weekly' ? jobForm.day_of_week : null,
          interval_hours: jobForm.frequency === 'hourly' ? jobForm.interval_hours : null,
          run_time: jobForm.frequency === 'hourly' ? null : jobForm.run_time,
        }),
      })
      setShowJobForm(false)
      setJobForm({ ...DEFAULT_JOB_FORM })
      fetchAll()
    } finally { setCreatingJob(false) }
  }

  const deleteJob = async (id: string) => {
    await fetch('/api/scheduler/jobs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchAll()
  }

  const toggleJob = async (id: string, enabled: number) => {
    await fetch('/api/scheduler/jobs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, enabled: enabled ? 0 : 1 }) })
    fetchAll()
  }

  const recentMissions = missions.filter(m => new Date(m.created_at).getTime() > windowStart)

  const defaultScheduled = () => {
    const d = new Date(Date.now() + 3600000)
    return d.toISOString().slice(0, 16)
  }

  const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-orbitron font-bold text-white" style={{ fontSize: '28px', letterSpacing: '0.05em' }}>SCHEDULE</h1>
          <p className="font-orbitron mt-1" style={{ fontSize: '10px', color: '#374151', letterSpacing: '0.1em' }}>// AGENT TIMELINE & AUTO-SCHEDULE</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowJobForm(true)} className="font-orbitron px-3 py-2 rounded text-xs"
            style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff', letterSpacing: '0.06em' }}>
            + RECURRING JOB
          </button>
          <button onClick={() => { setShowForm(true); setForm(f => ({ ...f, scheduled_at: defaultScheduled() })) }} className="btn-deploy">
            + SCHEDULE MISSION
          </button>
        </div>
      </div>

      {/* ── TIMELINE ── */}
      <div className="rounded-xl mb-6 p-4" style={{ background: '#111827', border: '1px solid #1e2d40' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-orbitron" style={{ fontSize: '10px', color: '#00e5ff', letterSpacing: '0.1em' }}>// AGENT ACTIVITY TIMELINE</span>
          <div className="flex gap-1.5">
            {[6, 12, 24].map(h => (
              <button key={h} onClick={() => setWindowHours(h)}
                className="font-orbitron px-2 py-1 rounded"
                style={windowHours === h
                  ? { background: 'rgba(0,229,255,0.15)', color: '#00e5ff', fontSize: '8px' }
                  : { background: '#111820', color: '#374151', fontSize: '8px' }}>
                {h}H
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 mb-3">
          {Object.entries({ done: 'DONE', running: 'RUNNING', failed: 'FAILED', pending: 'PENDING' }).map(([s, label]) => (
            <div key={s} className="flex items-center gap-1">
              <div className="w-3 h-2 rounded-sm" style={{ background: STATUS_BG[s], border: `1px solid ${STATUS_COLOR[s]}` }} />
              <span className="font-orbitron" style={{ fontSize: '7px', color: '#374151' }}>{label}</span>
            </div>
          ))}
        </div>

        <TimeAxis windowStart={windowStart} windowMs={windowMs} />

        <div className="space-y-0.5">
          {agents.map(agent => (
            <TimelineRow key={agent.id} agent={agent} missions={recentMissions} windowStart={windowStart} windowMs={windowMs} />
          ))}
        </div>

        {recentMissions.length === 0 && (
          <div className="text-center py-8 font-orbitron" style={{ fontSize: '9px', color: '#1f2937' }}>
            // NO ACTIVITY IN THE LAST {windowHours} HOURS
          </div>
        )}
      </div>

      {/* ── RECURRING JOBS ── */}
      <div className="rounded-xl mb-6 p-4" style={{ background: '#111827', border: '1px solid #1e2d40' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-orbitron" style={{ fontSize: '10px', color: '#00e5ff', letterSpacing: '0.1em' }}>// RECURRING JOBS</span>
          <span className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>{jobs.length} JOB{jobs.length !== 1 ? 'S' : ''}</span>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-8 font-orbitron" style={{ fontSize: '9px', color: '#1f2937' }}>
            // NO RECURRING JOBS — CLICK + RECURRING JOB TO ADD ONE
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => {
              const agent = agents.find(a => a.id === job.agent_id)
              const teamColor = TEAM_COLOR[job.agent_team || ''] || '#374151'
              return (
                <div key={job.id} className="flex items-center gap-3 rounded-lg p-3" style={{ background: '#0a0c12', border: `1px solid ${job.enabled ? '#1a2d40' : '#111820'}`, opacity: job.enabled ? 1 : 0.5 }}>
                  <PixelSprite agentId={job.agent_id} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{job.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-orbitron" style={{ fontSize: '8px', color: '#64748b' }}>{job.agent_name}</span>
                      <span className="font-orbitron px-1.5 py-0.5 rounded" style={{ fontSize: '7px', background: `${teamColor}22`, color: teamColor }}>{job.agent_team}</span>
                      <span className="font-orbitron" style={{ fontSize: '8px', color: '#00e5ff' }}>📅 {describeSchedule(job)}</span>
                    </div>
                  </div>
                  <div className="text-right mr-2">
                    <div className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>NEXT RUN</div>
                    <div className="font-orbitron mt-0.5" style={{ fontSize: '9px' }}>
                      <Countdown scheduledAt={job.next_run_at} />
                    </div>
                    {job.last_run_at && (
                      <div className="font-orbitron mt-0.5" style={{ fontSize: '7px', color: '#1f2937' }}>
                        LAST: {new Date(job.last_run_at).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => toggleJob(job.id, job.enabled)}
                      className="p-1.5 rounded transition-colors"
                      style={{ background: job.enabled ? 'rgba(34,197,94,0.1)' : '#111820', border: `1px solid ${job.enabled ? '#22c55e' : '#1a2535'}`, color: job.enabled ? '#22c55e' : '#374151' }}
                      title={job.enabled ? 'Disable' : 'Enable'}>
                      <Power size={12} />
                    </button>
                    <button onClick={() => deleteJob(job.id)}
                      className="p-1.5 rounded transition-colors"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
                      title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── SCHEDULED MISSIONS ── */}
      <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e2d40' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-orbitron" style={{ fontSize: '10px', color: '#f59e0b', letterSpacing: '0.1em' }}>// SCHEDULED MISSIONS (ONE-TIME)</span>
          <span className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>AUTO-CHECK EVERY 10s</span>
        </div>

        {upcoming.length === 0 ? (
          <div className="text-center py-8 font-orbitron" style={{ fontSize: '9px', color: '#1f2937' }}>
            // NO SCHEDULED MISSIONS — CLICK + SCHEDULE MISSION TO ADD ONE
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(m => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg p-3" style={{ background: '#0a0c12', border: '1px solid #1a2030' }}>
                <PixelSprite agentId={m.agent_id} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{m.title}</div>
                  <div className="font-orbitron" style={{ fontSize: '8px', color: '#64748b' }}>{m.agent_name}</div>
                </div>
                <div className="text-right">
                  <div className="font-orbitron" style={{ fontSize: '9px', color: '#374151' }}>
                    {new Date(m.scheduled_at!).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="font-orbitron mt-0.5" style={{ fontSize: '10px' }}>
                    <Countdown scheduledAt={m.scheduled_at!} />
                  </div>
                </div>
                <span className="font-orbitron px-2 py-0.5 rounded" style={{ fontSize: '8px', background: STATUS_BG[m.priority === 'urgent' ? 'failed' : 'pending'], color: m.priority === 'urgent' ? '#ef4444' : m.priority === 'high' ? '#f59e0b' : '#374151' }}>
                  {m.priority.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CREATE ONE-TIME MISSION MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1a2535' }}>
            <div className="p-5 border-b" style={{ borderColor: '#111820' }}>
              <span className="font-orbitron text-xs font-bold text-white" style={{ letterSpacing: '0.08em' }}>SCHEDULE ONE-TIME MISSION</span>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>MISSION TITLE</label>
                <input type="text" placeholder="ชื่อ mission" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="gank-input" />
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>AGENT</label>
                <select value={form.agent_id} onChange={e => setForm(f => ({ ...f, agent_id: e.target.value }))} className="gank-input">
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.team})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>PRIORITY</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="gank-input">
                    {['low', 'normal', 'high', 'urgent'].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#f59e0b', letterSpacing: '0.08em' }}>⏰ SCHEDULED AT</label>
                  <input type="datetime-local" value={form.scheduled_at}
                    onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                    className="gank-input" style={{ colorScheme: 'dark' }} />
                </div>
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>MISSION BRIEF</label>
                <textarea rows={4} placeholder="อธิบายงาน..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="gank-input resize-none" />
              </div>
            </div>
            <div className="p-4 border-t flex gap-2" style={{ borderColor: '#111820' }}>
              <button onClick={createScheduled} disabled={creating || !form.title || !form.description || !form.scheduled_at} className="btn-deploy flex-1">
                {creating ? 'SCHEDULING...' : '⏰ SCHEDULE'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded text-xs font-orbitron" style={{ background: '#111820', border: '1px solid #1a2535', color: '#64748b', letterSpacing: '0.08em' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE RECURRING JOB MODAL ── */}
      {showJobForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(0,229,255,0.3)' }}>
            <div className="p-5 border-b" style={{ borderColor: '#111820' }}>
              <span className="font-orbitron text-xs font-bold" style={{ color: '#00e5ff', letterSpacing: '0.08em' }}>CREATE RECURRING JOB</span>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>JOB TITLE</label>
                <input type="text" placeholder="ชื่องาน" value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} className="gank-input" />
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>AGENT</label>
                <select value={jobForm.agent_id} onChange={e => setJobForm(f => ({ ...f, agent_id: e.target.value }))} className="gank-input">
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.team})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>PRIORITY</label>
                  <select value={jobForm.priority} onChange={e => setJobForm(f => ({ ...f, priority: e.target.value }))} className="gank-input">
                    {['low', 'normal', 'high', 'urgent'].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#00e5ff', letterSpacing: '0.08em' }}>FREQUENCY</label>
                  <select value={jobForm.frequency} onChange={e => setJobForm(f => ({ ...f, frequency: e.target.value }))} className="gank-input">
                    <option value="daily">ทุกวัน (Daily)</option>
                    <option value="weekdays">วันทำการ (Weekdays)</option>
                    <option value="weekly">รายสัปดาห์ (Weekly)</option>
                    <option value="hourly">ทุก N ชั่วโมง (Hourly)</option>
                  </select>
                </div>
              </div>

              {/* Conditional fields */}
              {jobForm.frequency !== 'hourly' && (
                <div className={jobForm.frequency === 'weekly' ? 'grid grid-cols-2 gap-3' : ''}>
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>เวลา (HH:MM)</label>
                    <input type="time" value={jobForm.run_time} onChange={e => setJobForm(f => ({ ...f, run_time: e.target.value }))}
                      className="gank-input" style={{ colorScheme: 'dark' }} />
                  </div>
                  {jobForm.frequency === 'weekly' && (
                    <div>
                      <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>วันในสัปดาห์</label>
                      <select value={jobForm.day_of_week} onChange={e => setJobForm(f => ({ ...f, day_of_week: Number(e.target.value) }))} className="gank-input">
                        {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
              {jobForm.frequency === 'hourly' && (
                <div>
                  <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>ทุกกี่ชั่วโมง</label>
                  <input type="number" min={1} max={24} value={jobForm.interval_hours}
                    onChange={e => setJobForm(f => ({ ...f, interval_hours: Number(e.target.value) }))} className="gank-input" />
                </div>
              )}

              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>MISSION BRIEF (จะใช้ทุกครั้งที่รัน)</label>
                <textarea rows={4} placeholder="อธิบายงานที่ต้องทำซ้ำ..." value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} className="gank-input resize-none" />
              </div>
            </div>
            <div className="p-4 border-t flex gap-2" style={{ borderColor: '#111820' }}>
              <button onClick={createJob} disabled={creatingJob || !jobForm.title || !jobForm.description || !jobForm.agent_id} className="btn-deploy flex-1"
                style={{ background: 'rgba(0,229,255,0.15)', borderColor: 'rgba(0,229,255,0.4)', color: '#00e5ff' }}>
                {creatingJob ? 'CREATING...' : '🔄 CREATE RECURRING JOB'}
              </button>
              <button onClick={() => setShowJobForm(false)} className="px-4 py-2 rounded text-xs font-orbitron" style={{ background: '#111820', border: '1px solid #1a2535', color: '#64748b', letterSpacing: '0.08em' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
