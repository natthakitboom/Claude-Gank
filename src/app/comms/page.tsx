'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { Agent } from '@/lib/types'
import PixelSprite from '@/components/PixelSprite'
import { ArrowRight, Play, Loader2, RefreshCw, ExternalLink, Zap } from 'lucide-react'

const TYPE_COLOR: Record<string, { bg: string; border: string; label: string; text: string }> = {
  task:      { bg: '#001a40', border: '#0066ff66', label: '#60a5fa', text: 'TASK' },
  message:   { bg: '#0a0e14', border: '#1a2535',   label: '#64748b', text: 'MSG' },
  result:    { bg: '#001a0a', border: '#00802066', label: '#4ade80', text: 'RESULT' },
  broadcast: { bg: '#1a000a', border: '#ff006666', label: '#f87171', text: 'BROADCAST' },
  alert:     { bg: '#1a0a00', border: '#ff660066', label: '#fb923c', text: 'ALERT' },
}

interface MessageRow {
  id: string
  from_agent: string
  to_agent: string | null
  type: string
  content: string
  created_at: string
  mission_id: string | null
  metadata_json: string
  from_agent_name: string
  from_agent_sprite: string
  to_agent_name: string | null
  to_agent_sprite: string | null
}

interface MissionStatus {
  id: string
  title: string
  status: string
  agent_name: string
}

