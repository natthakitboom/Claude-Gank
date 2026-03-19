'use client'

import { useEffect, useState } from 'react'
import type { Agent, Skill } from '@/lib/types'
import { MODEL_LABELS } from '@/lib/types'
import PixelSprite from '@/components/PixelSprite'

const TEAM_ORDER = ['CORE', 'TECH', 'CREATIVE', 'BUSINESS', 'FINANCE']
const TEAM_DISPLAY: Record<string, string> = { CORE: 'CORE', TECH: 'TECH', CREATIVE: 'CREATIVE', BUSINESS: 'BIZ', FINANCE: 'FINANCE' }
const TEAM_COLOR: Record<string, string> = { CORE: '#ff2d78', TECH: '#2d7fff', CREATIVE: '#a855f7', BUSINESS: '#22c55e', FINANCE: '#06b6d4' }

const CAT_COLOR: Record<string, string> = { management: '#ff2d78', tech: '#2d7fff', marketing: '#22c55e', business: '#06b6d4', creative: '#a855f7', finance: '#f59e0b', general: '#64748b' }

interface MemoryRow {
  id: string; agent_id: string; content: string; summary: string | null
  importance: number; created_at: string; agent_name: string; agent_sprite: string
}

interface NotifyConfig {
  id: string; platform: string; webhook_url: string; token: string; enabled: number
  notify_on_done: number; notify_on_failed: number; notify_on_skill_update: number
}

type Tab = 'agents' | 'skills' | 'memory' | 'notify' | 'info'

