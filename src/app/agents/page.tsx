'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Agent, Mission } from '@/lib/types'
import { MODEL_LABELS } from '@/lib/types'
import PixelSprite from '@/components/PixelSprite'
import { useLanguage } from '@/lib/i18n'

/* ── helpers ── */
const TEAM_DISPLAY: Record<string, string> = {
  CORE: 'CORE',
  TECH: 'TECH',
  CREATIVE: 'CREATIVE',
  BUSINESS: 'BIZ',
  FINANCE: 'FINANCE',
}

const TEAM_CAT_CLASS: Record<string, string> = {
  CORE: 'cat-core',
  TECH: 'cat-tech',
  CREATIVE: 'cat-creative',
  BUSINESS: 'cat-biz',
  FINANCE: 'cat-finance',
}

const TEAM_COLOR: Record<string, string> = {
  CORE: '#ff2d78',
  TECH: '#2d7fff',
  CREATIVE: '#a855f7',
  BUSINESS: '#22c55e',
  FINANCE: '#06b6d4',
}

const SHORT_MODEL: Record<string, string> = {
  'claude-haiku-4-5-20251001': 'haiku',
  'claude-sonnet-4-6': 'sonnet',
  'claude-opus-4-6': 'opus',
}

/* ── Agent Card ── */
function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const catClass = TEAM_CAT_CLASS[agent.team] || 'cat-tech'
  const label = TEAM_DISPLAY[agent.team] || agent.team
  const modelShort = SHORT_MODEL[agent.model] || agent.model
  const isWorking = agent.status === 'working'
  const { t } = useLanguage()

  return (
    <button
      onClick={onClick}
      className={`agent-card ${isWorking ? 'is-working' : ''} text-left w-full`}
    >
      {/* Category badge */}
      <div className="px-3 pt-3 pb-1">
        <span className={`cat-badge ${catClass}`}>{label}</span>
      </div>

      {/* Sprite */}
      <div className="py-3 flex items-center justify-center relative">
        <div className="sprite-box">
          <PixelSprite agentId={agent.id} size={72} />
        </div>
        <div className="scanlines" />
      </div>

      {/* Info */}
      <div className="px-3 pb-4 text-center">
        <div
          className="font-semibold text-sm truncate mb-2"
          style={{ color: '#cbd5e1', fontFamily: 'Noto Sans Thai, sans-serif' }}
        >
          {agent.name}
        </div>

        <div className="flex items-center justify-center gap-1.5">
          <span
            className={`status-dot ${agent.status}`}
          />
          <span
            className="font-orbitron"
            style={{
              fontSize: '9px',
              letterSpacing: '0.08em',
              color: isWorking ? '#10b981' : '#374151',
            }}
          >
            {isWorking ? t('working') : t('standby')}
          </span>
          <span style={{ color: '#1f2937', fontSize: '9px' }}>·</span>
          <span
            className="font-orbitron"
            style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.05em' }}
          >
            {modelShort}
          </span>
        </div>
      </div>
    </button>
  )
}