export default function CommsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [missionStatuses, setMissionStatuses] = useState<Record<string, MissionStatus>>({})
  const [filterAgent, setFilterAgent] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [sending, setSending] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [runningMsg, setRunningMsg] = useState<string | null>(null)
  const [form, setForm] = useState({ from_agent: '', to_agent: '', type: 'task', content: '', title: '' })
  const feedRef = useRef<HTMLDivElement>(null)

  const fetchAgents = useCallback(async () => {
    const res = await fetch('/api/agents')
    const data = await res.json()
    setAgents(data)
    if (data.length > 0 && !form.from_agent) setForm(f => ({ ...f, from_agent: data[0].id }))
  }, [form.from_agent])

  const fetchMessages = useCallback(async () => {
    let url = '/api/messages?limit=100'
    if (filterAgent !== 'all') url += `&agent_id=${filterAgent}`
    const res = await fetch(url)
    const data: MessageRow[] = await res.json()
    setMessages(data)

    // Fetch spawned mission statuses for n2n task messages
    const spawnedIds: string[] = []
    for (const msg of data) {
      try {
        const meta = JSON.parse(msg.metadata_json || '{}')
        if (meta.spawned_mission_id) spawnedIds.push(meta.spawned_mission_id)
      } catch {}
    }
    if (spawnedIds.length > 0) {
      const statuses: Record<string, MissionStatus> = {}
      await Promise.all(spawnedIds.map(async id => {
        try {
          const r = await fetch(`/api/missions/${id}`)
          if (r.ok) {
            const m = await r.json()
            statuses[id] = { id: m.id, title: m.title, status: m.status, agent_name: m.agent_name }
          }
        } catch {}
      }))
      setMissionStatuses(prev => ({ ...prev, ...statuses }))
    }
  }, [filterAgent])

  useEffect(() => { fetchAgents() }, [])
  useEffect(() => {
    fetchMessages()
    const i = setInterval(fetchMessages, 3000)
    return () => clearInterval(i)
  }, [fetchMessages])

  // Manually run a task message → create mission + execute
  const runTaskMessage = async (msg: MessageRow) => {
    if (!msg.to_agent || runningMsg === msg.id) return
    setRunningMsg(msg.id)
    try {
      const toAgent = agents.find(a => a.id === msg.to_agent)
      if (!toAgent) return

      const missionRes = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[N2N Manual] Task to ${toAgent.name}`,
          description: msg.content,
          agent_id: msg.to_agent,
          priority: 'high',
        }),
      })
      const newMission = await missionRes.json()

      // Update message metadata with spawned_mission_id
      const meta = { spawned_mission_id: newMission.id, n2n: true, manual: true }
      await fetch(`/api/messages/${msg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata_json: JSON.stringify(meta) }),
      })

      // Execute mission (fire and forget)
      fetch(`/api/missions/${newMission.id}/execute`, { method: 'POST' }).catch((e) => console.error('[comms] spawn failed for mission', newMission.id, e.message))
      setTimeout(fetchMessages, 1000)
    } finally {
      setRunningMsg(null)
    }
  }

  const sendMessage = async () => {
    if (!form.from_agent || !form.content) return
    setSending(true)
    try {
      const body: any = {
        from_agent: form.from_agent,
        to_agent: form.to_agent || null,
        type: form.type,
        content: form.content,
      }

      const msgRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const msg = await msgRes.json()

      // If task type with recipient → auto-execute
      if (form.type === 'task' && form.to_agent) {
        const missionRes = await fetch('/api/missions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title || `[N2N] Task to ${agents.find(a => a.id === form.to_agent)?.name}`,
            description: form.content,
            agent_id: form.to_agent,
            priority: 'high',
          }),
        })
        const newMission = await missionRes.json()
        const meta = JSON.stringify({ spawned_mission_id: newMission.id, n2n: true })
        await fetch(`/api/messages/${msg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metadata_json: meta }),
        })
        fetch(`/api/missions/${newMission.id}/execute`, { method: 'POST' }).catch((e) => console.error('[comms] spawn failed for mission', newMission.id, e.message))
      }

      setForm(f => ({ ...f, content: '', title: '' }))
      setShowCompose(false)
      setTimeout(fetchMessages, 500)
    } finally { setSending(false) }
  }

  const filtered = messages.filter(m => {
    if (filterType !== 'all' && m.type !== filterType) return false
    return true
  })

  // Count n2n messages (with spawned_mission_id)
  const n2nCount = messages.filter(m => {
    try { return JSON.parse(m.metadata_json || '{}').n2n } catch { return false }
  }).length

  const statusDot: Record<string, string> = {
    done: '#4ade80', running: '#f59e0b', pending: '#60a5fa', failed: '#f87171', waiting: '#a855f7',
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#070b10', color: '#e2e8f0' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #111820', background: '#0a0e14' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-orbitron font-bold text-white" style={{ fontSize: '22px', letterSpacing: '0.05em' }}>
              COMMS
              <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded" style={{ background: '#001a40', color: '#60a5fa', border: '1px solid #0066ff44', fontSize: '9px', letterSpacing: '0.08em' }}>
                N2N ENABLED
              </span>
            </h1>
            <p className="font-orbitron mt-0.5" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.1em' }}>
              // INTER-AGENT COMMUNICATION · {messages.length} messages · {n2nCount} n2n chains
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchMessages} className="p-2 rounded text-gray-600 hover:text-gray-400 transition-colors" style={{ background: '#0d1117', border: '1px solid #1a2535' }}>
              <RefreshCw size={13} />
            </button>
            <button onClick={() => setShowCompose(true)} className="btn-deploy flex items-center gap-1.5">
              <Zap size={12} /> SEND TO AGENT
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          {/* Agent filter */}
          <button onClick={() => setFilterAgent('all')}
            className="font-orbitron text-xs px-2.5 py-1 rounded transition-all"
            style={filterAgent === 'all'
              ? { background: 'rgba(0,229,255,0.12)', color: '#00e5ff', fontSize: '9px', letterSpacing: '0.08em', border: '1px solid #00e5ff30' }
              : { background: '#0d1117', color: '#374151', fontSize: '9px', letterSpacing: '0.08em', border: '1px solid #1a2535' }}>
            ALL AGENTS
          </button>
          {agents.map(a => (
            <button key={a.id} onClick={() => setFilterAgent(a.id)}
              className="flex items-center gap-1.5 px-2 py-1 rounded transition-all"
              style={filterAgent === a.id
                ? { background: 'rgba(0,229,255,0.1)', border: '1px solid #00e5ff33' }
                : { background: '#0d1117', border: '1px solid #1a2535' }}>
              <PixelSprite agentId={a.id} size={14} />
              <span className="text-xs" style={{ color: filterAgent === a.id ? '#e2e8f0' : '#4b5563', fontSize: '10px' }}>{a.name}</span>
            </button>
          ))}

          <div className="w-px h-4 mx-1" style={{ background: '#1a2535' }} />

          {/* Type filter */}
          {['all', 'task', 'message', 'result', 'broadcast'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className="font-orbitron px-2 py-1 rounded transition-all"
              style={{
                fontSize: '8px', letterSpacing: '0.08em',
                background: filterType === t ? (TYPE_COLOR[t]?.bg || '#0d1117') : '#0d1117',
                color: filterType === t ? (TYPE_COLOR[t]?.label || '#00e5ff') : '#374151',
                border: `1px solid ${filterType === t ? (TYPE_COLOR[t]?.border || '#00e5ff30') : '#1a2535'}`,
              }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Message Feed ───────────────────────────────────────────────── */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20 font-orbitron" style={{ color: '#1f2937', fontSize: '10px', letterSpacing: '0.1em' }}>
            // NO TRANSMISSIONS DETECTED
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(msg => {
              const tc = TYPE_COLOR[msg.type] || TYPE_COLOR.message
              let meta: any = {}
              try { meta = JSON.parse(msg.metadata_json || '{}') } catch {}
              const spawnedId = meta.spawned_mission_id
              const spawnedStatus = spawnedId ? missionStatuses[spawnedId] : null
              const isN2N = meta.n2n

              return (
                <div key={msg.id} className="rounded-lg overflow-hidden transition-all"
                  style={{ background: tc.bg, border: `1px solid ${tc.border}` }}>
                  {/* Message header */}
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    {/* From agent */}
                    <PixelSprite agentId={msg.from_agent} size={26} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white">{msg.from_agent_name}</span>
                    </div>

                    {/* Arrow + To agent */}
                    {msg.to_agent ? (
                      <>
                        <ArrowRight size={12} style={{ color: tc.label, flexShrink: 0 }} />
                        <PixelSprite agentId={msg.to_agent} size={26} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-white">{msg.to_agent_name}</span>
                        </div>
                      </>
                    ) : msg.type === 'broadcast' ? (
                      <>
                        <ArrowRight size={12} style={{ color: '#f87171', flexShrink: 0 }} />
                        <span className="font-orbitron" style={{ fontSize: '9px', color: '#f87171', letterSpacing: '0.08em' }}>ALL AGENTS</span>
                      </>
                    ) : null}

                    <div className="flex-1" />

                    {/* Tags */}
                    <div className="flex items-center gap-1.5">
                      {isN2N && (
                        <span className="font-orbitron px-1.5 py-0.5 rounded"
                          style={{ fontSize: '7px', letterSpacing: '0.1em', background: '#001a40', color: '#60a5fa', border: '1px solid #0066ff44' }}>
                          N2N
                        </span>
                      )}
                      <span className="font-orbitron px-1.5 py-0.5 rounded"
                        style={{ fontSize: '7px', letterSpacing: '0.1em', background: tc.bg, color: tc.label, border: `1px solid ${tc.border}` }}>
                        {tc.text}
                      </span>
                      <span className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>
                        {new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-4 pb-3">
                    <div className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#94a3b8', fontSize: '11px' }}>
                      {msg.content.slice(0, 400)}{msg.content.length > 400 ? '…' : ''}
                    </div>
                  </div>

                  {/* N2N Mission Status bar */}
                  {(spawnedId || msg.type === 'task') && (
                    <div className="flex items-center gap-2 px-4 py-2" style={{ borderTop: '1px solid #1a2535', background: '#070b10' }}>
                      {spawnedId && spawnedStatus ? (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: statusDot[spawnedStatus.status] || '#64748b', boxShadow: `0 0 4px ${statusDot[spawnedStatus.status] || '#64748b'}` }} />
                          <span className="text-xs font-mono" style={{ color: '#64748b', fontSize: '10px' }}>
                            Mission:
                          </span>
                          <span className="text-xs" style={{ color: '#94a3b8', fontSize: '10px' }}>
                            {spawnedStatus.title?.slice(0, 50)}
                          </span>
                          <span className="font-orbitron px-1.5 py-0.5 rounded" style={{
                            fontSize: '7px',
                            background: spawnedStatus.status === 'done' ? '#001a0a' : spawnedStatus.status === 'running' ? '#1a1000' : '#0d1117',
                            color: statusDot[spawnedStatus.status] || '#64748b',
                            border: `1px solid ${statusDot[spawnedStatus.status] || '#64748b'}44`,
                          }}>
                            {spawnedStatus.status.toUpperCase()}
                          </span>
                          <div className="flex-1" />
                          <a href={`/missions`} target="_blank"
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                            style={{ background: '#0d1117', border: '1px solid #1a2535', color: '#64748b' }}>
                            <ExternalLink size={9} />
                          </a>
                        </>
                      ) : msg.type === 'task' && msg.to_agent && !spawnedId ? (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-gray-600" />
                          <span className="text-xs font-mono flex-1" style={{ color: '#4b5563', fontSize: '10px' }}>Mission not started</span>
                          <button
                            onClick={() => runTaskMessage(msg)}
                            disabled={runningMsg === msg.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold disabled:opacity-50"
                            style={{ background: '#001a40', border: '1px solid #0066ff44', color: '#60a5fa' }}>
                            {runningMsg === msg.id
                              ? <><Loader2 size={9} className="animate-spin" /> Running…</>
                              : <><Play size={9} /> RUN TASK</>
                            }
                          </button>
                        </>
                      ) : spawnedId && !spawnedStatus ? (
                        <span className="text-xs font-mono" style={{ color: '#374151', fontSize: '10px' }}>
                          <Loader2 size={9} className="animate-spin inline mr-1" />Loading mission status…
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Compose Modal ──────────────────────────────────────────────── */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: '#0d1117', border: '1px solid #1a2535' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #111820' }}>
              <div>
                <span className="font-orbitron text-xs font-bold text-white" style={{ letterSpacing: '0.08em' }}>SEND TO AGENT</span>
                <p className="font-orbitron mt-0.5" style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.08em' }}>Task type → auto-executes mission for target agent</p>
              </div>
              <Zap size={14} style={{ color: '#00e5ff' }} />
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>FROM AGENT</label>
                  <select value={form.from_agent} onChange={e => setForm(f => ({ ...f, from_agent: e.target.value }))} className="gank-input">
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>TO AGENT</label>
                  <select value={form.to_agent} onChange={e => setForm(f => ({ ...f, to_agent: e.target.value }))} className="gank-input">
                    <option value="">BROADCAST ALL</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>TYPE</label>
                <div className="flex gap-2">
                  {['task', 'message', 'broadcast'].map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                      className="flex-1 py-1.5 rounded font-orbitron text-xs transition-all"
                      style={{
                        fontSize: '9px', letterSpacing: '0.08em',
                        background: form.type === t ? (TYPE_COLOR[t]?.bg || '#0d1117') : '#070b10',
                        color: form.type === t ? (TYPE_COLOR[t]?.label || '#e2e8f0') : '#374151',
                        border: `1px solid ${form.type === t ? (TYPE_COLOR[t]?.border || '#1a2535') : '#1a2535'}`,
                      }}>
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
                {form.type === 'task' && (
                  <p className="mt-1.5 font-orbitron" style={{ fontSize: '8px', color: '#60a5fa', letterSpacing: '0.06em' }}>
                    ⚡ Task จะสร้าง mission และ execute อัตโนมัติ
                  </p>
                )}
              </div>

              {form.type === 'task' && (
                <div>
                  <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>TASK TITLE (optional)</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="gank-input" placeholder="e.g. Implement auth module" />
                </div>
              )}

              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>CONTENT</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={5} className="gank-input resize-none"
                  placeholder={form.type === 'task'
                    ? 'อธิบายงานที่ต้องการให้ agent ทำ...\nรายละเอียด, requirement, context ที่จำเป็น'
                    : 'ข้อความที่ต้องการส่ง...'} />
              </div>
            </div>
            <div className="px-5 py-4 flex gap-2" style={{ borderTop: '1px solid #111820' }}>
              <button onClick={sendMessage} disabled={sending || !form.content || !form.from_agent}
                className="btn-deploy flex-1 flex items-center justify-center gap-1.5">
                {sending ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                {sending ? 'SENDING…' : form.type === 'task' ? 'DISPATCH TASK' : 'TRANSMIT'}
              </button>
              <button onClick={() => setShowCompose(false)}
                className="px-4 py-2 rounded text-xs font-orbitron"
                style={{ background: '#070b10', border: '1px solid #1a2535', color: '#64748b', letterSpacing: '0.08em' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
