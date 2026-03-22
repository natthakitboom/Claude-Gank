'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import PixelSprite from '@/components/PixelSprite'

// ── Types ──────────────────────────────────────────────────────
interface LiveMission {
  id: string
  title: string
  status: string
  phase: number
  output: string | null
  agent_id: string
  agent_name: string
  agent_sprite: string
  agent_color: string
  agent_team: string
  parent_mission_id: string | null
  created_at: string
  tokens_used: number
  // SDLC v2.0 fields
  trace_id?: string
  hop_count?: number
  gate_status?: string
  escalation_level?: number
  owner?: string
  dedupe_key?: string
}

interface ProjectInfo {
  id: string
  name: string
  mission_id: string
}

// ── Fallback phase config (loaded dynamically from /api/sdlc) ─
const FALLBACK_PHASES = [
  { id: 0, name: 'Kickoff & Triage', color: '#ff2d78' },
  { id: 1, name: 'Analyze & Design', color: '#a855f7' },
  { id: 2, name: 'Development', color: '#2d7fff' },
  { id: 3, name: 'QA & Validation', color: '#22c55e' },
  { id: 4, name: 'Integration & Release', color: '#06b6d4' },
  { id: 5, name: 'Progressive Release', color: '#f59e0b' },
  { id: 6, name: 'Learn & Improve', color: '#64748b' },
]

const STATUS_COLORS: Record<string, string> = {
  running: '#10b981',
  done: '#22c55e',
  failed: '#ef4444',
  pending: '#3b82f6',
  waiting: '#f59e0b',
  waiting_phase: '#f59e0b',
  waiting_retest: '#a855f7',
}
const GATE_COLORS: Record<string, string> = {
  pass: '#22c55e',
  conditional_pass: '#f59e0b',
  fail: '#ef4444',
  blocked: '#a855f7',
}

// Derived lookups from FALLBACK_PHASES
const PHASE_COLORS: Record<number, string> = Object.fromEntries(FALLBACK_PHASES.map(p => [p.id, p.color]))
const PHASE_NAMES: Record<number, string> = Object.fromEntries(FALLBACK_PHASES.map(p => [p.id, p.name]))