export default function SystemPage() {
  const [tab, setTab] = useState<Tab>('agents')
  const [agents, setAgents] = useState<Agent[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [memories, setMemories] = useState<MemoryRow[]>([])
  const [stats, setStats] = useState<any>(null)
  const [notifyConfigs, setNotifyConfigs] = useState<NotifyConfig[]>([])
  const [testResult, setTestResult] = useState('')

  // Skills state
  const [filterCat, setFilterCat] = useState('all')
  const [showCreateSkill, setShowCreateSkill] = useState(false)
  const [viewSkill, setViewSkill] = useState<Skill | null>(null)
  const [skillForm, setSkillForm] = useState({ name: '', description: '', prompt_template: '', category: 'general', icon: '⚡' })

  // Memory state
  const [filterAgent, setFilterAgent] = useState('all')
  const [showAddMemory, setShowAddMemory] = useState(false)
  const [memForm, setMemForm] = useState({ agent_id: '', content: '', importance: 5 })

  useEffect(() => {
    fetch('/api/agents').then((r) => r.json()).then((d) => { setAgents(d); setMemForm((f) => ({ ...f, agent_id: d[0]?.id || '' })) })
    fetch('/api/skills').then((r) => r.json()).then(setSkills)
    fetch('/api/stats').then((r) => r.json()).then(setStats)
    fetch('/api/notify').then((r) => r.json()).then(setNotifyConfigs)
  }, [])

  useEffect(() => {
    const url = filterAgent === 'all' ? '/api/memory' : `/api/memory?agent_id=${filterAgent}`
    fetch(url).then((r) => r.json()).then(setMemories)
  }, [filterAgent])

  const createSkill = async () => {
    await fetch('/api/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(skillForm) })
    setShowCreateSkill(false)
    setSkillForm({ name: '', description: '', prompt_template: '', category: 'general', icon: '⚡' })
    setSkills(await (await fetch('/api/skills')).json())
  }

  const addMemory = async () => {
    await fetch('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(memForm) })
    setShowAddMemory(false)
    setMemForm((f) => ({ ...f, content: '', importance: 5 }))
    setMemories(await (await fetch(filterAgent === 'all' ? '/api/memory' : `/api/memory?agent_id=${filterAgent}`)).json())
  }

  const addNotifyConfig = async (platform: 'line' | 'teams') => {
    const res = await fetch('/api/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, notify_on_failed: 1 }),
    })
    setNotifyConfigs(await res.json())
  }

  const updateNotifyConfig = async (id: string, patch: Partial<NotifyConfig>) => {
    await fetch('/api/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    setNotifyConfigs(await (await fetch('/api/notify')).json())
  }

  const deleteNotifyConfig = async (id: string) => {
    await fetch('/api/notify', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifyConfigs(await (await fetch('/api/notify')).json())
  }

  const testNotify = async () => {
    setTestResult('Sending...')
    const res = await fetch('/api/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send',
        title: '🔔 Test Notification — ทดสอบการแจ้งเตือน',
        message: `✅ ระบบแจ้งเตือนทำงานปกติ!\n\n📊 สถานะระบบ:\n• Agents: ${agents.length} คน\n• Platform: Claude Gank Dashboard\n• Connection: สำเร็จ\n\n💬 เมื่อ agent ทำงานเสร็จหรือล้มเหลว จะส่งข้อความแบบนี้ให้อัตโนมัติ พร้อมรายละเอียดผลลัพธ์ของ mission`,
        agent_name: 'System',
      }),
    })
    const data = await res.json()
    setTestResult(`Sent to ${data.sent}/${data.total} platforms`)
    setTimeout(() => setTestResult(''), 3000)
  }

  const updateAgent = async (id: string, patch: Partial<Agent>) => {
    await fetch(`/api/agents/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    setAgents(await (await fetch('/api/agents')).json())
  }

  const deleteMemory = async (id: string) => {
    await fetch(`/api/memory?id=${id}`, { method: 'DELETE' })
    setMemories(await (await fetch(filterAgent === 'all' ? '/api/memory' : `/api/memory?agent_id=${filterAgent}`)).json())
  }

  const impColor = (n: number) => n >= 8 ? '#ef4444' : n >= 6 ? '#f59e0b' : n >= 4 ? '#2d7fff' : '#374151'
  const categories = ['all', ...Array.from(new Set(skills.map((s) => s.category)))]
  const filteredSkills = filterCat === 'all' ? skills : skills.filter((s) => s.category === filterCat)

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="mb-4">
        <h1 className="font-orbitron font-bold text-white" style={{ fontSize: '28px', letterSpacing: '0.05em' }}>SYSTEM</h1>
        <p className="font-orbitron mt-1" style={{ fontSize: '10px', color: '#374151', letterSpacing: '0.1em' }}>// SYSTEM CONFIGURATION & DATA MANAGEMENT</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b mb-6" style={{ borderColor: '#111820' }}>
        {([['agents', 'AGENTS'], ['skills', 'SKILLS'], ['memory', 'MEMORY'], ['notify', '🔔 NOTIFY'], ['info', 'SYSTEM INFO']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`gank-tab ${tab === key ? 'active' : ''}`}>{label}</button>
        ))}
      </div>

      {/* ════════ AGENTS TAB ════════ */}
      {tab === 'agents' && (
        <div className="space-y-3">
          <div className="font-orbitron mb-4" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>
            AGENT CONFIGURATION — คลิก dropdown เพื่อเปลี่ยน model หรือ effort ได้ทันที
          </div>
          {TEAM_ORDER.map((team) => {
            const teamAgents = agents.filter((a) => a.team === team)
            if (teamAgents.length === 0) return null
            const tColor = TEAM_COLOR[team] || '#374151'
            return (
              <div key={team}>
                <div className="font-orbitron mb-2 flex items-center gap-2" style={{ fontSize: '9px', color: tColor, letterSpacing: '0.1em' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: tColor, display: 'inline-block' }} />
                  {team}
                </div>
                <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e2d40' }}>
                  {teamAgents.map((agent, idx) => (
                    <div key={agent.id} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderTop: idx > 0 ? '1px solid #111820' : undefined }}>
                      <PixelSprite agentId={agent.id} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{agent.name}</div>
                        <div className="font-orbitron" style={{ fontSize: '8px', color: '#475569' }}>{agent.role}</div>
                      </div>

                      {/* Model selector */}
                      <div className="flex flex-col gap-0.5">
                        <label className="font-orbitron" style={{ fontSize: '7px', color: '#374151', letterSpacing: '0.06em' }}>MODEL</label>
                        <select
                          value={agent.model}
                          onChange={e => updateAgent(agent.id, { model: e.target.value })}
                          className="gank-input"
                          style={{ fontSize: '9px', padding: '3px 6px', minWidth: 150 }}
                        >
                          {Object.entries(MODEL_LABELS).map(([id, label]) => (
                            <option key={id} value={id}>{label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Effort selector */}
                      <div className="flex flex-col gap-0.5">
                        <label className="font-orbitron" style={{ fontSize: '7px', color: '#374151', letterSpacing: '0.06em' }}>EFFORT</label>
                        <select
                          value={agent.effort}
                          onChange={e => updateAgent(agent.id, { effort: e.target.value as Agent['effort'] })}
                          className="gank-input"
                          style={{ fontSize: '9px', padding: '3px 6px' }}
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      {/* Current model badge */}
                      <div className="font-orbitron px-2 py-1 rounded flex-shrink-0" style={{
                        fontSize: '8px',
                        background: agent.model.includes('opus') ? 'rgba(168,85,247,0.15)'
                          : agent.model.includes('sonnet') ? 'rgba(45,127,255,0.15)'
                          : 'rgba(34,197,94,0.15)',
                        color: agent.model.includes('opus') ? '#a855f7'
                          : agent.model.includes('sonnet') ? '#2d7fff'
                          : '#22c55e',
                      }}>
                        {agent.model.includes('opus') ? 'OPUS' : agent.model.includes('sonnet') ? 'SONNET' : 'HAIKU'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ════════ SKILLS TAB ════════ */}
      {tab === 'skills' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="font-orbitron" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>SKILL LIBRARY ({skills.length})</div>
            <button onClick={() => setShowCreateSkill(true)} className="btn-deploy" style={{ padding: '6px 14px', fontSize: '9px' }}>+ CREATE SKILL</button>
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className="font-orbitron text-xs px-2.5 py-1 rounded transition-all"
                style={filterCat === cat
                  ? { background: cat === 'all' ? 'rgba(0,229,255,0.15)' : `${CAT_COLOR[cat] || '#64748b'}33`, color: cat === 'all' ? '#00e5ff' : CAT_COLOR[cat] || '#64748b', fontSize: '9px', letterSpacing: '0.05em' }
                  : { background: '#111820', color: '#374151', fontSize: '9px', letterSpacing: '0.05em' }}>
                {cat === 'all' ? 'ALL' : cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Skills Grid */}
          <div className="grid grid-cols-3 gap-3">
            {filteredSkills.map((skill) => {
              const color = CAT_COLOR[skill.category] || '#64748b'
              return (
                <button key={skill.id} onClick={() => setViewSkill(skill)}
                  className="rounded-lg p-4 text-left transition-all hover:border-opacity-80"
                  style={{ background: '#111827', border: '1px solid #1a2030' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ background: `${color}22` }}>{skill.icon}</div>
                    <span className="cat-badge" style={{ background: `${color}22`, color, fontSize: '8px' }}>{skill.category.toUpperCase()}</span>
                  </div>
                  <div className="text-sm font-medium text-white mb-1">{skill.name}</div>
                  <div className="text-xs line-clamp-2 mb-2" style={{ color: '#64748b' }}>{skill.description}</div>
                  <div className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>USED {skill.usage_count || 0}x</div>
                </button>
              )
            })}
            <button onClick={() => setShowCreateSkill(true)}
              className="rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-all"
              style={{ background: '#080a0f', border: '2px dashed #1a2030', minHeight: 140 }}>
              <span className="text-xl" style={{ color: '#1f2937' }}>+</span>
              <span className="font-orbitron" style={{ fontSize: '9px', color: '#1f2937', letterSpacing: '0.08em' }}>CREATE SKILL</span>
            </button>
          </div>

          {/* View Skill Modal */}
          {viewSkill && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}
              onClick={(e) => { if (e.target === e.currentTarget) setViewSkill(null) }}>
              <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1a2535' }}>
                <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: '#111820' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: `${CAT_COLOR[viewSkill.category] || '#64748b'}22` }}>{viewSkill.icon}</div>
                    <div>
                      <div className="text-white font-semibold">{viewSkill.name}</div>
                      <span className="cat-badge" style={{ background: `${CAT_COLOR[viewSkill.category]}22`, color: CAT_COLOR[viewSkill.category], fontSize: '8px' }}>{viewSkill.category.toUpperCase()}</span>
                    </div>
                  </div>
                  <button onClick={() => setViewSkill(null)} className="text-xs" style={{ color: '#374151' }}>✕</button>
                </div>
                <div className="p-5 space-y-3">
                  <div className="text-sm" style={{ color: '#94a3b8' }}>{viewSkill.description}</div>
                  <div>
                    <div className="font-orbitron mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>PROMPT TEMPLATE</div>
                    <div className="terminal rounded-lg p-3 text-xs">{viewSkill.prompt_template}</div>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-orbitron" style={{ fontSize: '9px', color: '#374151' }}>USED {viewSkill.usage_count || 0}x</span>
                    <span className="font-orbitron" style={{ fontSize: '9px', color: '#1f2937' }}>CREATED {new Date(viewSkill.created_at).toLocaleDateString('th-TH')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Skill Modal */}
          {showCreateSkill && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
              <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1a2535' }}>
                <div className="p-5 border-b" style={{ borderColor: '#111820' }}>
                  <span className="font-orbitron text-xs font-bold text-white" style={{ letterSpacing: '0.08em' }}>CREATE NEW SKILL</span>
                </div>
                <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>NAME</label>
                      <input type="text" value={skillForm.name} onChange={(e) => setSkillForm((f) => ({ ...f, name: e.target.value }))} className="gank-input" placeholder="e.g. SWOT Analysis" />
                    </div>
                    <div>
                      <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>ICON</label>
                      <input type="text" value={skillForm.icon} onChange={(e) => setSkillForm((f) => ({ ...f, icon: e.target.value }))} className="gank-input text-center text-xl" />
                    </div>
                  </div>
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>CATEGORY</label>
                    <select value={skillForm.category} onChange={(e) => setSkillForm((f) => ({ ...f, category: e.target.value }))} className="gank-input">
                      {Object.keys(CAT_COLOR).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>DESCRIPTION</label>
                    <input type="text" value={skillForm.description} onChange={(e) => setSkillForm((f) => ({ ...f, description: e.target.value }))} className="gank-input" />
                  </div>
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>PROMPT TEMPLATE</label>
                    <textarea rows={5} value={skillForm.prompt_template} onChange={(e) => setSkillForm((f) => ({ ...f, prompt_template: e.target.value }))} className="gank-input resize-none" style={{ fontFamily: 'monospace' }} />
                  </div>
                </div>
                <div className="p-4 border-t flex gap-2" style={{ borderColor: '#111820' }}>
                  <button onClick={createSkill} disabled={!skillForm.name || !skillForm.prompt_template} className="btn-deploy flex-1">CREATE</button>
                  <button onClick={() => setShowCreateSkill(false)} className="px-4 py-2 rounded text-xs font-orbitron" style={{ background: '#111820', border: '1px solid #1a2535', color: '#64748b', letterSpacing: '0.08em' }}>CANCEL</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ MEMORY TAB ════════ */}
      {tab === 'memory' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="font-orbitron" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>MEMORY DATABASE ({memories.length})</div>
            <button onClick={() => setShowAddMemory(true)} className="btn-deploy" style={{ padding: '6px 14px', fontSize: '9px' }}>+ ADD MEMORY</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'TOTAL', value: memories.length, color: '#2d7fff' },
              { label: 'HIGH IMPORTANCE', value: memories.filter((m) => m.importance >= 8).length, color: '#ef4444' },
              { label: 'AGENTS', value: new Set(memories.map((m) => m.agent_id)).size, color: '#22c55e' },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="font-orbitron mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>{s.label}</div>
                <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Agent filter */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            <button onClick={() => setFilterAgent('all')} className="font-orbitron text-xs px-2.5 py-1 rounded transition-all"
              style={filterAgent === 'all' ? { background: 'rgba(0,229,255,0.15)', color: '#00e5ff', fontSize: '9px' } : { background: '#111820', color: '#374151', fontSize: '9px' }}>ALL</button>
            {agents.map((a) => (
              <button key={a.id} onClick={() => setFilterAgent(a.id)} className="flex items-center gap-1 px-2 py-1 rounded transition-all"
                style={filterAgent === a.id ? { background: 'rgba(0,229,255,0.1)', border: '1px solid #00e5ff33' } : { background: '#111820', border: '1px solid transparent' }}>
                <PixelSprite agentId={a.id} size={14} />
                <span className="text-xs" style={{ color: filterAgent === a.id ? '#e2e8f0' : '#374151' }}>{a.name}</span>
              </button>
            ))}
          </div>

          {/* Memory grid */}
          {memories.length === 0 ? (
            <div className="text-center py-12 rounded-lg font-orbitron" style={{ background: '#080a0f', border: '1px solid #111820', color: '#1f2937', fontSize: '9px', letterSpacing: '0.08em' }}>
              NO MEMORIES STORED
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {memories.map((mem) => (
                <div key={mem.id} className="rounded-lg p-4 fade-in-up" style={{ background: '#111827', border: '1px solid #1a2030' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <PixelSprite agentId={mem.agent_id} size={22} />
                      <div>
                        <div className="text-xs font-medium text-white">{mem.agent_name}</div>
                        <div className="font-orbitron" style={{ fontSize: '8px', color: '#1f2937' }}>{new Date(mem.created_at).toLocaleString('th-TH')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-orbitron px-1.5 py-0.5 rounded" style={{ fontSize: '8px', background: `${impColor(mem.importance)}22`, color: impColor(mem.importance) }}>
                        ★ {mem.importance}
                      </span>
                      <button onClick={() => deleteMemory(mem.id)} className="text-xs transition-colors" style={{ color: '#1f2937' }}>✕</button>
                    </div>
                  </div>
                  {mem.summary && <div className="text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>{mem.summary}</div>}
                  <div className="text-xs leading-relaxed line-clamp-4" style={{ color: '#64748b' }}>{mem.content}</div>
                  <div className="mt-2 h-1 rounded-full" style={{ background: '#111820' }}>
                    <div className="h-full rounded-full" style={{ width: `${(mem.importance / 10) * 100}%`, background: impColor(mem.importance) }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Memory Modal */}
          {showAddMemory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
              <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1a2535' }}>
                <div className="p-5 border-b" style={{ borderColor: '#111820' }}>
                  <span className="font-orbitron text-xs font-bold text-white" style={{ letterSpacing: '0.08em' }}>ADD MEMORY</span>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>AGENT</label>
                    <select value={memForm.agent_id} onChange={(e) => setMemForm((f) => ({ ...f, agent_id: e.target.value }))} className="gank-input">
                      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>CONTENT</label>
                    <textarea rows={4} value={memForm.content} onChange={(e) => setMemForm((f) => ({ ...f, content: e.target.value }))} className="gank-input resize-none" placeholder="สิ่งที่ต้องการให้ agent จำ..." />
                  </div>
                  <div>
                    <label className="font-orbitron block mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>IMPORTANCE: {memForm.importance}/10</label>
                    <input type="range" min={1} max={10} value={memForm.importance} onChange={(e) => setMemForm((f) => ({ ...f, importance: Number(e.target.value) }))} className="w-full" />
                  </div>
                </div>
                <div className="p-4 border-t flex gap-2" style={{ borderColor: '#111820' }}>
                  <button onClick={addMemory} disabled={!memForm.content} className="btn-deploy flex-1">SAVE</button>
                  <button onClick={() => setShowAddMemory(false)} className="px-4 py-2 rounded text-xs font-orbitron" style={{ background: '#111820', border: '1px solid #1a2535', color: '#64748b', letterSpacing: '0.08em' }}>CANCEL</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ NOTIFY TAB ════════ */}
      {tab === 'notify' && (
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-sm">Notification Integrations</h2>
              <p style={{ fontSize: '10px', color: '#475569' }}>เชื่อมต่อ LINE / Microsoft Teams เพื่อรับแจ้งเตือนจาก agents</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => addNotifyConfig('line')} className="font-orbitron px-3 py-1.5 rounded" style={{ fontSize: '9px', background: 'rgba(6,199,85,0.15)', border: '1px solid rgba(6,199,85,0.4)', color: '#06c755' }}>
                + LINE
              </button>
              <button onClick={() => addNotifyConfig('teams')} className="font-orbitron px-3 py-1.5 rounded" style={{ fontSize: '9px', background: 'rgba(98,100,167,0.15)', border: '1px solid rgba(98,100,167,0.4)', color: '#6264a7' }}>
                + TEAMS
              </button>
            </div>
          </div>

          {notifyConfigs.length === 0 && (
            <div className="text-center py-12 rounded-lg" style={{ background: '#111827', border: '1px solid #1e2d40' }}>
              <div style={{ fontSize: '32px', opacity: 0.3 }}>🔔</div>
              <div className="font-orbitron mt-2" style={{ fontSize: '9px', color: '#374151' }}>ยังไม่มีการเชื่อมต่อ — กด + LINE หรือ + TEAMS เพื่อเริ่ม</div>
            </div>
          )}

          {notifyConfigs.map(config => (
            <div key={config.id} className="rounded-lg overflow-hidden" style={{ background: '#111827', border: `1px solid ${config.platform === 'line' ? 'rgba(6,199,85,0.3)' : 'rgba(98,100,167,0.3)'}` }}>
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1e2d40' }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '20px' }}>{config.platform === 'line' ? '💚' : '💜'}</span>
                  <div>
                    <span className="font-orbitron font-bold text-white" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
                      {config.platform === 'line' ? 'LINE Messaging API' : 'Microsoft Teams'}
                    </span>
                    <span className="font-orbitron ml-2 px-1.5 py-0.5 rounded" style={{
                      fontSize: '7px',
                      background: config.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: config.enabled ? '#22c55e' : '#ef4444',
                    }}>
                      {config.enabled ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateNotifyConfig(config.id, { enabled: config.enabled ? 0 : 1 })}
                    className="relative rounded-full transition-colors"
                    style={{ width: 36, height: 20, background: config.enabled ? '#10b981' : '#1f2937' }}
                  >
                    <span className="absolute rounded-full bg-white transition-all" style={{ width: 14, height: 14, top: 3, left: config.enabled ? 19 : 3 }} />
                  </button>
                  <button onClick={() => deleteNotifyConfig(config.id)} className="text-xs" style={{ color: '#ef4444' }}>✕</button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {config.platform === 'line' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#06c755', letterSpacing: '0.08em' }}>CHANNEL ACCESS TOKEN</label>
                      <input
                        type="password"
                        placeholder="Channel Access Token จาก LINE Developers Console"
                        defaultValue={config.token}
                        onBlur={(e) => updateNotifyConfig(config.id, { token: e.target.value })}
                        className="gank-input"
                        style={{ fontSize: '10px' }}
                      />
                      <div style={{ fontSize: '8px', color: '#374151', marginTop: 4 }}>
                        สร้าง Messaging API channel ที่ <span style={{ color: '#06c755' }}>developers.line.biz</span> → Channel settings → Channel access token
                      </div>
                    </div>
                    <div>
                      <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#06c755', letterSpacing: '0.08em' }}>TARGET ID (userId / groupId)</label>
                      <input
                        type="text"
                        placeholder="U1234... หรือ C1234... (userId หรือ groupId)"
                        defaultValue={config.webhook_url}
                        onBlur={(e) => updateNotifyConfig(config.id, { webhook_url: e.target.value })}
                        className="gank-input"
                        style={{ fontSize: '10px' }}
                      />
                      <div style={{ fontSize: '8px', color: '#374151', marginTop: 4 }}>
                        userId ได้จาก webhook event / groupId ได้เมื่อ invite bot เข้ากลุ่ม
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#6264a7', letterSpacing: '0.08em' }}>TEAMS WORKFLOW WEBHOOK URL</label>
                    <input
                      type="text"
                      placeholder="https://prod-xx.xxx.logic.azure.com/workflows/..."
                      defaultValue={config.webhook_url}
                      onBlur={(e) => updateNotifyConfig(config.id, { webhook_url: e.target.value })}
                      className="gank-input"
                      style={{ fontSize: '10px' }}
                    />
                    <div style={{ fontSize: '8px', color: '#374151', marginTop: 4 }}>
                      ⚠️ O365 Connectors หมดอายุ <span style={{ color: '#ef4444' }}>30 เม.ย. 2026</span> — ใช้ <span style={{ color: '#6264a7' }}>Power Automate Workflows</span> แทน
                    </div>
                    <div style={{ fontSize: '8px', color: '#374151', marginTop: 2 }}>
                      Teams → Channel → Workflows → Post to a channel when a webhook request is received → copy URL
                    </div>
                  </div>
                )}

                <div>
                  <label className="font-orbitron block mb-1.5" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>NOTIFY WHEN</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { key: 'notify_on_done', label: '✅ Mission Done', color: '#22c55e' },
                      { key: 'notify_on_failed', label: '❌ Mission Failed', color: '#ef4444' },
                      { key: 'notify_on_skill_update', label: '🧠 Skill Update', color: '#a855f7' },
                    ].map(opt => {
                      const active = (config as any)[opt.key]
                      return (
                        <button
                          key={opt.key}
                          onClick={() => updateNotifyConfig(config.id, { [opt.key]: active ? 0 : 1 } as any)}
                          className="font-orbitron px-2.5 py-1 rounded transition-all"
                          style={{
                            fontSize: '8px',
                            background: active ? `${opt.color}20` : '#0d1117',
                            color: active ? opt.color : '#374151',
                            border: `1px solid ${active ? `${opt.color}40` : '#1a2535'}`,
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Agent filter */}
                <div>
                  <label className="font-orbitron block mb-1.5" style={{ fontSize: '8px', color: '#64748b', letterSpacing: '0.08em' }}>AGENTS TO NOTIFY</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {(() => {
                      const filter: string[] = JSON.parse((config as any).agent_filter_json || '[]')
                      const isAll = filter.length === 0
                      return (
                        <>
                          <button
                            onClick={() => updateNotifyConfig(config.id, { agent_filter_json: '[]' } as any)}
                            className="font-orbitron px-2 py-1 rounded transition-all"
                            style={{
                              fontSize: '8px',
                              background: isAll ? 'rgba(0,229,255,0.15)' : '#0d1117',
                              color: isAll ? '#00e5ff' : '#374151',
                              border: `1px solid ${isAll ? 'rgba(0,229,255,0.3)' : '#1a2535'}`,
                            }}
                          >
                            ALL
                          </button>
                          {agents.map(agent => {
                            const active = filter.includes(agent.id)
                            return (
                              <button
                                key={agent.id}
                                onClick={() => {
                                  const newFilter = active
                                    ? filter.filter(id => id !== agent.id)
                                    : [...filter, agent.id]
                                  updateNotifyConfig(config.id, { agent_filter_json: JSON.stringify(newFilter) } as any)
                                }}
                                className="font-orbitron px-2 py-1 rounded transition-all"
                                style={{
                                  fontSize: '7px',
                                  background: active ? 'rgba(45,127,255,0.15)' : '#0d1117',
                                  color: active ? '#2d7fff' : '#374151',
                                  border: `1px solid ${active ? 'rgba(45,127,255,0.3)' : '#1a2535'}`,
                                }}
                              >
                                {agent.name}
                              </button>
                            )
                          })}
                        </>
                      )
                    })()}
                  </div>
                  <div style={{ fontSize: '7px', color: '#374151', marginTop: 4 }}>
                    ALL = แจ้งเตือนจากทุก agent / เลือกเฉพาะ = แจ้งเตือนเฉพาะ agent ที่เลือก
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Test button */}
          {notifyConfigs.length > 0 && (
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={testNotify}
                className="font-orbitron px-4 py-2 rounded transition-all"
                style={{ fontSize: '9px', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff' }}
              >
                🔔 SEND TEST NOTIFICATION
              </button>
              {testResult && (
                <span className="font-orbitron" style={{ fontSize: '9px', color: testResult.includes('Sending') ? '#94a3b8' : '#22c55e' }}>
                  {testResult}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════ SYSTEM INFO TAB ════════ */}
      {tab === 'info' && (
        <div className="max-w-3xl space-y-4">
          {/* System Status */}
          <div className="rounded-lg p-5" style={{ background: '#111827', border: '1px solid #1a2030' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              <span className="font-orbitron font-bold text-white" style={{ fontSize: '13px', letterSpacing: '0.08em' }}>SYSTEM ONLINE</span>
            </div>
            <div className="font-orbitron" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.05em' }}>
              CLAUDE GANK COMMAND CENTER v1.0.0 | POWERED BY ANTHROPIC CLAUDE
            </div>
          </div>

          {/* DB Stats */}
          <div>
            <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>DATABASE STATISTICS</div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'AGENTS', value: stats?.totalAgents ?? 0, color: '#2d7fff' },
                { label: 'MISSIONS', value: stats?.totalMissions ?? 0, color: '#00e5ff' },
                { label: 'MEMORIES', value: stats?.totalMemories ?? 0, color: '#a855f7' },
                { label: 'SKILLS', value: skills.length, color: '#f59e0b' },
                { label: 'MESSAGES', value: stats?.totalMessages ?? 0, color: '#22c55e' },
              ].map((s) => (
                <div key={s.label} className="stat-card text-center">
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="font-orbitron mt-1" style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.05em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Config */}
          <div>
            <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>MODEL CONFIGURATION</div>
            <div className="space-y-2">
              {Object.entries(MODEL_LABELS).map(([id, label]) => (
                <div key={id} className="rounded-lg p-3 flex items-center justify-between" style={{ background: '#111827', border: '1px solid #1a2030' }}>
                  <div>
                    <span className="text-sm text-white">{label}</span>
                    <div className="font-orbitron mt-0.5" style={{ fontSize: '8px', color: '#374151' }}>{id}</div>
                  </div>
                  <span className="font-orbitron px-2 py-1 rounded" style={{ fontSize: '9px', background: '#111820', color: '#00e5ff' }}>ACTIVE</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team Roster */}
          <div>
            <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>TEAM ROSTER</div>
            <div className="space-y-2">
              {TEAM_ORDER.map((team) => {
                const ta = agents.filter((a) => a.team === team)
                const ts = stats?.teamStats?.find((t: any) => t.team === team)
                return (
                  <div key={team} className="rounded-lg p-3 flex items-center gap-3" style={{ background: '#111827', border: '1px solid #1a2030' }}>
                    <span className="font-orbitron font-bold" style={{ fontSize: '11px', color: TEAM_COLOR[team], letterSpacing: '0.05em', width: 70 }}>{TEAM_DISPLAY[team]}</span>
                    <div className="flex items-center gap-1">
                      {ta.map((a) => <PixelSprite key={a.id} agentId={a.id} size={22} />)}
                    </div>
                    <div className="flex-1" />
                    <span className="font-orbitron" style={{ fontSize: '9px', color: '#374151' }}>{ta.length} AGENTS</span>
                    <span className="font-orbitron" style={{ fontSize: '9px', color: TEAM_COLOR[team] }}>{ts?.mission_count ?? 0} MISSIONS</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* API Endpoints */}
          <div>
            <div className="font-orbitron mb-2" style={{ fontSize: '9px', color: '#374151', letterSpacing: '0.08em' }}>API ENDPOINTS</div>
            <div className="terminal rounded-lg p-4 text-xs space-y-1">
              {[
                'GET    /api/agents', 'POST   /api/agents', 'PATCH  /api/agents/:id',
                'GET    /api/missions', 'POST   /api/missions', 'POST   /api/missions/:id/execute',
                'GET    /api/memory', 'POST   /api/memory', 'DELETE /api/memory',
                'GET    /api/skills', 'POST   /api/skills',
                'GET    /api/messages', 'POST   /api/messages',
                'GET    /api/stats',
              ].map((ep) => <div key={ep}>{ep}</div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
