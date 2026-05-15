'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { Agent, Mission } from '@/lib/types'
import PixelSprite from '@/components/PixelSprite'
import { useLanguage } from '@/lib/i18n'

const TEAM_CAT_CLASS: Record<string, string> = { CORE: 'cat-core', TECH: 'cat-tech', CREATIVE: 'cat-creative', BUSINESS: 'cat-biz', FINANCE: 'cat-finance' }
const TEAM_DISPLAY: Record<string, string> = { CORE: 'CORE', TECH: 'TECH', CREATIVE: 'CREATIVE', BUSINESS: 'BIZ', FINANCE: 'FINANCE' }
const TPL_CAT_COLOR: Record<string, string> = { creative: '#a855f7', business: '#22c55e', tech: '#2d7fff', finance: '#f59e0b', general: '#64748b' }

type MissionRow = Mission & { agent_name: string; agent_sprite: string; agent_color: string; agent_team: string; parent_mission_id?: string | null; phase?: number }

interface MissionTemplate {
  id: string; name: string; icon: string; category: string; default_agent_id: string
  title_template: string; description_template: string; variables_json: string
  agent_name?: string; agent_sprite?: string; agent_team?: string; usage_count: number
}

export default function MissionsPage() {
  const { t, lang } = useLanguage()
  const [missions, setMissions] = useState<MissionRow[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selected, setSelected] = useState<MissionRow | null>(null)
  const [streamOutput, setStreamOutput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAgent, setFilterAgent] = useState('')
  const [filterDate, setFilterDate] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showTeamTplPicker, setShowTeamTplPicker] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<MissionTemplate[]>([])
  const [tplVars, setTplVars] = useState<Record<string, string>>({})
  const [selectedTpl, setSelectedTpl] = useState<MissionTemplate | null>(null)
  const [creating, setCreating] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState<{ tasksCreated: number; projectMissionId: string } | null>(null)
  const [form, setForm] = useState({ title: '', description: '', agent_id: '', priority: 'normal' })
  const [teamForm, setTeamForm] = useState({ description: '', priority: 'high' })
  const [autoRun, setAutoRun] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchRunning, setBatchRunning] = useState<Set<string>>(new Set())
  const outputRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const abortMapRef = useRef<Map<string, AbortController>>(new Map())

  const fetchMissions = useCallback(async () => {
    const p = new URLSearchParams()
    if (filterStatus !== 'all') p.set('status', filterStatus)
    if (searchQuery.trim()) p.set('search', searchQuery.trim())
    if (filterAgent) p.set('agent_id', filterAgent)
    if (filterDate !== 'all') p.set('date', filterDate)
    const url = `/api/missions${p.toString() ? '?' + p.toString() : ''}`
    const res = await fetch(url)
    const data = await res.json()
    setMissions(data)
  }, [filterStatus, searchQuery, filterAgent, filterDate])

  const retryMission = async (mission: MissionRow) => {
    const res = await fetch('/api/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: mission.title.replace(/\(retry.*?\)\s*/, '') + ' (retry)',
        description: mission.description,
        agent_id: mission.agent_id,
        priority: mission.priority,
        auto_run: true,
      }),
    })
    const newMission = await res.json()
    await fetchMissions()
    setSelected(newMission)
    setStreamOutput('')
    setTimeout(() => executeMission(newMission.id), 300)
  }

  const fetchAgents = async () => {
    const res = await fetch('/api/agents')
    const data = await res.json()
    setAgents(data)
    if (data.length > 0 && !form.agent_id) setForm((f) => ({ ...f, agent_id: data[0].id }))
  }

  const fetchTemplates = async () => {
    const res = await fetch('/api/templates')
    setTemplates(await res.json())
  }

  const applyTemplate = (tpl: MissionTemplate) => {
    setSelectedTpl(tpl)
    setTplVars({})
    const vars: string[] = JSON.parse(tpl.variables_json || '[]')
    if (vars.length === 0) {
      // No variables, apply directly
      setForm({
        title: tpl.title_template,
        description: tpl.description_template,
        agent_id: tpl.default_agent_id || agents[0]?.id || '',
        priority: 'normal',
      })
      setAutoRun(true)
      setShowTemplates(false)
      setShowCreateModal(true)
      setSelectedTpl(null)
      fetch('/api/templates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: tpl.id }) })
    }
    // If has variables, show variable input form
  }

  const applyTplVars = () => {
    if (!selectedTpl) return
    let title = selectedTpl.title_template
    let desc = selectedTpl.description_template
    for (const [k, v] of Object.entries(tplVars)) {
      title = title.replaceAll(`{${k}}`, v || `[${k}]`)
      desc = desc.replaceAll(`{${k}}`, v || `[${k}]`)
    }
    setForm({
      title,
      description: desc,
      agent_id: selectedTpl.default_agent_id || agents[0]?.id || '',
      priority: 'normal',
    })
    setAutoRun(true)
    setShowTemplates(false)
    setShowCreateModal(true)
    setSelectedTpl(null)
    setTplVars({})
    fetch('/api/templates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedTpl.id }) })
  }

  useEffect(() => { fetchMissions(); fetchAgents(); fetchTemplates() }, [filterStatus])
  useEffect(() => {
    const i = setInterval(fetchMissions, 3000)
    return () => clearInterval(i)
  }, [fetchMissions])
  // Phase orphan watchdog: call scheduler every 30s so stuck projects self-heal
  // even when no new missions are being executed
  useEffect(() => {
    const ping = () => fetch('/api/scheduler').catch(() => {})
    ping() // immediate on mount
    const i = setInterval(ping, 30_000)
    return () => clearInterval(i)
  }, [])
  useEffect(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight }, [streamOutput])

  const createMission = async () => {
    if (!form.title || !form.description || !form.agent_id) return
    setCreating(true)
    try {
      const res = await fetch('/api/missions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const mission = await res.json()
      setShowCreateModal(false)
      setForm({ title: '', description: '', agent_id: agents[0]?.id || '', priority: 'normal' })
      await fetchMissions()
      setSelected(mission)
      setStreamOutput('')
      if (autoRun) setTimeout(() => executeMission(mission.id), 300)
    } finally { setCreating(false) }
  }

  const executeMission = async (missionId: string, silent = false) => {
    if (!silent) { setStreamOutput(''); setIsStreaming(true) }
    const abort = new AbortController()
    if (!silent) abortRef.current = abort
    abortMapRef.current.set(missionId, abort)

    try {
      const res = await fetch(`/api/missions/${missionId}/execute`, { method: 'POST', signal: abort.signal })
      if (!res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const evt = JSON.parse(line.slice(6))
              if (evt.type === 'chunk' && !silent) setStreamOutput((prev) => prev + evt.text)
              else if (evt.type === 'done') {
                if (!silent) setIsStreaming(false)
                setBatchRunning((s) => { const n = new Set(s); n.delete(missionId); return n })
                fetchMissions()
              } else if (evt.type === 'error') {
                if (!silent) { setStreamOutput((prev) => prev + `\n\nError: ${evt.error}`); setIsStreaming(false) }
                setBatchRunning((s) => { const n = new Set(s); n.delete(missionId); return n })
                fetchMissions()
              }
            } catch {}
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError' && !silent) {
        setStreamOutput((prev) => prev + '\n\nConnection error')
      }
      if (!silent) setIsStreaming(false)
      setBatchRunning((s) => { const n = new Set(s); n.delete(missionId); return n })
    } finally {
      abortMapRef.current.delete(missionId)
    }
  }

  const batchExecute = async (ids: string[]) => {
    const runnable = ids.filter(id => {
      const m = missions.find(m => m.id === id)
      return m && m.status !== 'running'
    })
    if (runnable.length === 0) return
    setBatchRunning(new Set(runnable))
    await Promise.allSettled(runnable.map(id => executeMission(id, true)))
    setSelectedIds(new Set())
  }

  const executeAllPending = () => {
    const pending = missions.filter(m => m.status === 'pending').map(m => m.id)
    batchExecute(pending)
  }

  const deployToTeam = async () => {
    if (!teamForm.description) return
    setDeploying(true)
    setDeployResult(null)
    try {
      const res = await fetch('/api/orchestra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamForm),
      })
      const data = await res.json()
      setDeployResult(data)
      await fetchMissions()
    } finally {
      setDeploying(false)
    }
  }

  const stopMission = () => { abortRef.current?.abort(); setIsStreaming(false) }

  const toggleSelect = (id: string) => {
    setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const statusColor = (s: string) => s === 'done' ? '#22c55e' : s === 'running' ? '#2d7fff' : s === 'failed' ? '#ef4444' : s === 'waiting' || s === 'waiting_phase' ? '#f59e0b' : s === 'waiting_retest' ? '#a855f7' : '#374151'
  const statusBg = (s: string) => s === 'done' ? 'rgba(34,197,94,0.15)' : s === 'running' ? 'rgba(45,127,255,0.15)' : s === 'failed' ? 'rgba(239,68,68,0.15)' : s === 'waiting' || s === 'waiting_phase' ? 'rgba(245,158,11,0.15)' : s === 'waiting_retest' ? 'rgba(168,85,247,0.15)' : '#181218'
  const prioColor = (p: string) => p === 'urgent' ? '#ef4444' : p === 'high' ? '#f59e0b' : '#374151'

  const pendingCount = missions.filter(m => m.status === 'pending').length
  const runningCount = missions.filter(m => m.status === 'running').length

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Mission List */}
      <div className="w-72 flex-shrink-0 flex flex-col" style={{ background: '#0A0709', borderRight: '1px solid #181218' }}>
        <div className="p-4 border-b" style={{ borderColor: '#181218' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-orbitron text-sm font-bold text-white" style={{ letterSpacing: '0.08em' }}>{t('missions_title')}</h1>
              {runningCount > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="status-dot working" />
                  <span className="font-orbitron" style={{ fontSize: '8px', color: '#10b981' }}>{runningCount} {t('missions_running_badge')}</span>
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setShowTemplates(true)} className="font-orbitron px-2 py-1 rounded" style={{ fontSize: '8px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', letterSpacing: '0.05em' }}>{t('missions_tpl_btn')}</button>
              <button onClick={() => setShowTeamModal(true)} className="font-orbitron px-2 py-1 rounded" style={{ fontSize: '8px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7', letterSpacing: '0.05em' }}>{t('missions_team_btn')}</button>
              <button onClick={() => setShowCreateModal(true)} className="btn-deploy" style={{ padding: '6px 12px', fontSize: '9px' }}>{t('missions_deploy_short')}</button>
            </div>
          </div>

          {/* Batch controls */}
          <div className="flex gap-1.5 mb-2">
            <button
              onClick={executeAllPending}
              disabled={pendingCount === 0}
              className="flex-1 font-orbitron py-1 rounded text-xs transition-all"
              style={pendingCount > 0
                ? { background: 'rgba(212,67,107,0.1)', border: '1px solid #E8365D33', color: '#E8365D', fontSize: '8px', letterSpacing: '0.05em' }
                : { background: '#181218', color: '#1f2937', fontSize: '8px', letterSpacing: '0.05em' }}
            >
              {t('missions_all_pending')} ({pendingCount})
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={() => batchExecute(Array.from(selectedIds))}
                className="font-orbitron px-2 py-1 rounded text-xs"
                style={{ background: 'rgba(45,127,255,0.15)', border: '1px solid #2d7fff44', color: '#2d7fff', fontSize: '8px' }}
              >
                ▶ {selectedIds.size} SEL
              </button>
            )}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder={t('missions_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="gank-input mb-2"
            style={{ fontSize: '10px', padding: '6px 8px' }}
          />

          {/* Agent + Date filters */}
          <div className="flex gap-1.5 mb-2">
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="gank-input flex-1"
              style={{ fontSize: '9px', padding: '4px 6px' }}
            >
              <option value="">{t('missions_filter_all_agents')}</option>
              {agents.map(a => <option key={a.id} value={a.id}>{lang === 'EN' && a.name_en ? a.name_en : a.name}</option>)}
            </select>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="gank-input"
              style={{ fontSize: '9px', padding: '4px 6px', width: 80 }}
            >
              <option value="all">{t('missions_date_all')}</option>
              <option value="today">{t('missions_date_today')}</option>
              <option value="week">{t('missions_date_week')}</option>
              <option value="month">{t('missions_date_month')}</option>
            </select>
          </div>

          {/* Status filters */}
          <div className="flex gap-1.5 flex-wrap">
            {([['all', t('filter_all')], ['pending', t('filter_pending')], ['running', t('filter_running')], ['done', t('filter_done')], ['failed', t('filter_failed')]] as [string, string][]).map(([s, label]) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="font-orbitron text-xs px-2 py-1 rounded transition-all"
                style={filterStatus === s
                  ? { background: 'rgba(212,67,107,0.15)', color: '#E8365D', fontSize: '9px', letterSpacing: '0.05em' }
                  : { background: '#181218', color: '#374151', fontSize: '9px', letterSpacing: '0.05em' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {missions.length === 0 && (
            <div className="text-center py-12 font-orbitron" style={{ color: '#1f2937', fontSize: '9px', letterSpacing: '0.08em' }}>NO MISSIONS</div>
          )}
          {missions.map((m) => {
            const isBatchRunning = batchRunning.has(m.id)
            const isParent = missions.some(x => x.parent_mission_id === m.id)
            const isSub = !!m.parent_mission_id
            return (
              <div key={m.id} className="relative" style={{ marginLeft: isSub ? 12 : 0 }}>
                {isSub && (
                  <div className="absolute left-0 top-4" style={{ width: 8, height: 1, background: '#3D1E2C' }} />
                )}
                <div
                  className="absolute z-10 w-3.5 h-3.5 rounded cursor-pointer flex items-center justify-center"
                  style={{
                    top: 8, left: isSub ? 10 : 6,
                    background: selectedIds.has(m.id) ? '#2d7fff' : '#181218',
                    border: `1px solid ${selectedIds.has(m.id) ? '#2d7fff' : '#2A1622'}`,
                  }}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(m.id) }}
                >
                  {selectedIds.has(m.id) && <span style={{ fontSize: '8px', color: '#fff' }}>✓</span>}
                </div>
                <button
                  onClick={() => { setSelected(m); setStreamOutput(m.output || '') }}
                  className="w-full text-left rounded-lg p-3 mission-card transition-all"
                  style={{
                    paddingLeft: isSub ? 28 : 28,
                    background: selected?.id === m.id ? '#0f1420' : '#181218',
                    border: `1px solid ${selected?.id === m.id ? '#3D1E2C' : isParent ? 'rgba(168,85,247,0.25)' : isBatchRunning ? '#2d7fff44' : '#1a2030'}`,
                  }}>
                  <div className="flex items-start gap-2">
                    <PixelSprite agentId={m.agent_id} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        {isParent && <span className="font-orbitron px-1 py-0.5 rounded" style={{ fontSize: '6px', background: 'rgba(168,85,247,0.2)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>PROJECT</span>}
                        {isSub && <span style={{ fontSize: '9px', color: '#374151' }}>↳</span>}
                        {isSub && (m as any).phase != null && <span className="font-orbitron px-1 py-0.5 rounded" style={{ fontSize: '6px', background: ['rgba(168,85,247,0.15)','rgba(59,130,246,0.15)','rgba(16,185,129,0.15)','rgba(245,158,11,0.15)','rgba(239,68,68,0.15)'][(m as any).phase] || '#111', color: ['#a855f7','#3b82f6','#10b981','#f59e0b','#ef4444'][(m as any).phase] || '#666', border: `1px solid ${['rgba(168,85,247,0.3)','rgba(59,130,246,0.3)','rgba(16,185,129,0.3)','rgba(245,158,11,0.3)','rgba(239,68,68,0.3)'][(m as any).phase] || '#333'}` }}>P{(m as any).phase}</span>}
                        <span className="text-xs font-medium text-white truncate">{m.title}</span>
                      </div>
                      <div className="font-orbitron truncate" style={{ fontSize: '8px', color: '#374151' }}>{lang === 'EN' && m.agent_name_en ? m.agent_name_en : m.agent_name}</div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="font-orbitron px-1.5 py-0.5 rounded" style={{ fontSize: '8px', background: statusBg(m.status), color: statusColor(m.status) }}>
                          {isBatchRunning && m.status !== 'running' ? t('missions_queued') : m.status === 'waiting_phase' ? 'WAITING' : m.status === 'waiting_retest' ? 'RETEST' : m.status.toUpperCase()}
                        </span>
                        <span className="font-orbitron px-1.5 py-0.5 rounded" style={{ fontSize: '8px', background: '#181218', color: prioColor(m.priority) }}>
                          {m.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    {(isBatchRunning || m.status === 'running') && (
                      <div className="typing-dots mt-1"><span /><span /><span /></div>
                    )}
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: Mission Detail + Output */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="font-orbitron mb-2" style={{ fontSize: '11px', color: '#1f2937', letterSpacing: '0.1em' }}>{t('missions_select_or_deploy')}</div>
              <button onClick={() => setShowCreateModal(true)} className="btn-deploy mt-4">{t('missions_deploy_btn')}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-shrink-0 p-5 border-b" style={{ background: '#181218', borderColor: '#181218' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <PixelSprite agentId={selected.agent_id} size={36} />
                  <div>
                    <h2 className="text-base font-semibold text-white">{selected.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs" style={{ color: '#64748b' }}>{lang === 'EN' && selected.agent_name_en ? selected.agent_name_en : selected.agent_name}</span>
                      {selected.agent_team && <span className={`cat-badge ${TEAM_CAT_CLASS[selected.agent_team]}`} style={{ fontSize: '8px' }}>{TEAM_DISPLAY[selected.agent_team] || selected.agent_team}</span>}
                      <span className="font-orbitron px-2 py-0.5 rounded" style={{ fontSize: '9px', background: statusBg(selected.status), color: statusColor(selected.status) }}>
                        {selected.status.toUpperCase()}
                      </span>
                      {selected.tokens_used > 0 && (
                        <span className="font-orbitron" style={{ fontSize: '9px', color: '#f59e0b' }}>{selected.tokens_used.toLocaleString()} TOKENS</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selected.status === 'pending' && !isStreaming && (
                    <button onClick={() => executeMission(selected.id)} className="btn-deploy" style={{ padding: '8px 16px' }}>{t('missions_execute')}</button>
                  )}
                  {isStreaming && (
                    <button onClick={stopMission} className="font-orbitron px-4 py-2 rounded text-xs font-bold text-white" style={{ background: '#ef4444', letterSpacing: '0.08em' }}>{t('missions_abort')}</button>
                  )}
                  {selected.status === 'failed' && !isStreaming && (
                    <button onClick={() => retryMission(selected)} className="font-orbitron px-4 py-2 rounded text-xs font-bold" style={{ background: 'rgba(245,158,11,0.8)', color: '#fff', letterSpacing: '0.08em' }}>{t('missions_retry')}</button>
                  )}
                  {selected.status === 'done' && (
                    <>
                      <button onClick={() => executeMission(selected.id)} className="font-orbitron px-4 py-2 rounded text-xs" style={{ background: '#181218', border: '1px solid #2A1622', color: '#64748b', letterSpacing: '0.08em' }}>{t('missions_rerun')}</button>
                      <button
                        onClick={async () => {
                          const output = streamOutput || selected.output || ''
                          const msg = [
                            `✅ Mission completed`,
                            ``,
                            `📊 Tokens: ${selected.tokens_used?.toLocaleString() || '—'} | Status: ${selected.status}`,
                            ``,
                            `💬 Output:`,
                            output.slice(0, 5000) + (output.length > 5000 ? '\n\n... (ดูต่อใน Dashboard)' : ''),
                          ].join('\n')
                          await fetch('/api/notify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'send',
                              title: selected.title,
                              message: msg,
                              agent_name: selected.agent_name,
                            }),
                          })
                        }}
                        className="font-orbitron px-3 py-2 rounded text-xs"
                        style={{ background: '#181218', border: '1px solid #2A1622', color: '#64748b', letterSpacing: '0.08em' }}
                        title="Send to LINE/Teams"
                      >📤</button>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3 rounded-lg p-3" style={{ background: '#0A0709', border: '1px solid #181218' }}>
                <div className="font-orbitron mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{t('missions_mission_brief')}</div>
                <div className="text-sm" style={{ color: '#94a3b8' }}>{selected.description}</div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: '#181218' }}>
                <span className="font-orbitron" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{t('missions_output_terminal')}</span>
                {isStreaming && (
                  <div className="flex items-center gap-2">
                    <span className="status-dot working" />
                    <span className="font-orbitron" style={{ fontSize: '9px', color: '#10b981' }}>{t('missions_processing')}</span>
                  </div>
                )}
                {streamOutput && !isStreaming && (
                  <button onClick={() => navigator.clipboard.writeText(streamOutput)}
                    className="font-orbitron" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>
                    {t('missions_copy')}
                  </button>
                )}
              </div>
              <div ref={outputRef} className="flex-1 overflow-y-auto p-5 terminal">
                {!streamOutput && !isStreaming ? (
                  <span style={{ color: '#1f2937' }}>
                    {selected.status === 'pending' ? t('missions_press_execute') : t('missions_no_output')}
                  </span>
                ) : (
                  <>{streamOutput}{isStreaming && <span className="text-green-400">█</span>}</>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Deploy to Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: '#181218', border: '1px solid rgba(168,85,247,0.3)' }}>
            <div className="p-5 border-b" style={{ borderColor: '#2A1622' }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '18px' }}>🏢</span>
                <span className="font-orbitron text-xs font-bold text-white" style={{ letterSpacing: '0.08em' }}>DEPLOY TO TEAM</span>
              </div>
              <p className="mt-1" style={{ fontSize: '10px', color: '#475569' }}>{t('missions_team_analyze_hint')}</p>
            </div>
            <div className="p-5 space-y-4">
              {!deployResult ? (
                <>
                  {/* Context Template Picker */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-orbitron" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{t('missions_context_template')}</label>
                      <button
                        onClick={() => setShowTeamTplPicker(v => !v)}
                        className="font-orbitron px-2 py-0.5 rounded transition-all"
                        style={{ fontSize: '7px', background: showTeamTplPicker ? 'rgba(45,127,255,0.2)' : '#181218', border: `1px solid ${showTeamTplPicker ? '#2d7fff44' : '#2A1622'}`, color: showTeamTplPicker ? '#2d7fff' : '#374151', letterSpacing: '0.05em' }}
                      >
                        {showTeamTplPicker ? t('missions_hide_tpl') : t('missions_pick_tpl')}
                      </button>
                    </div>
                    {showTeamTplPicker && (
                      <div className="mb-2 p-2 rounded-lg" style={{ background: '#0A0709', border: '1px solid #181218' }}>
                        {/* Category tabs */}
                        {['tech', 'business', 'creative', 'finance'].map(cat => {
                          const catTpls = templates.filter(t => t.category === cat)
                          if (catTpls.length === 0) return null
                          return (
                            <div key={cat} className="mb-2">
                              <div className="font-orbitron mb-1" style={{ fontSize: '7px', color: TPL_CAT_COLOR[cat] || '#374151', letterSpacing: '0.1em' }}>{cat.toUpperCase()}</div>
                              <div className="flex flex-wrap gap-1">
                                {catTpls.map(tpl => (
                                  <button
                                    key={tpl.id}
                                    onClick={() => {
                                      // Pre-fill textarea with structured template (variables shown as [varname])
                                      let desc = tpl.description_template
                                      const vars: string[] = JSON.parse(tpl.variables_json || '[]')
                                      for (const v of vars) {
                                        desc = desc.replaceAll(`{${v}}`, `[${v}]`)
                                      }
                                      setTeamForm(f => ({ ...f, description: desc }))
                                      setShowTeamTplPicker(false)
                                    }}
                                    className="font-orbitron px-2 py-1 rounded transition-all"
                                    style={{ fontSize: '8px', background: `${TPL_CAT_COLOR[cat] || '#374151'}15`, border: `1px solid ${TPL_CAT_COLOR[cat] || '#374151'}30`, color: TPL_CAT_COLOR[cat] || '#374151', letterSpacing: '0.03em' }}
                                  >
                                    {tpl.icon} {tpl.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{t('missions_task_input_label')}</label>
                    <textarea
                      rows={7}
                      placeholder={t('missions_task_placeholder')}
                      value={teamForm.description}
                      onChange={(e) => setTeamForm(f => ({ ...f, description: e.target.value }))}
                      className="gank-input resize-none"
                      style={{ minHeight: 140 }}
                    />
                  </div>
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>PRIORITY</label>
                    <div className="flex gap-2">
                      {['normal', 'high', 'urgent'].map((p) => (
                        <button key={p} onClick={() => setTeamForm(f => ({ ...f, priority: p }))}
                          className="flex-1 py-1.5 rounded font-orbitron text-xs transition-all"
                          style={teamForm.priority === p
                            ? { background: p === 'urgent' ? '#ef4444' : p === 'high' ? '#f59e0b' : '#2d7fff', color: '#fff', fontSize: '9px' }
                            : { background: '#181218', border: '1px solid #2A1622', color: '#374151', fontSize: '9px' }}>
                          {p.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  {deploying && (
                    <div className="rounded-lg p-3 flex items-center gap-3" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                      <div className="typing-dots"><span /><span /><span /></div>
                      <span className="font-orbitron" style={{ fontSize: '9px', color: '#a855f7' }}>{t('missions_analyzing')}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg p-4 space-y-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '20px' }}>✅</span>
                    <span className="font-orbitron" style={{ fontSize: '10px', color: '#22c55e' }}>{t('missions_success_title')}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    <strong className="text-white">{deployResult.tasksCreated}</strong> {t('missions_success_body')}
                  </div>
                  <div className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>PROJECT ID: {deployResult.projectMissionId}</div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2" style={{ borderColor: '#2A1622' }}>
              {!deployResult ? (
                <>
                  <button
                    onClick={deployToTeam}
                    disabled={deploying || !teamForm.description}
                    className="flex-1 font-orbitron py-2 rounded text-sm font-bold transition-all"
                    style={{ background: deploying || !teamForm.description ? '#2A1622' : 'rgba(168,85,247,0.8)', color: deploying || !teamForm.description ? '#374151' : '#fff', letterSpacing: '0.08em' }}
                  >
                    {deploying ? t('missions_analyzing') : t('missions_deploy_to_team_btn')}
                  </button>
                  <button onClick={() => { setShowTeamModal(false); setDeployResult(null); setShowTeamTplPicker(false) }} className="px-4 py-2 rounded text-xs font-orbitron" style={{ background: '#181218', border: '1px solid #2A1622', color: '#64748b' }}>
                    {t('missions_cancel_team')}
                  </button>
                </>
              ) : (
                <button onClick={() => { setShowTeamModal(false); setDeployResult(null); setTeamForm({ description: '', priority: 'high' }); setShowTeamTplPicker(false) }} className="flex-1 btn-deploy">
                  {t('missions_view_result')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Mission Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: '#181218', border: '1px solid #2A1622' }}>
            <div className="p-5 border-b" style={{ borderColor: '#181218' }}>
              <span className="font-orbitron text-xs font-bold text-white" style={{ letterSpacing: '0.08em' }}>DEPLOY NEW MISSION</span>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>MISSION TITLE</label>
                <input type="text" placeholder="e.g. วิเคราะห์คู่แข่ง" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="gank-input" />
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>AGENT</label>
                <select value={form.agent_id} onChange={(e) => setForm((f) => ({ ...f, agent_id: e.target.value }))} className="gank-input">
                  {agents.map((a) => <option key={a.id} value={a.id}>{lang === 'EN' && a.name_en ? a.name_en : a.name} ({a.team})</option>)}
                </select>
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>PRIORITY</label>
                <div className="flex gap-2">
                  {['low', 'normal', 'high', 'urgent'].map((p) => (
                    <button key={p} onClick={() => setForm((f) => ({ ...f, priority: p }))}
                      className="flex-1 py-1.5 rounded font-orbitron text-xs transition-all"
                      style={form.priority === p
                        ? { background: p === 'urgent' ? '#ef4444' : p === 'high' ? '#f59e0b' : p === 'low' ? '#374151' : '#2d7fff', color: '#fff', fontSize: '9px', letterSpacing: '0.05em' }
                        : { background: '#181218', border: '1px solid #2A1622', color: '#374151', fontSize: '9px', letterSpacing: '0.05em' }}>
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>MISSION BRIEF</label>
                <textarea rows={4} placeholder="อธิบายงานที่ต้องการให้ agent ทำ..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="gank-input resize-none" />
              </div>
              {/* Auto-run toggle */}
              <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#0A0709', border: '1px solid #181218' }}>
                <div>
                  <div className="font-orbitron" style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.08em' }}>AUTO-EXECUTE</div>
                  <div style={{ fontSize: '8px', color: '#374151' }}>รันทันทีหลัง deploy</div>
                </div>
                <button
                  onClick={() => setAutoRun(v => !v)}
                  className="relative rounded-full transition-colors"
                  style={{ width: 36, height: 20, background: autoRun ? '#10b981' : '#1f2937' }}
                >
                  <span className="absolute rounded-full bg-white transition-all"
                    style={{ width: 14, height: 14, top: 3, left: autoRun ? 19 : 3 }} />
                </button>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2" style={{ borderColor: '#181218' }}>
              <button onClick={createMission} disabled={creating || !form.title || !form.description} className="btn-deploy flex-1">
                {creating ? 'DEPLOYING...' : autoRun ? 'DEPLOY & EXECUTE' : 'DEPLOY'}
              </button>
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded text-xs font-orbitron" style={{ background: '#181218', border: '1px solid #2A1622', color: '#64748b', letterSpacing: '0.08em' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-2xl rounded-xl overflow-hidden" style={{ background: '#181218', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div className="p-5 border-b" style={{ borderColor: '#2A1622' }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '18px' }}>📋</span>
                <span className="font-orbitron text-xs font-bold text-white" style={{ letterSpacing: '0.08em' }}>MISSION TEMPLATES</span>
              </div>
              <p className="mt-1" style={{ fontSize: '10px', color: '#475569' }}>เลือก template แล้วกรอกแค่ตัวแปร — deploy ได้ทันที</p>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {!selectedTpl ? (
                <div className="grid grid-cols-2 gap-2">
                  {templates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => applyTemplate(tpl)}
                      className="text-left p-3 rounded-lg transition-all hover:border-amber-500/40"
                      style={{ background: '#0f1420', border: '1px solid #2A1622' }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span style={{ fontSize: '16px' }}>{tpl.icon}</span>
                        <span className="text-xs font-medium text-white">{tpl.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {tpl.agent_name && (
                          <span className="font-orbitron px-1.5 py-0.5 rounded" style={{
                            fontSize: '7px',
                            background: `${TPL_CAT_COLOR[tpl.category] || '#374151'}20`,
                            color: TPL_CAT_COLOR[tpl.category] || '#374151',
                            border: `1px solid ${TPL_CAT_COLOR[tpl.category] || '#374151'}40`,
                          }}>
                            {tpl.agent_name}
                          </span>
                        )}
                        <span className="font-orbitron" style={{ fontSize: '7px', color: '#374151' }}>
                          {tpl.category.toUpperCase()}
                        </span>
                        {tpl.usage_count > 0 && (
                          <span className="font-orbitron" style={{ fontSize: '7px', color: '#374151' }}>
                            · used {tpl.usage_count}x
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                /* Variable input form */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ fontSize: '20px' }}>{selectedTpl.icon}</span>
                    <span className="text-sm font-medium text-white">{selectedTpl.name}</span>
                  </div>
                  {JSON.parse(selectedTpl.variables_json || '[]').map((v: string) => (
                    <div key={v}>
                      <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#f59e0b', letterSpacing: '0.08em' }}>
                        {`{${v}}`}
                      </label>
                      <input
                        type="text"
                        placeholder={`กรอก ${v}...`}
                        value={tplVars[v] || ''}
                        onChange={(e) => setTplVars(prev => ({ ...prev, [v]: e.target.value }))}
                        className="gank-input"
                        autoFocus={JSON.parse(selectedTpl.variables_json)[0] === v}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2" style={{ borderColor: '#2A1622' }}>
              {selectedTpl ? (
                <>
                  <button
                    onClick={applyTplVars}
                    className="flex-1 font-orbitron py-2 rounded text-sm font-bold"
                    style={{ background: 'rgba(245,158,11,0.8)', color: '#fff', letterSpacing: '0.08em' }}
                  >
                    ⚡ APPLY & DEPLOY
                  </button>
                  <button onClick={() => setSelectedTpl(null)} className="px-4 py-2 rounded text-xs font-orbitron" style={{ background: '#181218', border: '1px solid #2A1622', color: '#64748b' }}>
                    BACK
                  </button>
                </>
              ) : (
                <button onClick={() => setShowTemplates(false)} className="w-full py-2 rounded font-orbitron text-xs" style={{ background: '#181218', border: '1px solid #2A1622', color: '#64748b' }}>
                  CANCEL
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
