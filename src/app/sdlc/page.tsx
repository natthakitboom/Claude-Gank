'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Save, RotateCcw, Plus, Trash2, ChevronDown, ChevronRight,
  Zap, ShieldCheck, Bug, ArrowRight, Pencil, X,
  GitBranch, Users, AlertTriangle, Loader2, Eye, FileText,
  Shield, Brain, Activity, ListChecks, Scale, Send as SendIcon,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Phase {
  id: number; name: string; icon: string; description: string
  roles: string[]; gate: string; color: string; artifacts?: string[]
}
interface SDLCConfig {
  name: string; description: string; version?: string
  entry: { label: string; description: string; icon: string }
  secretary: { label: string; description: string; icon: string }
  phases: Phase[]
  n2n: { enabled: boolean; description: string; maxHops?: number; rules?: string[] }
  escalation: { enabled: boolean; maxLevel: number; description: string; rules?: string[] }
  qaLoop: { enabled: boolean; maxRounds: number; description: string; severity?: Record<string, any> }
  security?: { enabled: boolean; description: string; rules?: string[] }
  dor?: { label: string; description: string; checklist: string[] }
  dod?: { label: string; description: string; taskChecklist: string[]; phaseChecklist: string[] }
  memory?: { enabled: boolean; types: any[]; rules: string[] }
  observability?: { enabled: boolean; description: string; correlationFields: string[]; dashboards: string[] }
  messageBlocks?: { name: string; description: string; owner: string }[]
  decisionRules?: string[]
}

const PRESET_COLORS = ['#ff2d78', '#a855f7', '#2d7fff', '#22c55e', '#06b6d4', '#f59e0b', '#f87171', '#64748b']
const PRESET_ICONS = ['🚀', '📐', '💻', '🧪', '🛡️', '🚢', '🧠', '📊', '🔍', '📝', '🎨', '⚙️', '🔧']