// ── Terminal Card Component ────────────────────────────────────
function AgentTerminal({ mission, expanded, onToggle }: {
  mission: LiveMission
  expanded: boolean
  onToggle: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevLen = useRef(0)
  const animFrameRef = useRef<number>(0)
  const isRunning = mission.status === 'running'
  const output = mission.output || ''
  const phaseColor = PHASE_COLORS[mission.phase] || '#666'

  // Smooth auto-scroll: jump instantly if far away, animate if close
  useEffect(() => {
    if (output.length <= prevLen.current) {
      prevLen.current = output.length
      return
    }
    prevLen.current = output.length

    const el = scrollRef.current
    if (!el) return

    // Cancel previous animation
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    const target = el.scrollHeight - el.clientHeight
    const distance = target - el.scrollTop
    if (distance <= 2) return

    // If user scrolled up manually (more than 200px from bottom), don't auto-scroll
    if (distance > el.clientHeight * 2) {
      // Far from bottom = snap immediately
      el.scrollTop = el.scrollHeight
      return
    }

    // Animate smoothly over ~300ms — 18 frames at 60fps
    const steps = 18
    let step = 0
    const perStep = distance / steps

    const tick = () => {
      step++
      if (!scrollRef.current) return
      scrollRef.current.scrollTop += perStep
      if (step < steps) {
        animFrameRef.current = requestAnimationFrame(tick)
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }
    animFrameRef.current = requestAnimationFrame(tick)

    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [output])

  // Render last N lines for compact view, full for expanded
  const lines = output.split('\n')
  const displayLines = expanded ? lines : lines.slice(-30)
  const charCount = output.length
  const tokenEst = Math.round(charCount / 4)

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden transition-all"
      style={{
        background: '#0a0c12',
        border: `1px solid ${isRunning ? phaseColor + '55' : '#1a2030'}`,
        boxShadow: isRunning ? `0 0 20px ${phaseColor}15` : 'none',
        height: expanded ? '85vh' : undefined,
        maxHeight: expanded ? '85vh' : 460,
        minHeight: 220,
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        onClick={onToggle}
        style={{
          background: isRunning ? `${phaseColor}10` : '#111827',
          borderBottom: `1px solid ${isRunning ? phaseColor + '33' : '#1a2030'}`,
        }}
      >
        <PixelSprite agentId={mission.agent_id} size={24} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-medium truncate" style={{ fontSize: '11px' }}>
              {mission.agent_name}
            </span>
            <span
              className="font-orbitron px-1.5 py-0.5 rounded"
              style={{
                fontSize: '7px',
                background: phaseColor + '20',
                color: phaseColor,
                border: `1px solid ${phaseColor}40`,
              }}
            >
              P{mission.phase}
            </span>
            <span
              className="font-orbitron px-1.5 py-0.5 rounded"
              style={{
                fontSize: '7px',
                background: (STATUS_COLORS[mission.status] || '#666') + '15',
                color: STATUS_COLORS[mission.status] || '#666',
              }}
            >
              {mission.status === 'waiting_phase' ? 'WAITING' : mission.status === 'waiting_retest' ? 'RETEST' : mission.status.toUpperCase()}
            </span>
            {mission.gate_status && (
              <span
                className="font-orbitron px-1.5 py-0.5 rounded"
                style={{
                  fontSize: '7px',
                  background: (GATE_COLORS[mission.gate_status] || '#666') + '15',
                  color: GATE_COLORS[mission.gate_status] || '#666',
                  border: `1px solid ${(GATE_COLORS[mission.gate_status] || '#666')}40`,
                }}
              >
                GATE: {mission.gate_status.toUpperCase().replace('_', ' ')}
              </span>
            )}
            {mission.hop_count != null && mission.hop_count > 0 && (
              <span
                className="font-orbitron px-1.5 py-0.5 rounded"
                style={{
                  fontSize: '7px',
                  background: '#06b6d415',
                  color: '#06b6d4',
                  border: '1px solid #06b6d440',
                }}
              >
                HOP {mission.hop_count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 truncate" style={{ fontSize: '9px', color: '#475569' }}>
            <span className="truncate">{mission.title}</span>
            {mission.trace_id && (
              <span style={{ fontSize: '7px', color: '#334155', fontFamily: 'monospace' }}>
                [{mission.trace_id.slice(0, 8)}]
              </span>
            )}
          </div>
        </div>
        {/* Stats */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {charCount > 0 && (
            <span className="font-orbitron" style={{ fontSize: '7px', color: isRunning ? phaseColor + 'aa' : '#374151' }}>
              {charCount >= 1000 ? `${(charCount/1000).toFixed(1)}k` : charCount} chars
            </span>
          )}
          {isRunning && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: phaseColor }} />
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: phaseColor, animationDelay: '0.25s' }} />
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: phaseColor, animationDelay: '0.5s' }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Terminal Output ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3"
        style={{
          fontFamily: "'Fira Code', 'Noto Sans Thai', monospace",
          fontSize: expanded ? '12px' : '11px',
          lineHeight: 1.65,
          color: '#c8d6e5',
          background: '#060608',
        }}
      >
        {output.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            {isRunning ? (
              <>
                <div className="flex gap-1.5">
                  {[0,1,2,3,4].map(i => (
                    <span
                      key={i}
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{
                        background: phaseColor,
                        opacity: 0.8,
                        animation: `pulse 1.2s ease-in-out ${i * 0.18}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <span className="font-orbitron" style={{ fontSize: '9px', color: phaseColor, opacity: 0.7, letterSpacing: '0.15em' }}>
                  กำลังคิด...
                </span>
              </>
            ) : mission.status === 'waiting_phase' ? (
              <span className="font-orbitron" style={{ fontSize: '9px', color: '#f59e0b', opacity: 0.6 }}>
                ⏳ รอ Phase {mission.phase - 1} เสร็จก่อน
              </span>
            ) : mission.status === 'waiting' || mission.status === 'waiting_retest' ? (
              <span className="font-orbitron" style={{ fontSize: '9px', color: '#a855f7', opacity: 0.6 }}>
                ⏳ รอผลลัพธ์...
              </span>
            ) : (
              <span className="font-orbitron" style={{ fontSize: '9px', color: '#374151' }}>— ยังไม่มี output —</span>
            )}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-words m-0" style={{ color: '#c8d6e5' }}>
            {!expanded && lines.length > 30 && (
              <span style={{ color: '#374151', fontStyle: 'italic' }}>... ({lines.length - 30} lines above){'\n'}</span>
            )}
            {displayLines.join('\n')}
            {isRunning && (
              <span
                className="inline-block w-2 h-4 ml-0.5"
                style={{
                  background: phaseColor,
                  animation: 'pulse 0.8s ease-in-out infinite',
                  verticalAlign: 'text-bottom',
                }}
              />
            )}
          </pre>
        )}
      </div>
    </div>
  )
}

// ── Phase Progress Bar ─────────────────────────────────────────
function PhaseProgress({ missions }: { missions: LiveMission[] }) {
  if (missions.length === 0) return null

  const phases = FALLBACK_PHASES.map(p => p.id)
  const phaseStatus = phases.map(p => {
    const pMissions = missions.filter(m => m.phase === p)
    if (pMissions.length === 0) return 'empty'
    if (pMissions.some(m => m.status === 'running')) return 'running'
    if (pMissions.every(m => m.status === 'done' || m.status === 'failed')) return 'done'
    if (pMissions.some(m => m.status === 'waiting_phase' || m.status === 'waiting' || m.status === 'waiting_retest')) return 'waiting'
    return 'pending'
  })

  return (
    <div className="flex items-center gap-1">
      {phases.map((p, i) => {
        const status = phaseStatus[i]
        const color = PHASE_COLORS[p]
        const count = missions.filter(m => m.phase === p).length

        return (
          <div key={p} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className="h-px"
                style={{
                  width: 16,
                  background: status === 'done' ? color : '#1e2d40',
                }}
              />
            )}
            <div
              className="flex items-center gap-1 px-2 py-1 rounded"
              style={{
                background: status === 'running' ? color + '20' : status === 'done' ? color + '10' : '#111827',
                border: `1px solid ${status === 'running' ? color + '60' : status === 'done' ? color + '30' : '#1e2d40'}`,
              }}
            >
              {status === 'running' && (
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
              )}
              {status === 'done' && (
                <span style={{ fontSize: '8px' }}>✓</span>
              )}
              <span className="font-orbitron" style={{
                fontSize: '8px',
                color: status === 'running' ? color : status === 'done' ? color : '#475569',
                letterSpacing: '0.05em',
              }}>
                P{p} {PHASE_NAMES[p]}
              </span>
              {count > 0 && (
                <span className="font-orbitron" style={{ fontSize: '7px', color: '#374151' }}>
                  ({count})
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Monitor Page ──────────────────────────────────────────
export default function MonitorPage() {
  const [missions, setMissions] = useState<LiveMission[]>([])
  const [allProjectMissions, setAllProjectMissions] = useState<LiveMission[]>([])
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'active' | 'all'>('active')
  const [autoScroll, setAutoScroll] = useState(true)

  const fetchMissions = useCallback(async () => {
    try {
      // Get running missions
      const runRes = await fetch('/api/missions?status=running')
      const running: LiveMission[] = await runRes.json()

      // Get recently done/failed (last 30 minutes)
      const recentRes = await fetch('/api/missions?date=today')
      const recent: LiveMission[] = await recentRes.json()

      // Find active project (has running sub-missions)
      const parentIds = new Set(running.filter(m => m.parent_mission_id).map(m => m.parent_mission_id!))
      let activeParent = parentIds.size > 0 ? Array.from(parentIds)[0] : null

      // If no running, check for latest project with sub-missions
      if (!activeParent) {
        const projectMissions = recent.filter(m =>
          m.parent_mission_id && (m.status === 'done' || m.status === 'waiting_phase' || m.status === 'waiting' || m.status === 'waiting_retest')
        )
        if (projectMissions.length > 0) {
          activeParent = projectMissions[0].parent_mission_id
        }
      }

      // If we have an active project, get ALL its sub-missions
      if (activeParent) {
        const allSubs = recent.filter(m => m.parent_mission_id === activeParent)
        // Also add running ones not in recent
        for (const r of running) {
          if (r.parent_mission_id === activeParent && !allSubs.find(s => s.id === r.id)) {
            allSubs.push(r)
          }
        }
        setAllProjectMissions(allSubs.sort((a, b) => (a.phase || 0) - (b.phase || 0)))

        // Get project info
        try {
          const projRes = await fetch('/api/projects')
          const projects: ProjectInfo[] = await projRes.json()
          const p = projects.find((p: any) => p.mission_id === activeParent)
          setProject(p || null)
        } catch {}
      }

      // Active view: running + recently done with output
      const active = [
        ...running,
        ...recent.filter(m =>
          m.parent_mission_id &&
          (m.status === 'done' || m.status === 'failed') &&
          m.output &&
          !running.find(r => r.id === m.id)
        ).slice(0, 12),
      ]

      setMissions(active)
    } catch {}
  }, [])

  useEffect(() => {
    fetchMissions()
    // Poll faster when missions are running
    const getInterval = () => {
      const hasRunning = missions.some(m => m.status === 'running')
      return hasRunning ? 800 : 2000
    }
    let interval = setInterval(() => {
      fetchMissions()
    }, 800)
    return () => clearInterval(interval)
  }, [fetchMissions])

  // Determine what to display
  const projectMissions = viewMode === 'all' ? allProjectMissions : missions.filter(m => m.parent_mission_id)
  const standaloneMissions = missions.filter(m => !m.parent_mission_id && m.status === 'running')
  const runningCount = missions.filter(m => m.status === 'running').length
  const waitingCount = allProjectMissions.filter(m => m.status === 'waiting_phase' || m.status === 'waiting').length

  // Grid columns based on mission count
  const totalCards = projectMissions.length + standaloneMissions.length
  const gridCols = expandedId
    ? '1fr'
    : totalCards <= 2 ? 'repeat(2, 1fr)'
    : totalCards <= 4 ? 'repeat(2, 1fr)'
    : totalCards <= 6 ? 'repeat(3, 1fr)'
    : 'repeat(4, 1fr)'

  return (
    <div className="p-4 min-h-screen" style={{ background: '#060608' }}>
      {/* ── Top Bar ── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-orbitron font-bold text-white" style={{ fontSize: '20px', letterSpacing: '0.05em' }}>
              LIVE MONITOR
            </h1>
            {runningCount > 0 && (
              <span className="flex items-center gap-1.5 font-orbitron px-2 py-1 rounded" style={{
                fontSize: '9px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)',
              }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10b981' }} />
                {runningCount} RUNNING
              </span>
            )}
            {waitingCount > 0 && (
              <span className="font-orbitron px-2 py-1 rounded" style={{
                fontSize: '9px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)',
              }}>
                {waitingCount} WAITING
              </span>
            )}
            {runningCount === 0 && waitingCount === 0 && missions.length === 0 && (
              <span className="font-orbitron px-2 py-1 rounded" style={{
                fontSize: '9px', background: '#111827', color: '#374151', border: '1px solid #1e2d40',
              }}>
                ALL IDLE
              </span>
            )}
          </div>
          {project && (
            <div className="mt-1 flex items-center gap-2">
              <span style={{ fontSize: '10px', color: '#475569' }}>Project:</span>
              <span className="font-medium text-white" style={{ fontSize: '11px' }}>{project.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded overflow-hidden" style={{ border: '1px solid #1e2d40' }}>
            <button
              onClick={() => setViewMode('active')}
              className="font-orbitron px-3 py-1"
              style={{
                fontSize: '8px',
                background: viewMode === 'active' ? '#1e2d40' : 'transparent',
                color: viewMode === 'active' ? '#94a3b8' : '#374151',
                cursor: 'pointer',
              }}
            >
              ACTIVE
            </button>
            <button
              onClick={() => setViewMode('all')}
              className="font-orbitron px-3 py-1"
              style={{
                fontSize: '8px',
                background: viewMode === 'all' ? '#1e2d40' : 'transparent',
                color: viewMode === 'all' ? '#94a3b8' : '#374151',
                cursor: 'pointer',
              }}
            >
              ALL PHASES
            </button>
          </div>
          {expandedId && (
            <button
              onClick={() => setExpandedId(null)}
              className="font-orbitron px-3 py-1 rounded"
              style={{ fontSize: '8px', background: '#1e2d40', color: '#94a3b8', cursor: 'pointer', border: '1px solid #2d3f55' }}
            >
              ← GRID VIEW
            </button>
          )}
        </div>
      </div>

      {/* ── Phase Progress ── */}
      {allProjectMissions.length > 0 && (
        <div className="mb-4">
          <PhaseProgress missions={allProjectMissions} />
        </div>
      )}

      {/* ── Empty State ── */}
      {totalCards === 0 && (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
          <div style={{ fontSize: '60px', opacity: 0.15 }}>🖥️</div>
          <div className="font-orbitron mt-4" style={{ fontSize: '12px', color: '#1f2937', letterSpacing: '0.1em' }}>
            NO ACTIVE MISSIONS
          </div>
          <div className="mt-2" style={{ fontSize: '10px', color: '#111827' }}>
            Deploy a mission via 🏢 TEAM to see live agent output here
          </div>
        </div>
      )}

      {/* ── Terminal Grid ── */}
      {totalCards > 0 && (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: gridCols,
          }}
        >
          {/* Standalone running missions (not part of a project) */}
          {standaloneMissions.map(m => (
            <AgentTerminal
              key={m.id}
              mission={m}
              expanded={expandedId === m.id}
              onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
            />
          ))}

          {/* Project missions sorted by phase */}
          {(expandedId ? projectMissions.filter(m => m.id === expandedId) : projectMissions).map(m => (
            <AgentTerminal
              key={m.id}
              mission={m}
              expanded={expandedId === m.id}
              onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