/* ── Main Content ── */
function AgentsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useLanguage()
  const selectedId = searchParams.get('selected')

  const [agents, setAgents] = useState<Agent[]>([])
  const [selected, setSelected] = useState<Agent | null>(null)
  const [missions, setMissions] = useState<(Mission & { agent_name: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetail, setShowDetail] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Agent>>({})
  const [analytics, setAnalytics] = useState<Record<string, number | string | null> | null>(null)

  const fetchAnalytics = async (agentId: string) => {
    const res = await fetch(`/api/agents/${agentId}?analytics=true`)
    const data = await res.json()
    setAnalytics(data.analytics || null)
  }

  const fetchAgents = async () => {
    const res = await fetch('/api/agents')
    const data = await res.json()
    setAgents(data)
    setLoading(false)
  }

  const fetchMissions = async (agentId: string) => {
    const res = await fetch(`/api/missions?agent_id=${agentId}`)
    const data = await res.json()
    setMissions(data)
  }

  useEffect(() => { fetchAgents() }, [])

  useEffect(() => {
    if (selectedId && agents.length > 0) {
      const agent = agents.find((a) => a.id === selectedId)
      if (agent) {
        setSelected(agent)
        fetchMissions(agent.id)
        fetchAnalytics(agent.id)
        setShowDetail(true)
      }
    }
  }, [selectedId, agents])

  const openAgent = (agent: Agent) => {
    setSelected(agent)
    fetchMissions(agent.id)
    fetchAnalytics(agent.id)
    setShowDetail(true)
    router.push(`/agents?selected=${agent.id}`, { scroll: false })
  }

  const closeDetail = () => {
    setShowDetail(false)
    setSelected(null)
    router.push('/agents', { scroll: false })
  }

  const openEdit = () => {
    if (!selected) return
    setEditForm({ ...selected })
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (!selected) return
    await fetch(`/api/agents/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setShowEditModal(false)
    await fetchAgents()
    const res = await fetch(`/api/agents/${selected.id}`)
    setSelected(await res.json())
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <span className="font-orbitron text-sm" style={{ color: '#374151', letterSpacing: '0.1em' }}>
        {t('loading_agents')}
      </span>
    </div>
  )

  const teamColor = selected ? TEAM_COLOR[selected.team] || '#2d7fff' : '#2d7fff'
  const modelShort = selected ? SHORT_MODEL[selected.model] || selected.model : ''

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-orbitron font-bold text-white" style={{ fontSize: '28px', letterSpacing: '0.05em' }}>
            {t('agents_title')}
          </h1>
          <p className="font-orbitron mt-1" style={{ fontSize: '10px', color: '#374151', letterSpacing: '0.1em' }}>
            {t('agents_subtitle')}
          </p>
        </div>
        <button className="btn-deploy">{t('deploy_new_agent')}</button>
      </div>

      {/* Grid */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}
      >
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onClick={() => openAgent(agent)} />
        ))}
      </div>

      {/* Detail Modal */}
      {showDetail && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeDetail() }}
        >
          <div
            className="w-full max-w-lg rounded-xl overflow-hidden"
            style={{ background: '#111827', border: `1px solid ${teamColor}33` }}
          >
            {/* Modal header */}
            <div className="p-5 border-b" style={{ borderColor: '#111820' }}>
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${teamColor}15`, border: `1px solid ${teamColor}33` }}
                >
                  <PixelSprite agentId={selected.id} size={48} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-white font-semibold text-base truncate">{selected.name}</h2>
                    <span className={`status-dot ${selected.status}`} />
                  </div>
                  <div className="text-xs mb-2" style={{ color: '#64748b' }}>{selected.role}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`cat-badge ${TEAM_CAT_CLASS[selected.team]}`}>
                      {TEAM_DISPLAY[selected.team] || selected.team}
                    </span>
                    <span
                      className="font-orbitron px-2 py-0.5 rounded text-xs"
                      style={{ background: '#111820', color: '#64748b', fontSize: '9px', letterSpacing: '0.05em' }}
                    >
                      {modelShort}
                    </span>
                    <span
                      className="font-orbitron px-2 py-0.5 rounded text-xs"
                      style={{
                        background: '#111820', fontSize: '9px', letterSpacing: '0.05em',
                        color: selected.effort === 'high' ? '#f59e0b' : selected.effort === 'low' ? '#374151' : '#64748b',
                      }}
                    >
                      {selected.effort.toUpperCase()} EFFORT
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={openEdit}
                    className="px-3 py-1.5 rounded text-xs transition-colors"
                    style={{ background: '#111820', border: '1px solid #1a2535', color: '#64748b' }}
                  >
                    {t('edit')}
                  </button>
                  <button
                    onClick={closeDetail}
                    className="px-3 py-1.5 rounded text-xs"
                    style={{ background: '#111820', border: '1px solid #1a2535', color: '#64748b' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
              {/* Analytics Scorecard */}
              {analytics && (
                <div className="rounded-lg p-3" style={{ background: '#080a0f', border: `1px solid ${teamColor}22` }}>
                  <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: teamColor, letterSpacing: '0.08em' }}>📊 SCORECARD</div>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[
                      { label: 'Missions', value: analytics.total_missions, color: '#2d7fff' },
                      { label: 'Success', value: `${analytics.success_rate}%`, color: Number(analytics.success_rate) >= 80 ? '#22c55e' : '#f59e0b' },
                      { label: 'Tokens', value: Number(analytics.total_tokens || 0).toLocaleString(), color: '#a855f7' },
                      { label: 'Cost', value: `$${analytics.estimated_cost_usd}`, color: '#06b6d4' },
                    ].map(s => (
                      <div key={s.label} className="text-center rounded px-1 py-1.5" style={{ background: '#0d1117', border: '1px solid #1a2535' }}>
                        <div className="font-bold text-white text-sm leading-none">{s.value}</div>
                        <div className="font-orbitron mt-0.5" style={{ fontSize: '7px', color: s.color, letterSpacing: '0.05em' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Done', value: analytics.done_missions, color: '#22c55e' },
                      { label: 'Failed', value: analytics.failed_missions, color: Number(analytics.failed_missions) > 0 ? '#ef4444' : '#374151' },
                      { label: 'Memories', value: `${analytics.total_memories}${Number(analytics.key_learnings) > 0 ? ` (${analytics.key_learnings} KL)` : ''}`, color: '#f59e0b' },
                    ].map(s => (
                      <div key={s.label} className="flex items-center justify-between rounded px-2 py-1" style={{ background: '#0d1117', border: '1px solid #1a2535' }}>
                        <span className="font-orbitron" style={{ fontSize: '7px', color: '#374151' }}>{s.label}</span>
                        <span className="font-orbitron font-bold" style={{ fontSize: '9px', color: s.color }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                  {analytics.last_completed && (
                    <div className="font-orbitron mt-2 text-right" style={{ fontSize: '7px', color: '#374151' }}>
                      Last active: {new Date(analytics.last_completed as string).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg p-3" style={{ background: '#080a0f', border: '1px solid #111820' }}>
                <div className="font-orbitron mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{t('personality')}</div>
                <div className="text-sm" style={{ color: '#94a3b8' }}>{selected.personality}</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#080a0f', border: '1px solid #111820' }}>
                <div className="font-orbitron mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{t('system_prompt')}</div>
                <div className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{selected.system_prompt}</div>
              </div>

              {/* Mission history */}
              <div>
                <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>
                  {t('mission_history')} ({missions.length})
                </div>
                {missions.length === 0 ? (
                  <div
                    className="text-center py-6 rounded-lg text-xs font-orbitron"
                    style={{ background: '#080a0f', border: '1px solid #111820', color: '#1f2937', letterSpacing: '0.08em' }}
                  >
                    {t('no_missions_yet')}
                  </div>
                ) : missions.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="mission-card rounded-lg p-3 mb-2"
                    style={{ background: '#080a0f', border: '1px solid #111820' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{m.title}</div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: '#374151' }}>
                          {new Date(m.created_at).toLocaleString('th-TH')}
                        </div>
                      </div>
                      <span
                        className="font-orbitron text-xs px-2 py-0.5 rounded flex-shrink-0"
                        style={{
                          fontSize: '9px', letterSpacing: '0.05em',
                          background: m.status === 'done' ? 'rgba(34,197,94,0.15)' : m.status === 'running' ? 'rgba(59,130,246,0.15)' : m.status === 'failed' ? 'rgba(239,68,68,0.15)' : '#111820',
                          color: m.status === 'done' ? '#22c55e' : m.status === 'running' ? '#3b82f6' : m.status === 'failed' ? '#ef4444' : '#374151',
                        }}
                      >
                        {m.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}>
          <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1a2535' }}>
            <div className="p-5 border-b" style={{ borderColor: '#111820' }}>
              <span className="font-orbitron text-xs font-bold text-white" style={{ letterSpacing: '0.08em' }}>{t('edit_agent')}</span>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {([
                { key: 'name', label: t('name') },
                { key: 'role', label: t('role') },
                { key: 'sprite', label: t('sprite') },
              ] as { key: keyof Agent; label: string }[]).map(({ key, label }) => (
                <div key={String(key)}>
                  <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{label}</label>
                  <input
                    type="text"
                    value={String(editForm[key] || '')}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="gank-input"
                  />
                </div>
              ))}
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{t('model')}</label>
                <select
                  value={editForm.model || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))}
                  className="gank-input"
                >
                  {Object.entries(MODEL_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{t('effort')}</label>
                <select
                  value={editForm.effort || 'normal'}
                  onChange={(e) => setEditForm((f) => ({ ...f, effort: e.target.value as Agent['effort'] }))}
                  className="gank-input"
                >
                  <option value="low">LOW</option>
                  <option value="normal">NORMAL</option>
                  <option value="high">HIGH</option>
                </select>
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{t('personality')}</label>
                <textarea
                  value={editForm.personality || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, personality: e.target.value }))}
                  rows={2}
                  className="gank-input resize-none"
                />
              </div>
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{t('system_prompt')}</label>
                <textarea
                  value={editForm.system_prompt || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, system_prompt: e.target.value }))}
                  rows={4}
                  className="gank-input resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t flex gap-2" style={{ borderColor: '#111820' }}>
              <button onClick={saveEdit} className="btn-deploy flex-1">{t('save')}</button>
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded text-xs font-orbitron"
                style={{ background: '#111820', border: '1px solid #1a2535', color: '#64748b', letterSpacing: '0.08em' }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AgentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <span className="font-orbitron text-sm" style={{ color: '#374151', letterSpacing: '0.1em' }}>
          LOADING...
        </span>
      </div>
    }>
      <AgentsContent />
    </Suspense>
  )
}