export default function SDLCPage() {
  const [config, setConfig] = useState<SDLCConfig | null>(null)
  const [original, setOriginal] = useState<SDLCConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [editingPhase, setEditingPhase] = useState<number | null>(null)
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pipeline' | 'quality' | 'engine'>('pipeline')
  const [newRole, setNewRole] = useState('')
  const [newArtifact, setNewArtifact] = useState('')

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sdlc')
      const data = await res.json()
      setConfig(data.config); setOriginal(data.config)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])
  useEffect(() => {
    if (config && original) setDirty(JSON.stringify(config) !== JSON.stringify(original))
  }, [config, original])

  const saveConfig = async () => {
    if (!config) return; setSaving(true)
    await fetch('/api/sdlc', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config }) })
    setOriginal(JSON.parse(JSON.stringify(config))); setSaving(false); setDirty(false)
  }
  const resetConfig = () => { if (original) setConfig(JSON.parse(JSON.stringify(original))); setEditingPhase(null); setEditingSection(null) }
  const updatePhase = (idx: number, patch: Partial<Phase>) => {
    if (!config) return; const phases = [...config.phases]; phases[idx] = { ...phases[idx], ...patch }; setConfig({ ...config, phases })
  }
  const addPhase = () => {
    if (!config) return; const newId = Math.max(...config.phases.map(p => p.id)) + 1
    setConfig({ ...config, phases: [...config.phases, { id: newId, name: 'New Phase', icon: '⚙️', description: 'Describe...', roles: [], gate: 'Define gate...', artifacts: [], color: PRESET_COLORS[newId % PRESET_COLORS.length] }] })
    setEditingPhase(config.phases.length)
  }
  const removePhase = (idx: number) => { if (!config || config.phases.length <= 1) return; setConfig({ ...config, phases: config.phases.filter((_, i) => i !== idx) }); setEditingPhase(null) }
  const movePhase = (idx: number, dir: -1 | 1) => {
    if (!config) return; const t = idx + dir; if (t < 0 || t >= config.phases.length) return
    const p = [...config.phases]; [p[idx], p[t]] = [p[t], p[idx]]; setConfig({ ...config, phases: p }); setEditingPhase(t)
  }

  if (loading || !config) return (
    <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin mr-2 text-gray-600" size={16} /><span className="font-mono text-xs text-gray-600">Loading SDLC config…</span></div>
  )

  const tabs = [
    { key: 'pipeline', label: 'PIPELINE', icon: <GitBranch size={11} /> },
    { key: 'quality', label: 'QUALITY GATES', icon: <ShieldCheck size={11} /> },
    { key: 'engine', label: 'ENGINE & RULES', icon: <Activity size={11} /> },
  ] as const

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#060608', color: '#e2e8f0' }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-0" style={{ background: '#0a0e14', borderBottom: '1px solid #111820' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-orbitron font-bold text-white flex items-center gap-2" style={{ fontSize: '20px', letterSpacing: '0.05em' }}>
              <GitBranch size={16} style={{ color: '#00e5ff' }} />
              {config.name}
              {config.version && <span className="ml-1 text-xs font-normal px-1.5 py-0.5 rounded" style={{ background: '#001a40', color: '#60a5fa', border: '1px solid #0066ff44', fontSize: '8px' }}>v{config.version}</span>}
            </h1>
            <p className="font-orbitron mt-0.5" style={{ fontSize: '8px', color: '#374151', letterSpacing: '0.1em' }}>// {config.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && <button onClick={resetConfig} className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-orbitron" style={{ background: '#0d1117', border: '1px solid #1a2535', color: '#64748b', fontSize: '9px' }}><RotateCcw size={10} /> RESET</button>}
            <button onClick={saveConfig} disabled={!dirty || saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-orbitron font-semibold disabled:opacity-40" style={{ background: dirty ? 'linear-gradient(135deg,#0066ff,#00e5ff)' : '#0d1117', color: dirty ? 'white' : '#374151', border: `1px solid ${dirty ? '#00e5ff44' : '#1a2535'}`, fontSize: '9px' }}>
              {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} {saving ? 'SAVING…' : 'SAVE'}
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-0">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-orbitron transition-colors"
              style={{ color: activeTab === t.key ? '#00e5ff' : '#4a5568', borderBottom: activeTab === t.key ? '2px solid #00e5ff' : '2px solid transparent', fontSize: '9px', letterSpacing: '0.08em' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* ═══════════ TAB: PIPELINE ═══════════ */}
        {activeTab === 'pipeline' && (
          <>
            {/* Flow Overview */}
            <div className="rounded-xl p-4" style={{ background: '#0a0e14', border: '1px solid #111820' }}>
              <div className="font-orbitron text-xs font-bold mb-3" style={{ color: '#374151', fontSize: '9px', letterSpacing: '0.1em' }}>PIPELINE FLOW</div>
              <div className="flex items-start gap-0 overflow-x-auto pb-2">
                <FlowNode icon={config.entry.icon} label={config.entry.label} sublabel="project_id + trace_id" color="#00e5ff"
                  onClick={() => setEditingSection(editingSection === 'entry' ? null : 'entry')} isActive={editingSection === 'entry'} />
                <FlowArrow />
                <FlowNode icon={config.secretary.icon} label={config.secretary.label} sublabel="---TASKS---" color="#ff2d78"
                  onClick={() => setEditingSection(editingSection === 'secretary' ? null : 'secretary')} isActive={editingSection === 'secretary'} />
                <FlowArrow label="dispatch" />
                {config.phases.map((phase, idx) => (
                  <div key={phase.id} className="flex items-start">
                    <FlowNode icon={phase.icon} label={`P${idx}`} sublabel={phase.name} color={phase.color}
                      isActive={expandedPhase === idx} onClick={() => { setExpandedPhase(expandedPhase === idx ? null : idx); setEditingPhase(null) }} />
                    {idx < config.phases.length - 1 && <FlowArrow label={`Gate`} small />}
                  </div>
                ))}
                <FlowArrow label="Done" />
                <FlowNode icon="✅" label="Delivery" sublabel="Reliable software" color="#22c55e" />
              </div>
            </div>

            {/* Edit Entry/Secretary */}
            {editingSection === 'entry' && (
              <EditCard title="ENTRY POINT" color="#00e5ff" onClose={() => setEditingSection(null)}>
                <LabelInput label="Label" value={config.entry.label} onChange={v => setConfig({ ...config, entry: { ...config.entry, label: v } })} />
                <LabelInput label="Description" value={config.entry.description} onChange={v => setConfig({ ...config, entry: { ...config.entry, description: v } })} />
              </EditCard>
            )}
            {editingSection === 'secretary' && (
              <EditCard title="SECRETARY" color="#ff2d78" onClose={() => setEditingSection(null)}>
                <LabelInput label="Label" value={config.secretary.label} onChange={v => setConfig({ ...config, secretary: { ...config.secretary, label: v } })} />
                <LabelTextarea label="Description" value={config.secretary.description} onChange={v => setConfig({ ...config, secretary: { ...config.secretary, description: v } })} />
              </EditCard>
            )}

            {/* Phases */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#0a0e14', border: '1px solid #111820' }}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #111820' }}>
                <div className="font-orbitron text-xs font-bold" style={{ color: '#374151', fontSize: '9px', letterSpacing: '0.1em' }}>PHASES ({config.phases.length})</div>
                <button onClick={addPhase} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-orbitron" style={{ background: '#001a40', border: '1px solid #0066ff44', color: '#60a5fa', fontSize: '8px' }}><Plus size={10} /> ADD PHASE</button>
              </div>
              <div className="divide-y" style={{ borderColor: '#111820' }}>
                {config.phases.map((phase, idx) => {
                  const isExpanded = expandedPhase === idx
                  const isEditing = editingPhase === idx
                  return (
                    <div key={phase.id}>
                      {/* Row */}
                      <div className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors hover:bg-white/[0.02]" style={{ background: isExpanded ? 'rgba(255,255,255,0.02)' : undefined }}
                        onClick={() => { setExpandedPhase(isExpanded ? null : idx); setEditingPhase(null) }}>
                        {isExpanded ? <ChevronDown size={12} className="text-gray-600" /> : <ChevronRight size={12} className="text-gray-600" />}
                        <div className="w-7 h-7 rounded flex items-center justify-center text-sm flex-shrink-0" style={{ background: `${phase.color}15`, border: `1px solid ${phase.color}33` }}>{phase.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-orbitron text-xs font-bold" style={{ color: phase.color, fontSize: '10px' }}>PHASE {idx}</span>
                            <span className="text-xs text-white">{phase.name}</span>
                          </div>
                          <div className="text-xs truncate" style={{ color: '#4b5563', fontSize: '10px' }}>{phase.description}</div>
                        </div>
                        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                          {phase.roles.slice(0, 3).map((r, i) => <span key={i} className="px-1.5 py-0.5 rounded" style={{ background: `${phase.color}12`, color: `${phase.color}cc`, fontSize: '8px', border: `1px solid ${phase.color}22` }}>{r}</span>)}
                          {phase.roles.length > 3 && <span style={{ color: '#4b5563', fontSize: '9px' }}>+{phase.roles.length - 3}</span>}
                        </div>
                        {phase.artifacts && <span className="hidden lg:flex items-center gap-1 flex-shrink-0" style={{ color: '#4b5563', fontSize: '9px' }}><FileText size={9} /> {phase.artifacts.length} artifacts</span>}
                        <button onClick={e => { e.stopPropagation(); setEditingPhase(isEditing ? null : idx); setExpandedPhase(idx) }} className="p-1.5 rounded flex-shrink-0" style={{ background: isEditing ? '#001a40' : '#0d1117', border: `1px solid ${isEditing ? '#0066ff44' : '#1a2535'}` }}>
                          <Pencil size={10} style={{ color: isEditing ? '#60a5fa' : '#4b5563' }} />
                        </button>
                      </div>
                      {/* Expanded */}
                      {isExpanded && (
                        <div className="px-5 pb-4 pt-1 ml-8 space-y-3">
                          {isEditing ? (
                            <PhaseEditForm phase={phase} idx={idx} config={config}
                              updatePhase={updatePhase} removePhase={removePhase} movePhase={movePhase}
                              newRole={newRole} setNewRole={setNewRole} newArtifact={newArtifact} setNewArtifact={setNewArtifact} />
                          ) : (
                            <PhaseViewDetails phase={phase} />
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ═══════════ TAB: QUALITY GATES ═══════════ */}
        {activeTab === 'quality' && (
          <>
            {/* DoR & DoD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.dor && (
                <ChecklistCard icon={<ListChecks size={14} />} title={config.dor.label} color="#60a5fa" description={config.dor.description}
                  items={config.dor.checklist}
                  onUpdate={items => setConfig({ ...config, dor: { ...config.dor!, checklist: items } })} />
              )}
              {config.dod && (
                <div className="rounded-xl p-4 space-y-3" style={{ background: '#0a0e14', border: '1px solid #22c55e33' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={14} style={{ color: '#22c55e' }} />
                    <span className="font-orbitron text-xs font-bold" style={{ color: '#e2e8f0', fontSize: '10px' }}>{config.dod.label}</span>
                  </div>
                  <p className="text-xs" style={{ color: '#64748b', fontSize: '10px' }}>{config.dod.description}</p>
                  <div>
                    <span className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>TASK DONE</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.dod.taskChecklist.map((c, i) => <span key={i} className="px-1.5 py-0.5 rounded" style={{ background: '#001a0a', color: '#4ade80', fontSize: '9px', border: '1px solid #00802022' }}>✓ {c}</span>)}
                    </div>
                  </div>
                  <div>
                    <span className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>PHASE DONE</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.dod.phaseChecklist.map((c, i) => <span key={i} className="px-1.5 py-0.5 rounded" style={{ background: '#001a0a', color: '#4ade80', fontSize: '9px', border: '1px solid #00802022' }}>✓ {c}</span>)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Severity */}
            {config.qaLoop.severity && (
              <div className="rounded-xl p-4" style={{ background: '#0a0e14', border: '1px solid #111820' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Bug size={14} style={{ color: '#22c55e' }} />
                  <span className="font-orbitron text-xs font-bold" style={{ fontSize: '10px' }}>BUG SEVERITY POLICY</span>
                  <span className="text-xs" style={{ color: '#374151', fontSize: '9px' }}>— severity-based, not round-based</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  {Object.entries(config.qaLoop.severity).map(([key, val]: [string, any]) => {
                    const sColors: Record<string, string> = { P0: '#f87171', P1: '#fb923c', P2: '#f59e0b', P3: '#60a5fa', P4: '#64748b' }
                    const c = sColors[key] || '#64748b'
                    return (
                      <div key={key} className="rounded-lg p-3" style={{ background: '#070b10', border: `1px solid ${c}33` }}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-orbitron font-bold" style={{ fontSize: '11px', color: c }}>{key}</span>
                          <span className="text-xs" style={{ color: '#94a3b8', fontSize: '9px' }}>{val.label}</span>
                        </div>
                        <div className="text-xs mb-1" style={{ color: c, fontSize: '9px', fontWeight: 600 }}>{val.action}</div>
                        <div className="text-xs" style={{ color: '#4b5563', fontSize: '8px' }}>{val.examples}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Security */}
            {config.security && (
              <RulesCard icon={<Shield size={14} />} title="SECURITY RULES" color="#f87171" description={config.security.description}
                enabled={config.security.enabled} onToggle={() => setConfig({ ...config, security: { ...config.security!, enabled: !config.security!.enabled } })}
                rules={config.security.rules || []} />
            )}

            {/* Decision Rules */}
            {config.decisionRules && (
              <RulesCard icon={<Scale size={14} />} title="DEFAULT DECISION RULES" color="#a855f7" description="When ambiguous, follow these defaults"
                enabled={true} rules={config.decisionRules} />
            )}
          </>
        )}

        {/* ═══════════ TAB: ENGINE & RULES ═══════════ */}
        {activeTab === 'engine' && (
          <>
            {/* Feature toggles row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <ToggleCard icon={<Zap size={13} />} title="N2N" color="#60a5fa" enabled={config.n2n.enabled}
                onToggle={() => setConfig({ ...config, n2n: { ...config.n2n, enabled: !config.n2n.enabled } })}>
                <p className="text-xs" style={{ color: '#64748b', fontSize: '9px' }}>{config.n2n.description}</p>
                {config.n2n.maxHops && <div className="mt-1"><span className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>MAX HOPS:</span> <span className="font-semibold" style={{ color: '#60a5fa', fontSize: '10px' }}>{config.n2n.maxHops}</span></div>}
              </ToggleCard>
              <ToggleCard icon={<AlertTriangle size={13} />} title="ESCALATION" color="#f59e0b" enabled={config.escalation.enabled}
                onToggle={() => setConfig({ ...config, escalation: { ...config.escalation, enabled: !config.escalation.enabled } })}>
                <p className="text-xs" style={{ color: '#64748b', fontSize: '9px' }}>{config.escalation.description}</p>
                <div className="mt-1"><span className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>MAX LEVEL:</span> <span className="font-semibold" style={{ color: '#f59e0b', fontSize: '10px' }}>{config.escalation.maxLevel}</span></div>
              </ToggleCard>
              <ToggleCard icon={<Brain size={13} />} title="MEMORY" color="#a855f7" enabled={config.memory?.enabled ?? true}
                onToggle={() => setConfig({ ...config, memory: { ...config.memory!, enabled: !(config.memory?.enabled ?? true) } })}>
                {config.memory?.types.map((t, i) => (
                  <div key={i} className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs" style={{ color: '#94a3b8', fontSize: '9px' }}>{t.type}</span>
                    <span className="text-xs" style={{ color: '#4b5563', fontSize: '8px' }}>({t.ttl})</span>
                  </div>
                ))}
              </ToggleCard>
              <ToggleCard icon={<Activity size={13} />} title="OBSERVABILITY" color="#06b6d4" enabled={config.observability?.enabled ?? true}
                onToggle={() => setConfig({ ...config, observability: { ...config.observability!, enabled: !(config.observability?.enabled ?? true) } })}>
                <p className="text-xs" style={{ color: '#64748b', fontSize: '9px' }}>{config.observability?.description}</p>
              </ToggleCard>
            </div>

            {/* N2N Rules */}
            {config.n2n.rules && (
              <RulesCard icon={<Zap size={14} />} title="N2N ENGINE RULES" color="#60a5fa" description="Direct messaging controlled — every handoff must be traceable"
                enabled={config.n2n.enabled} rules={config.n2n.rules} />
            )}

            {/* Escalation Rules */}
            {config.escalation.rules && (
              <RulesCard icon={<AlertTriangle size={14} />} title="ESCALATION RULES" color="#f59e0b" description="Severity-based, not round-based"
                enabled={config.escalation.enabled} rules={config.escalation.rules} />
            )}

            {/* Message Blocks */}
            {config.messageBlocks && (
              <div className="rounded-xl p-4" style={{ background: '#0a0e14', border: '1px solid #111820' }}>
                <div className="flex items-center gap-2 mb-3">
                  <SendIcon size={14} style={{ color: '#00e5ff' }} />
                  <span className="font-orbitron text-xs font-bold" style={{ fontSize: '10px' }}>MESSAGE BLOCKS</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {config.messageBlocks.map((mb, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ background: '#070b10', border: '1px solid #1a2535' }}>
                      <code className="font-mono text-xs font-bold" style={{ color: '#00e5ff', fontSize: '10px' }}>{mb.name}</code>
                      <p className="text-xs mt-1" style={{ color: '#94a3b8', fontSize: '9px' }}>{mb.description}</p>
                      <span className="font-orbitron mt-1 inline-block px-1.5 py-0.5 rounded" style={{ fontSize: '7px', color: '#4b5563', background: '#0d1117', border: '1px solid #1a2535' }}>{mb.owner}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Memory Rules */}
            {config.memory?.rules && (
              <RulesCard icon={<Brain size={14} />} title="MEMORY MODEL RULES" color="#a855f7" description="Persist state at every important boundary"
                enabled={config.memory.enabled} rules={config.memory.rules} />
            )}

            {/* Observability */}
            {config.observability && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl p-4" style={{ background: '#0a0e14', border: '1px solid #06b6d433' }}>
                  <span className="font-orbitron text-xs font-bold" style={{ color: '#06b6d4', fontSize: '9px' }}>CORRELATION FIELDS</span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {config.observability.correlationFields.map((f, i) => <code key={i} className="px-1.5 py-0.5 rounded font-mono" style={{ background: '#001a2a', color: '#06b6d4', fontSize: '9px', border: '1px solid #06b6d422' }}>{f}</code>)}
                  </div>
                </div>
                <div className="rounded-xl p-4" style={{ background: '#0a0e14', border: '1px solid #06b6d433' }}>
                  <span className="font-orbitron text-xs font-bold" style={{ color: '#06b6d4', fontSize: '9px' }}>REQUIRED DASHBOARDS</span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {config.observability.dashboards.map((d, i) => <span key={i} className="px-1.5 py-0.5 rounded" style={{ background: '#001a2a', color: '#67e8f9', fontSize: '9px', border: '1px solid #06b6d422' }}>{d}</span>)}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function PhaseViewDetails({ phase }: { phase: Phase }) {
  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed" style={{ color: '#94a3b8', fontSize: '11px' }}>{phase.description}</p>
      <div className="flex flex-wrap gap-4">
        <div>
          <span className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>ROLES</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {phase.roles.map((r, i) => <span key={i} className="px-2 py-0.5 rounded" style={{ background: `${phase.color}12`, color: `${phase.color}cc`, fontSize: '10px', border: `1px solid ${phase.color}22` }}><Users size={9} className="inline mr-0.5" style={{ verticalAlign: '-1px' }} />{r}</span>)}
          </div>
        </div>
        <div>
          <span className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>GATE CHECK</span>
          <div className="flex items-start gap-1 mt-1"><ShieldCheck size={11} style={{ color: '#22c55e', marginTop: 1 }} /><span className="text-xs" style={{ color: '#94a3b8', fontSize: '10px' }}>{phase.gate}</span></div>
        </div>
      </div>
      {phase.artifacts && phase.artifacts.length > 0 && (
        <div>
          <span className="font-orbitron" style={{ fontSize: '8px', color: '#374151' }}>REQUIRED ARTIFACTS</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {phase.artifacts.map((a, i) => <code key={i} className="px-1.5 py-0.5 rounded font-mono" style={{ background: '#0d1117', color: '#64748b', fontSize: '9px', border: '1px solid #1a2535' }}><FileText size={8} className="inline mr-0.5" style={{ verticalAlign: '-1px' }} />{a}</code>)}
          </div>
        </div>
      )}
    </div>
  )
}

function PhaseEditForm({ phase, idx, config, updatePhase, removePhase, movePhase, newRole, setNewRole, newArtifact, setNewArtifact }: any) {
  const addRole = () => { if (!newRole.trim()) return; updatePhase(idx, { roles: [...phase.roles, newRole.trim()] }); setNewRole('') }
  const addArtifact = () => { if (!newArtifact.trim()) return; updatePhase(idx, { artifacts: [...(phase.artifacts || []), newArtifact.trim()] }); setNewArtifact('') }
  return (
    <div className="rounded-lg p-4 space-y-3" style={{ background: '#070b10', border: '1px solid #1a2535' }}>
      <div className="grid grid-cols-2 gap-3">
        <LabelInput label="Phase Name" value={phase.name} onChange={(v: string) => updatePhase(idx, { name: v })} />
        <div>
          <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#374151' }}>ICON</label>
          <div className="flex gap-1 flex-wrap">{PRESET_ICONS.map(ic => <button key={ic} onClick={() => updatePhase(idx, { icon: ic })} className="w-6 h-6 rounded flex items-center justify-center text-sm" style={{ background: phase.icon === ic ? `${phase.color}20` : '#0d1117', border: `1px solid ${phase.icon === ic ? phase.color : '#1a2535'}` }}>{ic}</button>)}</div>
        </div>
      </div>
      <LabelTextarea label="Description" value={phase.description} onChange={(v: string) => updatePhase(idx, { description: v })} />
      <LabelInput label="Gate Condition" value={phase.gate} onChange={(v: string) => updatePhase(idx, { gate: v })} />
      <div><label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#374151' }}>COLOR</label><div className="flex gap-1.5">{PRESET_COLORS.map(c => <button key={c} onClick={() => updatePhase(idx, { color: c })} className="w-5 h-5 rounded-full" style={{ background: c, border: phase.color === c ? '2px solid white' : '2px solid transparent', boxShadow: phase.color === c ? `0 0 6px ${c}` : 'none' }} />)}</div></div>
      {/* Roles */}
      <div>
        <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#374151' }}>ROLES ({phase.roles.length})</label>
        <div className="flex flex-wrap gap-1 mb-2">{phase.roles.map((r: string, ri: number) => <span key={ri} className="flex items-center gap-1 px-2 py-0.5 rounded" style={{ background: `${phase.color}15`, color: phase.color, fontSize: '10px', border: `1px solid ${phase.color}33` }}>{r}<button onClick={() => updatePhase(idx, { roles: phase.roles.filter((_: any, i: number) => i !== ri) })}><X size={8} /></button></span>)}</div>
        <div className="flex gap-2"><input value={newRole} onChange={(e: any) => setNewRole(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && addRole()} className="flex-1 px-2 py-1 rounded text-xs bg-transparent outline-none" style={{ border: '1px solid #1a2535', color: '#94a3b8', fontSize: '10px' }} placeholder="Add role…" /><button onClick={addRole} className="px-2 py-1 rounded" style={{ background: '#001a40', border: '1px solid #0066ff44', color: '#60a5fa' }}><Plus size={10} /></button></div>
      </div>
      {/* Artifacts */}
      <div>
        <label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#374151' }}>ARTIFACTS ({(phase.artifacts || []).length})</label>
        <div className="flex flex-wrap gap-1 mb-2">{(phase.artifacts || []).map((a: string, ai: number) => <code key={ai} className="flex items-center gap-1 px-1.5 py-0.5 rounded font-mono" style={{ background: '#0d1117', color: '#64748b', fontSize: '9px', border: '1px solid #1a2535' }}>{a}<button onClick={() => updatePhase(idx, { artifacts: phase.artifacts.filter((_: any, i: number) => i !== ai) })}><X size={8} /></button></code>)}</div>
        <div className="flex gap-2"><input value={newArtifact} onChange={(e: any) => setNewArtifact(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && addArtifact()} className="flex-1 px-2 py-1 rounded text-xs bg-transparent outline-none font-mono" style={{ border: '1px solid #1a2535', color: '#94a3b8', fontSize: '10px' }} placeholder="e.g. api_contract.yaml" /><button onClick={addArtifact} className="px-2 py-1 rounded" style={{ background: '#001a40', border: '1px solid #0066ff44', color: '#60a5fa' }}><Plus size={10} /></button></div>
      </div>
      <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid #1a2535' }}>
        <button onClick={() => movePhase(idx, -1)} disabled={idx === 0} className="px-2 py-1 rounded text-xs font-orbitron disabled:opacity-30" style={{ background: '#0d1117', border: '1px solid #1a2535', color: '#64748b', fontSize: '8px' }}>← UP</button>
        <button onClick={() => movePhase(idx, 1)} disabled={idx === config.phases.length - 1} className="px-2 py-1 rounded text-xs font-orbitron disabled:opacity-30" style={{ background: '#0d1117', border: '1px solid #1a2535', color: '#64748b', fontSize: '8px' }}>DOWN →</button>
        <div className="flex-1" />
        <button onClick={() => removePhase(idx)} className="flex items-center gap-1 px-2 py-1 rounded font-orbitron" style={{ background: '#1a0000', border: '1px solid #ff000044', color: '#f87171', fontSize: '8px' }}><Trash2 size={9} /> DELETE</button>
      </div>
    </div>
  )
}

function FlowNode({ icon, label, sublabel, color, isActive, onClick }: { icon: string; label: string; sublabel: string; color: string; isActive?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} className="flex flex-col items-center gap-1 flex-shrink-0 transition-all" style={{ cursor: onClick ? 'pointer' : 'default', minWidth: 68 }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all" style={{ background: `${color}15`, border: `1.5px solid ${isActive ? color : `${color}44`}`, boxShadow: isActive ? `0 0 10px ${color}33` : 'none', transform: isActive ? 'scale(1.1)' : 'scale(1)' }}>{icon}</div>
      <span className="font-orbitron text-center" style={{ fontSize: '8px', color: isActive ? color : '#64748b' }}>{label}</span>
      <span className="text-center" style={{ fontSize: '7px', color: '#374151', maxWidth: 72 }}>{sublabel.length > 20 ? sublabel.slice(0, 18) + '…' : sublabel}</span>
    </div>
  )
}

function FlowArrow({ label, small }: { label?: string; small?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center flex-shrink-0 pt-2" style={{ minWidth: small ? 28 : 40 }}>
      <div className="flex items-center"><div style={{ width: small ? 8 : 14, height: 1, background: '#1a2535' }} /><ArrowRight size={9} style={{ color: '#1a2535', marginLeft: -3 }} /></div>
      {label && <span className="font-orbitron mt-0.5" style={{ fontSize: '6px', color: '#1f2937' }}>{label}</span>}
    </div>
  )
}

function EditCard({ title, color, onClose, children }: { title: string; color: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: '#0a0e14', border: `1px solid ${color}33` }}>
      <div className="flex items-center justify-between">
        <span className="font-orbitron text-xs font-bold" style={{ color, fontSize: '10px' }}>EDIT: {title}</span>
        <button onClick={onClose} className="p-1 rounded" style={{ background: '#0d1117', border: '1px solid #1a2535' }}><X size={10} className="text-gray-500" /></button>
      </div>
      {children}
    </div>
  )
}

function ToggleCard({ icon, title, color, enabled, onToggle, children }: { icon: React.ReactNode; title: string; color: string; enabled: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3" style={{ background: enabled ? '#0a0e14' : '#060608', border: `1px solid ${enabled ? `${color}33` : '#111820'}`, opacity: enabled ? 1 : 0.5 }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5"><div style={{ color: enabled ? color : '#374151' }}>{icon}</div><span className="font-orbitron text-xs font-bold" style={{ color: enabled ? '#e2e8f0' : '#374151', fontSize: '9px' }}>{title}</span></div>
        <button onClick={onToggle} className="relative w-7 h-3.5 rounded-full transition-colors" style={{ background: enabled ? `${color}33` : '#1a2535' }}>
          <div className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all" style={{ left: enabled ? 14 : 2, background: enabled ? color : '#374151' }} />
        </button>
      </div>
      {children}
    </div>
  )
}

function RulesCard({ icon, title, color, description, enabled, rules, onToggle }: { icon: React.ReactNode; title: string; color: string; description: string; enabled: boolean; rules: string[]; onToggle?: () => void }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#0a0e14', border: `1px solid ${color}33`, opacity: enabled ? 1 : 0.5 }}>
      <div className="flex items-center gap-2 mb-2">
        <div style={{ color }}>{icon}</div>
        <span className="font-orbitron text-xs font-bold" style={{ fontSize: '10px' }}>{title}</span>
        {onToggle && (
          <button onClick={onToggle} className="relative w-7 h-3.5 rounded-full ml-auto" style={{ background: enabled ? `${color}33` : '#1a2535' }}>
            <div className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all" style={{ left: enabled ? 14 : 2, background: enabled ? color : '#374151' }} />
          </button>
        )}
      </div>
      <p className="text-xs mb-2" style={{ color: '#64748b', fontSize: '9px' }}>{description}</p>
      <div className="space-y-1">
        {rules.map((r, i) => <div key={i} className="flex items-start gap-1.5"><span style={{ color, fontSize: '8px', marginTop: 2 }}>▸</span><span className="text-xs" style={{ color: '#94a3b8', fontSize: '10px' }}>{r}</span></div>)}
      </div>
    </div>
  )
}

function ChecklistCard({ icon, title, color, description, items, onUpdate }: { icon: React.ReactNode; title: string; color: string; description: string; items: string[]; onUpdate: (items: string[]) => void }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#0a0e14', border: `1px solid ${color}33` }}>
      <div className="flex items-center gap-2 mb-1"><div style={{ color }}>{icon}</div><span className="font-orbitron text-xs font-bold" style={{ color: '#e2e8f0', fontSize: '10px' }}>{title}</span></div>
      <p className="text-xs mb-2" style={{ color: '#64748b', fontSize: '10px' }}>{description}</p>
      <div className="space-y-1">
        {items.map((item, i) => <div key={i} className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded" style={{ background: '#001a40', color, fontSize: '9px', border: `1px solid ${color}22` }}>✓ {item}</span></div>)}
      </div>
    </div>
  )
}

function LabelInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (<div><label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#374151' }}>{label.toUpperCase()}</label><input value={value} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 rounded text-xs bg-transparent outline-none" style={{ border: '1px solid #1a2535', color: '#e2e8f0', fontSize: '11px' }} /></div>)
}
function LabelTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (<div><label className="font-orbitron block mb-1" style={{ fontSize: '8px', color: '#374151' }}>{label.toUpperCase()}</label><textarea value={value} onChange={e => onChange(e.target.value)} rows={2} className="w-full px-2 py-1.5 rounded text-xs bg-transparent outline-none resize-none" style={{ border: '1px solid #1a2535', color: '#e2e8f0', fontSize: '11px' }} /></div>)
}
