'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Agent, Mission } from '@/lib/types'
import { MODEL_LABELS } from '@/lib/types'
import PixelSprite from '@/components/PixelSprite'
import OfficeLive from '@/components/OfficeLive'
import { useLanguage, type TranslationKey } from '@/lib/i18n'

/* ── constants ── */
const TEAM_ORDER = ['CORE', 'TECH', 'CREATIVE', 'BUSINESS', 'FINANCE'] as const

const TEAM_KEY: Record<string, TranslationKey> = {
  CORE: 'team_core',
  TECH: 'team_tech',
  CREATIVE: 'team_creative',
  BUSINESS: 'team_biz',
  FINANCE: 'team_finance',
}

const TEAM_COLOR: Record<string, string> = {
  CORE:     '#ff2d78',
  TECH:     '#2d7fff',
  CREATIVE: '#a855f7',
  BUSINESS: '#22c55e',
  FINANCE:  '#06b6d4',
}

const TEAM_GLYPH: Record<string, string> = {
  CORE: '◆', TECH: '⬡', CREATIVE: '✦', BUSINESS: '▲', FINANCE: '●',
}

const SHORT_MODEL: Record<string, string> = {
  'claude-haiku-4-5-20251001': 'Haiku',
  'claude-sonnet-4-6': 'Sonnet',
  'claude-opus-4-6': 'Opus',
}

const MODEL_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  'claude-haiku-4-5-20251001': { bg: '#0a1a2e', border: '#1e4d7a', text: '#4da6e0' },
  'claude-sonnet-4-6':         { bg: '#1a0e2e', border: '#5a2d9a', text: '#b07aff' },
  'claude-opus-4-6':           { bg: '#2e1a0a', border: '#9a5a1e', text: '#ffaa4d' },
}

/* ── status dot color ── */
const STATUS_COLOR: Record<string, string> = {
  working: '#22c55e',
  idle:    '#374151',
  done:    '#2d7fff',
  error:   '#ef4444',
}

/* ── AgentSideCard ── */
function AgentSideCard({
  agent, selected, lang, onClick, onDelete,
}: { agent: Agent; selected: boolean; lang: string; onClick: () => void; onDelete: () => void }) {
  const displayName = lang === 'EN' && agent.name_en ? agent.name_en : agent.name
  const tc = TEAM_COLOR[agent.team] || '#635C8A'
  const isWorking = agent.status === 'working'

  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all relative overflow-hidden${isWorking ? ' agent-card-shimmer' : ''}`}
      style={{
        background: selected ? `${tc}12` : isWorking ? 'rgba(34,197,94,0.05)' : 'transparent',
        borderLeft: `2px solid ${selected ? tc : isWorking ? '#22c55e' : 'transparent'}`,
      }}
    >
      {/* hover bg */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: `${tc}08` }}
      />

      {/* working — animated left border breathe */}
      {isWorking && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5"
          style={{
            background: 'linear-gradient(180deg, transparent, #22c55e, transparent)',
            animation: 'agent-border-breathe 1.2s ease-in-out infinite',
          }}
        />
      )}

      {/* sprite */}
      <div className={`relative flex-shrink-0${isWorking ? ' agent-working-ring' : ''}`}>
        <PixelSprite agentId={agent.id} size={32} />
        {isWorking && (
          <span
            className="absolute -bottom-0.5 -right-0.5 rounded-full"
            style={{ width: 8, height: 8, background: '#22c55e', boxShadow: '0 0 8px #22c55e, 0 0 16px rgba(34,197,94,0.4)', border: '1.5px solid #09080f' }}
          />
        )}
      </div>

      {/* info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div
            className="text-sm font-medium truncate leading-tight"
            style={{ color: selected ? '#fff' : isWorking ? '#ffffff' : '#9591b4', fontSize: 12 }}
          >
            {displayName}
          </div>
          {isWorking && (
            <span
              className="font-orbitron flex-shrink-0 px-1 py-px rounded"
              style={{ fontSize: 6.5, letterSpacing: '0.08em', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.35)', animation: 'agent-border-breathe 1.2s ease-in-out infinite' }}
            >
              WORKING
            </span>
          )}
        </div>
        <div className="truncate leading-tight mt-0.5" style={{ fontSize: 9.5, color: isWorking ? '#4ade80' : '#4b5563' }}>
          {agent.role}
        </div>
      </div>

      {/* model badge */}
      {(() => {
        const mc = MODEL_COLOR[agent.model] || { bg: '#0d0b18', border: '#1a1530', text: '#4b5563' }
        return (
          <div
            className="font-orbitron flex-shrink-0 px-1.5 py-0.5 rounded"
            style={{ fontSize: 8, letterSpacing: '0.05em', background: mc.bg, color: mc.text, border: `1px solid ${mc.border}`, fontWeight: 700 }}
          >
            {SHORT_MODEL[agent.model] || 'AI'}
          </div>
        )
      })()}

      {/* delete ✕ — visible on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center"
        style={{ width: 16, height: 16, background: '#1a0810', border: '1px solid #3d1020', color: '#6b2030', fontSize: 9 }}
        title="ลบ agent"
      >✕</button>
    </button>
  )
}

type CreateForm = {
  name: string; name_en: string; role: string; team: string
  model: string; effort: string; personality: string; system_prompt: string
  sprite: string; color: string
}
const EMPTY_CREATE: CreateForm = {
  name: '', name_en: '', role: '', team: 'TECH',
  model: 'claude-haiku-4-5-20251001', effort: 'normal', personality: '', system_prompt: '',
  sprite: '🤖', color: '#3b82f6',
}

/* ── Main Content ── */
function AgentsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t, lang } = useLanguage()
  const selectedIdParam = searchParams.get('selected')

  const [agents, setAgents] = useState<Agent[]>([])
  const [selected, setSelected] = useState<Agent | null>(null)
  const [missions, setMissions] = useState<(Mission & { agent_name: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Agent>>({})
  const [analytics, setAnalytics] = useState<Record<string, number | string | null> | null>(null)
  const [teamFilter, setTeamFilter] = useState<string>('ALL')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Agent | null>(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      setAgents(await res.json())
    } finally { setLoading(false) }
  }

  const fetchMissions = async (agentId: string) => {
    const res = await fetch(`/api/missions?agent_id=${agentId}`)
    setMissions(await res.json())
  }

  const fetchAnalytics = async (agentId: string) => {
    const res = await fetch(`/api/agents/${agentId}?analytics=true`)
    const data = await res.json()
    setAnalytics(data.analytics || null)
  }

  useEffect(() => {
    fetchAgents()
    const iv = setInterval(fetchAgents, 8000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (selectedIdParam && agents.length > 0) {
      const agent = agents.find((a) => a.id === selectedIdParam)
      if (agent) { setSelected(agent); fetchMissions(agent.id); fetchAnalytics(agent.id); setPanelOpen(true) }
    }
  }, [selectedIdParam, agents])

  const openAgent = (agent: Agent) => {
    setSelected(agent); fetchMissions(agent.id); fetchAnalytics(agent.id); setPanelOpen(true)
    router.push(`/agents?selected=${agent.id}`, { scroll: false })
  }
  const closePanel = () => { setPanelOpen(false); setSelected(null); router.push('/agents', { scroll: false }) }
  const openEdit = () => { if (!selected) return; setEditForm({ ...selected }); setShowEditModal(true) }
  const saveEdit = async () => {
    if (!selected) return
    try {
      const res = await fetch(`/api/agents/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`Save failed: ${err.error || res.status}`)
        return
      }
      setShowEditModal(false)
      await fetchAgents()
      const updated = await fetch(`/api/agents/${selected.id}`)
      setSelected(await updated.json())
    } catch (e) {
      alert(`Save failed: ${String(e)}`)
    }
  }

  const autoGenerate = async (form: CreateForm): Promise<CreateForm> => {
    const needsGen = !form.name_en || !form.personality || !form.system_prompt
    if (!needsGen) return form
    const res = await fetch('/api/agents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, role: form.role, team: form.team }),
    })
    const gen = await res.json()
    if (!res.ok) { setGenError(gen.error || 'Generation failed'); return form }
    setGenError('')
    return {
      ...form,
      name_en: form.name_en || gen.name_en || '',
      personality: form.personality || gen.personality || '',
      system_prompt: form.system_prompt || gen.system_prompt || '',
      sprite: gen.sprite || form.sprite,
      color: gen.color || form.color,
    }
  }

  const createAgent = async () => {
    if (!createForm.name || !createForm.role) return
    setCreating(true)
    try {
      const needsGen = !createForm.name_en || !createForm.personality || !createForm.system_prompt
      const finalForm = needsGen ? await autoGenerate(createForm) : createForm
      setCreateForm(finalForm)
      await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(finalForm) })
      setShowCreateModal(false); setCreateForm(EMPTY_CREATE); await fetchAgents()
    } finally { setCreating(false) }
  }

  const generateFields = async () => {
    if (!createForm.name || !createForm.role || generating) return
    setGenerating(true)
    setGenError('')
    try {
      const gen = await autoGenerate(createForm)
      setCreateForm(gen)
    } finally { setGenerating(false) }
  }

  const deleteAgent = async (agent: Agent) => {
    await fetch(`/api/agents/${agent.id}`, { method: 'DELETE' })
    setConfirmDelete(null)
    if (selected?.id === agent.id) closePanel()
    await fetchAgents()
  }

  const activeCount = agents.filter((a) => a.status === 'working').length
  const tc = selected ? TEAM_COLOR[selected.team] || '#635C8A' : '#635C8A'
  const selectedDisplayName = selected ? (lang === 'EN' && selected.name_en ? selected.name_en : selected.name) : ''

  const rosterByTeam = TEAM_ORDER.map((team) => ({
    team,
    agents: agents.filter((a) => a.team === team && (teamFilter === 'ALL' || teamFilter === team)),
  })).filter((g) => g.agents.length > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: '#09080f' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="typing-dots" />
          <span className="font-orbitron text-xs" style={{ color: '#3d3660', letterSpacing: '0.12em' }}>{t('loading_agents')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: '#09080f' }}>

      {/* ── TOP HEADER ── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-5"
        style={{ height: 52, background: '#0d0b18', borderBottom: '1px solid #1a1530' }}
      >
        {/* left: title */}
        <div className="flex items-center gap-3">
          <h1 className="font-orbitron font-bold text-white" style={{ fontSize: 14, letterSpacing: '0.1em' }}>
            {t('agents_title')}
          </h1>
          <span className="font-orbitron" style={{ fontSize: 9, color: '#3d3660', letterSpacing: '0.06em' }}>
            {agents.length} {t('agents_count')}
          </span>
          {activeCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
              style={{ background: '#22c55e12', border: '1px solid #22c55e33' }}
            >
              <span className="inline-block rounded-full" style={{ width: 5, height: 5, background: '#22c55e', boxShadow: '0 0 6px #22c55e', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span className="font-orbitron" style={{ fontSize: 8, color: '#22c55e', letterSpacing: '0.06em' }}>
                {activeCount} {t('active')}
              </span>
            </div>
          )}
        </div>

        {/* right: team pills + deploy */}
        <div className="flex items-center gap-2">
          {/* team filter pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTeamFilter('ALL')}
              className="font-orbitron px-2.5 py-1 rounded-full transition-all"
              style={{
                fontSize: 8, letterSpacing: '0.06em',
                background: teamFilter === 'ALL' ? '#635C8A22' : 'transparent',
                border: `1px solid ${teamFilter === 'ALL' ? '#635C8A' : '#1a1530'}`,
                color: teamFilter === 'ALL' ? '#a89fd4' : '#3d3660',
              }}
            >ALL</button>
            {TEAM_ORDER.map((team) => {
              const active = teamFilter === team
              const color = TEAM_COLOR[team]
              return (
                <button key={team} onClick={() => setTeamFilter(active ? 'ALL' : team)}
                  className="font-orbitron px-2.5 py-1 rounded-full transition-all"
                  style={{
                    fontSize: 8, letterSpacing: '0.06em',
                    background: active ? `${color}22` : 'transparent',
                    border: `1px solid ${active ? color : '#1a1530'}`,
                    color: active ? color : '#3d3660',
                    boxShadow: active ? `0 0 8px ${color}44` : undefined,
                  }}
                >
                  {TEAM_GLYPH[team]}
                </button>
              )
            })}
          </div>

          <div style={{ width: 1, height: 20, background: '#1a1530' }} />

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-deploy"
            style={{ fontSize: 10, padding: '5px 12px' }}
          >
            {t('deploy_new_agent')}
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── LEFT SIDEBAR: Agent Roster ── */}
        <div
          className="flex-shrink-0 flex flex-col"
          style={{ width: 320, background: '#0d0b18', borderRight: '1px solid #1a1530' }}
        >
          {/* + NEW AGENT button at top of sidebar */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-shrink-0 flex items-center justify-center gap-2 w-full transition-all"
            style={{
              height: 40,
              background: 'linear-gradient(135deg, #2a2060 0%, #1a1530 100%)',
              borderBottom: '1px solid #3a3080',
              color: '#a89fd4',
              fontSize: 10,
              letterSpacing: '0.1em',
              fontFamily: 'var(--font-orbitron), monospace',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #3a2a80 0%, #2a1a50 100%)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, #2a2060 0%, #1a1530 100%)' }}
          >
            <span style={{ fontSize: 16, color: '#7a72c8', lineHeight: 1 }}>+</span>
            <span>{t('deploy_new_agent')}</span>
          </button>

          <div className="flex-1 overflow-y-auto">
          {rosterByTeam.map(({ team, agents: teamAgents }) => {
            const color = TEAM_COLOR[team]
            const workingInTeam = teamAgents.filter((a) => a.status === 'working').length
            return (
              <div key={team}>
                {/* team header */}
                <div
                  className="flex items-center justify-between px-3 py-2 sticky top-0"
                  style={{ background: '#0d0b18', borderBottom: `1px solid ${color}18`, zIndex: 1 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-orbitron font-bold" style={{ fontSize: 9, color, letterSpacing: '0.1em' }}>
                      {TEAM_GLYPH[team]} {TEAM_KEY[team] ? t(TEAM_KEY[team]) : team}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {workingInTeam > 0 && (
                      <span
                        className="font-orbitron px-1.5 py-0.5 rounded-full"
                        style={{ fontSize: 7, background: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e33' }}
                      >
                        {workingInTeam}
                      </span>
                    )}
                    <span className="font-orbitron" style={{ fontSize: 8, color: '#374151' }}>
                      {teamAgents.length}
                    </span>
                  </div>
                </div>

                {/* agent cards */}
                {teamAgents.map((agent) => (
                  <AgentSideCard
                    key={agent.id}
                    agent={agent}
                    selected={selected?.id === agent.id}
                    lang={lang}
                    onClick={() => openAgent(agent)}
                    onDelete={() => setConfirmDelete(agent)}
                  />
                ))}
              </div>
            )
          })}
          </div>{/* end scrollable roster */}
        </div>

        {/* ── CENTER: Canvas ── */}
        <div className="flex-1 min-w-0 relative">
          {/* canvas fills the area */}
          <div className="w-full h-full p-2">
            <OfficeLive agents={agents} onSelect={openAgent} selectedId={selected?.id ?? null} />
          </div>

          {/* floating team legend */}
          <div
            className="absolute bottom-4 left-4 flex items-center gap-2 pointer-events-none"
            style={{ zIndex: 10 }}
          >
            {TEAM_ORDER.map((team) => {
              const count = agents.filter((a) => a.team === team).length
              const wc = agents.filter((a) => a.team === team && a.status === 'working').length
              if (count === 0) return null
              return (
                <div
                  key={team}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                  style={{
                    background: 'rgba(13,11,24,0.88)',
                    border: `1px solid ${TEAM_COLOR[team]}33`,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span style={{ fontSize: 9, color: TEAM_COLOR[team] }}>{TEAM_GLYPH[team]}</span>
                  {wc > 0 && (
                    <span className="inline-block rounded-full" style={{ width: 4, height: 4, background: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
                  )}
                  <span className="font-orbitron" style={{ fontSize: 7, color: '#4b5563', letterSpacing: '0.06em' }}>
                    {wc > 0 ? `${wc}/${count}` : count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── RIGHT DETAIL PANEL ── */}
        <div
          className="flex-shrink-0 flex flex-col overflow-hidden transition-all"
          style={{
            width: panelOpen && selected ? 300 : 0,
            transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
            borderLeft: `1px solid ${tc}33`,
            background: '#0d0b18',
          }}
        >
          {panelOpen && selected && (
            <div className="flex flex-col h-full" style={{ width: 300 }}>

              {/* panel hero header with gradient */}
              <div
                className="flex-shrink-0 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${tc}18 0%, #0d0b18 100%)`,
                  borderBottom: `1px solid ${tc}22`,
                  padding: '16px 14px 14px',
                }}
              >
                {/* decorative glyph bg */}
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2 font-orbitron font-bold pointer-events-none select-none"
                  style={{ fontSize: 64, color: `${tc}08`, letterSpacing: '-0.02em' }}
                >
                  {TEAM_GLYPH[selected.team]}
                </div>

                {/* close + edit row */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="font-orbitron text-xs"
                    style={{ fontSize: 8, color: tc, letterSpacing: '0.12em', opacity: 0.8 }}
                  >
                    {TEAM_KEY[selected.team] ? t(TEAM_KEY[selected.team]) : selected.team}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={openEdit}
                      className="font-orbitron px-2.5 py-1 rounded transition-colors"
                      style={{ fontSize: 8, letterSpacing: '0.06em', background: `${tc}18`, border: `1px solid ${tc}44`, color: tc }}
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={closePanel}
                      className="px-2 py-1 rounded transition-colors"
                      style={{ background: '#111', border: '1px solid #1a1530', color: '#4b5563', fontSize: 10 }}
                    >✕</button>
                  </div>
                </div>

                {/* sprite + name */}
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ width: 56, height: 56, background: `${tc}15`, border: `1px solid ${tc}30` }}
                  >
                    <PixelSprite agentId={selected.id} size={52} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-white font-semibold truncate" style={{ fontSize: 14 }}>{selectedDisplayName}</span>
                      <span
                        className="inline-block rounded-full flex-shrink-0"
                        style={{ width: 6, height: 6, background: STATUS_COLOR[selected.status] || '#374151', boxShadow: selected.status === 'working' ? `0 0 6px ${STATUS_COLOR.working}` : undefined }}
                      />
                    </div>
                    <div className="truncate mb-2" style={{ fontSize: 10, color: '#6b7280' }}>{selected.role}</div>
                    <div className="flex flex-wrap gap-1">
                      <span className="font-orbitron px-1.5 py-0.5 rounded" style={{ fontSize: 7, letterSpacing: '0.05em', background: `${tc}18`, color: tc, border: `1px solid ${tc}33` }}>
                        {SHORT_MODEL[selected.model] || selected.model}
                      </span>
                      <span
                        className="font-orbitron px-1.5 py-0.5 rounded"
                        style={{
                          fontSize: 7, letterSpacing: '0.05em',
                          background: '#111', border: '1px solid #1a1530',
                          color: selected.effort === 'high' ? '#f59e0b' : selected.effort === 'low' ? '#374151' : '#4b5563',
                        }}
                      >
                        {t(`effort_${selected.effort}` as TranslationKey)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* scrollable body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">

                {/* scorecard */}
                {analytics && (
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${tc}22`, background: '#09080f' }}>
                    <div
                      className="font-orbitron px-3 py-2"
                      style={{ fontSize: 8, color: tc, letterSpacing: '0.12em', borderBottom: `1px solid ${tc}18`, background: `${tc}08` }}
                    >
                      SCORECARD
                    </div>
                    <div className="p-2.5 grid grid-cols-2 gap-2">
                      {[
                        { label: t('missions_label'), value: analytics.total_missions, color: '#2d7fff' },
                        { label: t('scorecard_success'), value: `${analytics.success_rate}%`, color: Number(analytics.success_rate) >= 80 ? '#22c55e' : '#f59e0b' },
                        { label: t('tokens'), value: Number(analytics.total_tokens || 0).toLocaleString(), color: '#a855f7' },
                        { label: t('scorecard_cost'), value: `$${analytics.estimated_cost_usd}`, color: '#06b6d4' },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-lg px-2.5 py-2"
                          style={{ background: '#0f0b15', border: '1px solid #1a1530' }}
                        >
                          <div className="font-bold text-white" style={{ fontSize: 15 }}>{s.value}</div>
                          <div className="font-orbitron mt-0.5" style={{ fontSize: 7, color: s.color, letterSpacing: '0.04em' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 px-2.5 pb-2.5">
                      {[
                        { label: t('scorecard_done'), value: analytics.done_missions, color: '#22c55e' },
                        { label: t('scorecard_failed'), value: analytics.failed_missions, color: Number(analytics.failed_missions) > 0 ? '#ef4444' : '#374151' },
                        { label: t('scorecard_memories'), value: analytics.total_memories, color: '#f59e0b' },
                      ].map((s) => (
                        <div key={s.label} className="flex flex-col items-center rounded-lg px-1.5 py-1.5" style={{ background: '#0f0b15', border: '1px solid #1a1530' }}>
                          <span className="font-orbitron font-bold" style={{ fontSize: 12, color: s.color }}>{s.value}</span>
                          <span className="font-orbitron mt-0.5" style={{ fontSize: 7, color: '#374151', letterSpacing: '0.04em' }}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* personality */}
                <div className="rounded-xl p-3" style={{ background: '#09080f', border: '1px solid #1a1530' }}>
                  <div className="font-orbitron mb-2" style={{ fontSize: 8, color: '#374151', letterSpacing: '0.1em' }}>{t('personality')}</div>
                  <p className="leading-relaxed" style={{ fontSize: 11.5, color: '#94a3b8' }}>{selected.personality}</p>
                </div>

                {/* mission history */}
                <div>
                  <div className="font-orbitron mb-2" style={{ fontSize: 8, color: '#374151', letterSpacing: '0.1em' }}>
                    {t('mission_history')} <span style={{ color: '#1f2937' }}>({missions.length})</span>
                  </div>
                  {missions.length === 0 ? (
                    <div className="text-center py-5 rounded-xl font-orbitron" style={{ background: '#09080f', border: '1px solid #1a1530', fontSize: 9, color: '#1f2937', letterSpacing: '0.08em' }}>
                      {t('no_missions_yet')}
                    </div>
                  ) : (
                    missions.slice(0, 6).map((m) => {
                      const sc = m.status === 'done' ? '#22c55e' : m.status === 'running' ? '#3b82f6' : m.status === 'failed' ? '#ef4444' : '#374151'
                      return (
                        <div key={m.id} className="rounded-lg p-2.5 mb-1.5" style={{ background: '#09080f', border: '1px solid #1a1530' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-white truncate leading-tight">{m.title}</div>
                              <div className="mt-0.5 truncate" style={{ fontSize: 9, color: '#374151' }}>
                                {new Date(m.created_at).toLocaleString(lang === 'TH' ? 'th-TH' : 'en-GB')}
                              </div>
                            </div>
                            <span
                              className="font-orbitron flex-shrink-0 px-1.5 py-0.5 rounded"
                              style={{ fontSize: 7, letterSpacing: '0.04em', background: `${sc}18`, color: sc }}
                            >
                              {(t((`status_${m.status}`) as Parameters<typeof t>[0])) || m.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── EDIT MODAL ── */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false) }}
        >
          <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ background: '#0d0b18', border: '1px solid #1a1530' }}>
            <div className="p-5" style={{ borderBottom: '1px solid #1a1530' }}>
              <span className="font-orbitron font-bold text-white" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
                {t('edit_agent')}
              </span>
            </div>

            <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
              {[
                { key: 'name', label: t('name'), type: 'text' as const },
                { key: 'name_en', label: 'NAME (EN)', type: 'text' as const, placeholder: 'English name (optional)' },
                { key: 'role', label: t('role'), type: 'text' as const },
                { key: 'sprite', label: t('sprite'), type: 'text' as const },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="font-orbitron block mb-1" style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>{label}</label>
                  <input
                    type="text"
                    value={String(editForm[key as keyof Agent] || '')}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="gank-input"
                    placeholder={placeholder}
                  />
                </div>
              ))}

              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>{t('model')}</label>
                <select value={editForm.model || ''} onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))} className="gank-input">
                  {Object.entries(MODEL_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                </select>
              </div>

              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>{t('effort')}</label>
                <select value={editForm.effort || 'normal'} onChange={(e) => setEditForm((f) => ({ ...f, effort: e.target.value as Agent['effort'] }))} className="gank-input">
                  <option value="low">{t('effort_low')}</option>
                  <option value="normal">{t('effort_normal')}</option>
                  <option value="high">{t('effort_high')}</option>
                </select>
              </div>

              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>{t('personality')}</label>
                <textarea value={editForm.personality || ''} onChange={(e) => setEditForm((f) => ({ ...f, personality: e.target.value }))} rows={2} className="gank-input resize-none" />
              </div>

              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>{t('system_prompt')}</label>
                <textarea value={editForm.system_prompt || ''} onChange={(e) => setEditForm((f) => ({ ...f, system_prompt: e.target.value }))} rows={4} className="gank-input resize-none" />
              </div>
            </div>

            <div className="p-4 flex gap-2" style={{ borderTop: '1px solid #1a1530' }}>
              <button onClick={saveEdit} className="btn-deploy flex-1">{t('save')}</button>
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded font-orbitron" style={{ fontSize: 10, letterSpacing: '0.08em', background: '#09080f', border: '1px solid #1a1530', color: '#374151' }}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE AGENT MODAL ── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false) }}
        >
          <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ background: '#0d0b18', border: '1px solid #1a1530' }}>
            <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid #1a1530' }}>
              <span className="font-orbitron font-bold text-white" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
                {t('deploy_new_agent')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateFields}
                  disabled={generating || !createForm.name || !createForm.role}
                  className="font-orbitron px-2.5 py-1 rounded flex items-center gap-1 transition-opacity"
                  style={{ fontSize: 9, letterSpacing: '0.05em', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: generating ? '#64748b' : '#a855f7', opacity: (!createForm.name || !createForm.role) ? 0.35 : 1 }}
                  title="Auto-generate ช่องที่ว่าง"
                >
                  {generating ? '⏳' : '✨'} AI FILL
                </button>
                <button onClick={() => setShowCreateModal(false)} style={{ color: '#374151', fontSize: 12 }}>✕</button>
              </div>
            </div>

            <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
              {genError && (
                <div className="rounded px-3 py-2 font-mono" style={{ fontSize: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  ❌ {genError}
                </div>
              )}
              {/* name + name_en */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-orbitron block mb-1" style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>NAME (TH) *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    className="gank-input"
                    placeholder="ชื่อ"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="font-orbitron block mb-1 flex items-center gap-1" style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>
                    NAME (EN) <span style={{ color: '#a855f7', fontSize: 8 }}>✨</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.name_en}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name_en: e.target.value }))}
                    className="gank-input"
                    placeholder={generating ? 'generating...' : 'auto-gen if empty'}
                    disabled={generating}
                  />
                </div>
              </div>

              {/* role */}
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>ROLE *</label>
                <input
                  type="text"
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                  className="gank-input"
                  placeholder="e.g. Frontend Developer"
                />
              </div>

              {/* team + model */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-orbitron block mb-1" style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>TEAM</label>
                  <select value={createForm.team} onChange={(e) => setCreateForm((f) => ({ ...f, team: e.target.value }))} className="gank-input">
                    {TEAM_ORDER.map((tm) => <option key={tm} value={tm}>{tm}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-orbitron block mb-1" style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>MODEL</label>
                  <select value={createForm.model} onChange={(e) => setCreateForm((f) => ({ ...f, model: e.target.value }))} className="gank-input">
                    {Object.entries(MODEL_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                  </select>
                </div>
              </div>

              {/* effort */}
              <div>
                <label className="font-orbitron block mb-1" style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>EFFORT</label>
                <select value={createForm.effort} onChange={(e) => setCreateForm((f) => ({ ...f, effort: e.target.value }))} className="gank-input">
                  <option value="low">{t('effort_low')}</option>
                  <option value="normal">{t('effort_normal')}</option>
                  <option value="high">{t('effort_high')}</option>
                </select>
              </div>

              {/* personality */}
              <div>
                <label className="font-orbitron block mb-1 flex items-center gap-1" style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>
                  PERSONALITY <span style={{ color: '#a855f7', fontSize: 8 }}>✨</span>
                </label>
                <textarea
                  value={createForm.personality}
                  onChange={(e) => setCreateForm((f) => ({ ...f, personality: e.target.value }))}
                  rows={2}
                  className="gank-input resize-none"
                  placeholder={generating ? 'generating...' : 'auto-gen if empty'}
                  disabled={generating}
                  style={{ opacity: generating && !createForm.personality ? 0.5 : 1 }}
                />
              </div>

              {/* system_prompt */}
              <div>
                <label className="font-orbitron block mb-1 flex items-center gap-1" style={{ fontSize: 9, color: '#374151', letterSpacing: '0.1em' }}>
                  SYSTEM PROMPT <span style={{ color: '#a855f7', fontSize: 8 }}>✨</span>
                </label>
                <textarea
                  value={createForm.system_prompt}
                  onChange={(e) => setCreateForm((f) => ({ ...f, system_prompt: e.target.value }))}
                  rows={4}
                  className="gank-input resize-none"
                  placeholder={generating ? 'generating...' : 'auto-gen if empty'}
                  disabled={generating}
                  style={{ opacity: generating && !createForm.system_prompt ? 0.5 : 1 }}
                />
              </div>
            </div>

            <div className="p-4 flex gap-2" style={{ borderTop: '1px solid #1a1530' }}>
              <button
                onClick={createAgent}
                disabled={creating || generating || !createForm.name || !createForm.role}
                className="btn-deploy flex-1"
                style={{ opacity: creating || generating || !createForm.name || !createForm.role ? 0.4 : 1 }}
              >
                {creating ? ((!createForm.name_en || !createForm.personality || !createForm.system_prompt) ? '✨ GENERATING...' : 'CREATING...') : 'CREATE AGENT'}
              </button>
              <button
                onClick={() => { setShowCreateModal(false); setCreateForm(EMPTY_CREATE); setGenError('') }}
                className="px-4 py-2 rounded font-orbitron"
                style={{ fontSize: 10, letterSpacing: '0.08em', background: '#09080f', border: '1px solid #1a1530', color: '#374151' }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM DIALOG ── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null) }}
        >
          <div className="w-full max-w-sm rounded-xl overflow-hidden" style={{ background: '#0d0b18', border: '1px solid #3d1020' }}>
            <div className="p-5" style={{ borderBottom: '1px solid #1a1530' }}>
              <span className="font-orbitron font-bold" style={{ fontSize: 11, color: '#ef4444', letterSpacing: '0.1em' }}>
                DELETE AGENT
              </span>
            </div>
            <div className="p-5">
              <p style={{ fontSize: 12, color: '#9591b4' }}>
                ลบ <span className="text-white font-semibold">{confirmDelete.name}</span> ออกจากทีม? action นี้ไม่สามารถย้อนกลับได้
              </p>
            </div>
            <div className="p-4 flex gap-2" style={{ borderTop: '1px solid #1a1530' }}>
              <button
                onClick={() => deleteAgent(confirmDelete)}
                className="flex-1 font-orbitron py-2 rounded"
                style={{ fontSize: 10, letterSpacing: '0.08em', background: '#3d101888', border: '1px solid #ef444444', color: '#ef4444' }}
              >
                DELETE
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded font-orbitron"
                style={{ fontSize: 10, letterSpacing: '0.08em', background: '#09080f', border: '1px solid #1a1530', color: '#374151' }}
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
      <div className="flex items-center justify-center h-screen" style={{ background: '#09080f' }}>
        <span className="font-orbitron text-xs" style={{ color: '#3d3660', letterSpacing: '0.12em' }}>LOADING...</span>
      </div>
    }>
      <AgentsContent />
    </Suspense>
  )
}
