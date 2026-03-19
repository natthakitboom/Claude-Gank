'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Agent } from '@/lib/types'
import PixelSprite from '@/components/PixelSprite'
import PixelRoom from '@/components/PixelRoom'
import { useLanguage } from '@/lib/i18n'

const TEAM_ORDER = ['CORE', 'TECH', 'CREATIVE', 'BUSINESS', 'FINANCE']
const TEAM_DISPLAY: Record<string, string> = { CORE: 'CORE', TECH: 'TECH', CREATIVE: 'CREATIVE', BUSINESS: 'BIZ', FINANCE: 'FINANCE' }
const TEAM_CAT_CLASS: Record<string, string> = { CORE: 'cat-core', TECH: 'cat-tech', CREATIVE: 'cat-creative', BUSINESS: 'cat-biz', FINANCE: 'cat-finance' }
const TEAM_COLOR: Record<string, string> = { CORE: '#ff2d78', TECH: '#2d7fff', CREATIVE: '#a855f7', BUSINESS: '#22c55e', FINANCE: '#06b6d4' }

interface Stats {
  totalAgents: number; workingAgents: number; totalMissions: number; doneMissions: number
  runningMissions: number; totalMemories: number; totalTokens: number; totalMessages: number
  recentMissions: any[]; teamStats: any[]
}

interface RunningMission {
  id: string; agent_id: string; title: string; output: string | null; status: string; created_at: string
}

interface AlertMessage {
  id: string; from_agent: string; content: string; metadata_json: string; read: number; created_at: string
}

/* ── Alert badge type for an agent ── */
type AlertBadge = 'error' | 'stuck' | 'idle' | null

function getAgentBadge(
  agent: Agent,
  failedMissions: RunningMission[],
  runningMissions: RunningMission[],
): AlertBadge {
  const now = Date.now()
  // ERROR: failed mission in last 6h
  const cutoff = now - 6 * 60 * 60 * 1000
  const hasFailed = failedMissions.some(m =>
    m.agent_id === agent.id && new Date(m.created_at).getTime() > cutoff
  )
  if (hasFailed) return 'error'
  // STUCK: running > 30 min
  const stuckMission = runningMissions.find(m => {
    if (m.agent_id !== agent.id) return false
    const age = now - new Date(m.created_at).getTime()
    return age > 30 * 60 * 1000
  })
  if (stuckMission) return 'stuck'
  // IDLE: no missions in 7 days — we infer from agent having no current activity
  // (full idle check is done server-side; here we just show if status is idle for > 7d which isn't tracked client-side)
  return null
}

/* ── Agent at Desk ── */
function AgentDesk({ agent, liveOutput, badge }: { agent: Agent; liveOutput?: string; badge: AlertBadge }) {
  const isWorking = agent.status === 'working'
  const { t } = useLanguage()
  const lastLine = liveOutput
    ? liveOutput.trim().split('\n').filter(Boolean).slice(-1)[0]?.slice(0, 60)
    : null

  return (
    <Link
      href={`/agents?selected=${agent.id}`}
      className={`desk-slot ${isWorking ? 'is-working' : 'is-idle'}`}
      style={{ width: 96 }}
      title={`${agent.name} — ${agent.role}${badge === 'error' ? ' ⚠️ มี mission ล้มเหลว' : badge === 'stuck' ? ' ⏳ mission ค้างอยู่' : ''}`}
    >
      <div className="sprite-glow relative">
        <PixelSprite agentId={agent.id} size={40} />
        {isWorking && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <div className="typing-dots"><span /><span /><span /></div>
          </div>
        )}
        {/* Alert badge */}
        {badge && (
          <div className={`agent-alert-badge agent-alert-${badge}`} title={
            badge === 'error' ? 'Mission ล้มเหลว' : badge === 'stuck' ? 'Mission ค้าง > 30 นาที' : 'ไม่มีงานมานาน'
          } />
        )}
      </div>
      <div className="desk-furniture" />
      <div className="monitor-glow" />
      <div className="text-center mt-0.5" style={{ maxWidth: 92 }}>
        <div className="text-white truncate" style={{ fontSize: '9px', lineHeight: 1.3 }}>{agent.name}</div>
        <div className="truncate" style={{ fontSize: '7px', color: '#475569', lineHeight: 1.2 }}>{agent.role}</div>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          <span className={`status-dot ${agent.status}`} />
          <span className="font-orbitron" style={{
            fontSize: '6px', letterSpacing: '0.08em',
            color: isWorking ? '#10b981' : '#374151',
          }}>
            {isWorking ? t('active') : t('standby')}
          </span>
        </div>
      </div>
      {/* Live output ticker */}
      {isWorking && lastLine && (
        <div
          className="mt-1 rounded px-1 py-0.5 text-center overflow-hidden"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', maxWidth: 92 }}
        >
          <div className="font-orbitron truncate" style={{ fontSize: '6px', color: '#10b981', letterSpacing: '0.03em' }}>
            {lastLine}
          </div>
        </div>
      )}
    </Link>
  )
}

/* ── Office Room with Pixel Art Background ── */
function OfficeSection({ team, agents, stats, runningMissions, failedMissions }: {
  team: string; agents: Agent[]; stats: Stats; runningMissions: RunningMission[]; failedMissions: RunningMission[]
}) {
  const color = TEAM_COLOR[team]
  const ts = stats.teamStats?.find((t: any) => t.team === team)
  const working = agents.filter((a) => a.status === 'working').length
  const { t } = useLanguage()

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ border: `1px solid ${color}33` }}>
      <div className="absolute inset-0 opacity-60">
        <PixelRoom team={team} agentCount={agents.length} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="flex items-center gap-2">
            <span className={`cat-badge ${TEAM_CAT_CLASS[team]}`}>{TEAM_DISPLAY[team]}</span>
            <span className="font-orbitron" style={{ fontSize: '8px', color: '#64748b' }}>{agents.length} {t('agents_count')}</span>
            {working > 0 && (
              <span className="flex items-center gap-1">
                <span className="status-dot working" />
                <span className="font-orbitron" style={{ fontSize: '8px', color: '#10b981' }}>{working} {t('active')}</span>
              </span>
            )}
          </div>
          <span className="font-orbitron" style={{ fontSize: '8px', color, letterSpacing: '0.05em' }}>
            {ts?.mission_count ?? 0} {t('missions_label')}
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-1 px-2 py-3" style={{ minHeight: 120 }}>
          {agents.map((a) => {
            const rm = runningMissions.find(m => m.agent_id === a.id)
            const badge = getAgentBadge(a, failedMissions, runningMissions)
            return <AgentDesk key={a.id} agent={a} liveOutput={rm?.output ?? undefined} badge={badge} />
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Alerts Panel ── */
function AlertsPanel({ alerts, onAcknowledge }: { alerts: AlertMessage[]; onAcknowledge: (id: string, action: string) => void }) {
  const parseMetadata = (json: string) => { try { return JSON.parse(json) } catch { return {} } }
  const { t } = useLanguage()

  return (
    <div className="rounded-lg overflow-hidden flex flex-col" style={{ background: '#111827', border: '1px solid #1e2d40', height: '100%' }}>
      <div className="px-3 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: '1px solid #1e2d40' }}>
        <span className="font-orbitron" style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '0.08em' }}>
          {t('supervisor_alerts')}
        </span>
        {alerts.filter(a => a.read === 0).length > 0 && (
          <span className="font-orbitron px-1.5 py-0.5 rounded" style={{ fontSize: '7px', background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
            {alerts.filter(a => a.read === 0).length} NEW
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-6 gap-2">
            <div className="font-orbitron" style={{ fontSize: '7px', color: '#1f2937', letterSpacing: '0.08em' }}>{t('all_clear')}</div>
            <div style={{ fontSize: '20px', opacity: 0.3 }}>✅</div>
          </div>
        )}
        {alerts.map((alert) => {
          const meta = parseMetadata(alert.metadata_json)
          const severity = meta.severity || 'medium'
          const requiresConfirmation = meta.requires_confirmation
          const isUnread = alert.read === 0

          return (
            <div
              key={alert.id}
              className="rounded p-2"
              style={{
                background: isUnread ? 'rgba(148,163,184,0.05)' : '#0a0c12',
                border: `1px solid ${severity === 'high' ? 'rgba(239,68,68,0.3)' : severity === 'medium' ? 'rgba(245,158,11,0.2)' : '#1e2d40'}`,
                opacity: isUnread ? 1 : 0.6,
              }}
            >
              <div className="flex items-start gap-2">
                <span style={{ fontSize: '12px', lineHeight: 1.4 }}>
                  {severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '⚪'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-white" style={{ fontSize: '9px', lineHeight: 1.5 }}>{alert.content}</div>
                  <div className="font-orbitron mt-1" style={{ fontSize: '6px', color: '#374151' }}>
                    {new Date(alert.created_at).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              </div>

              {(isUnread || requiresConfirmation) && (
                <div className="flex gap-1 mt-1.5">
                  {requiresConfirmation && isUnread ? (
                    <>
                      <button
                        onClick={() => onAcknowledge(alert.id, 'approve')}
                        className="font-orbitron px-2 py-0.5 rounded text-center flex-1"
                        style={{ fontSize: '7px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer' }}
                      >
                        {t('approve')}
                      </button>
                      <button
                        onClick={() => onAcknowledge(alert.id, 'reject')}
                        className="font-orbitron px-2 py-0.5 rounded text-center flex-1"
                        style={{ fontSize: '7px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}
                      >
                        {t('reject')}
                      </button>
                    </>
                  ) : isUnread ? (
                    <button
                      onClick={() => onAcknowledge(alert.id, 'read')}
                      className="font-orbitron px-2 py-0.5 rounded w-full"
                      style={{ fontSize: '7px', background: '#1e2d40', color: '#64748b', border: '1px solid #2d3f55', cursor: 'pointer' }}
                    >
                      {t('acknowledge')}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Run supervisor manually */}
      <div className="p-2" style={{ borderTop: '1px solid #1e2d40' }}>
        <button
          onClick={async () => { await fetch('/api/supervisor', { method: 'POST' }) }}
          className="font-orbitron w-full py-1.5 rounded"
          style={{ fontSize: '7px', color: '#94a3b8', background: 'rgba(148,163,184,0.05)', border: '1px solid #1e2d40', cursor: 'pointer', letterSpacing: '0.05em' }}
        >
          {t('run_supervisor')}
        </button>
      </div>
    </div>
  )
}

/* ── War Room Page ── */
export default function WarRoomPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [runningMissions, setRunningMissions] = useState<RunningMission[]>([])
  const [failedMissions, setFailedMissions] = useState<RunningMission[]>([])
  const [alerts, setAlerts] = useState<AlertMessage[]>([])
  const [learnState, setLearnState] = useState<'idle' | 'loading' | 'done'>('idle')
  const { t } = useLanguage()

  const handleForceLearn = async () => {
    setLearnState('loading')
    try {
      const res = await fetch('/api/agents')
      const allAgents: Agent[] = await res.json()
      const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })

      await Promise.all(allAgents.map(agent =>
        fetch('/api/missions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `[Skill Update] ${agent.name} — Daily Learning`,
            description: `# [Skill Update] ภารกิจอัปเดทความรู้ประจำวัน\n\nคุณคือ ${agent.name} บทบาท: ${agent.role}\n\n## ภารกิจ\nทบทวนและอัปเดทความรู้ของคุณในฐานะ ${agent.role} โดย:\n\n1. **ทบทวนทักษะหลัก**: ระบุ top 3 ทักษะสำคัญที่คุณมี\n2. **เทรนด์ล่าสุด**: อ้างอิงความรู้เกี่ยวกับ best practices และ trends ล่าสุดในสาขาของคุณ\n3. **แผนพัฒนา**: ระบุ 3 สิ่งที่จะนำไปปรับใช้ในการทำงาน\n4. **Insight สำคัญ**: แชร์ insight ที่เป็นประโยชน์สำหรับทีม\n\n## ⚠️ ต้องมี block นี้ตอนท้ายเสมอ\n\n---KEY LEARNINGS---\nทักษะหลัก: [ระบุทักษะหลัก 3 อย่าง คั่นด้วย |]\nเทรนด์: [ระบุ trend สำคัญ 2-3 อย่าง]\nแผนพัฒนา: [ระบุ action items 3 ข้อ]\nInsight: [insight สำคัญ 1-2 ข้อ]\nอัปเดทเมื่อ: ${today}\n---END---`,
            agent_id: agent.id,
            priority: 'normal',
            auto_run: true,
          }),
        }).catch(() => {})
      ))

      setLearnState('done')
      setTimeout(() => setLearnState('idle'), 3000)
    } catch {
      setLearnState('idle')
    }
  }

  const fetchAll = async () => {
    try {
      const [sRes, aRes, mRes, fRes, alRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/agents'),
        fetch('/api/missions?status=running'),
        fetch('/api/missions?status=failed'),
        fetch('/api/supervisor'),
      ])
      setStats(await sRes.json())
      setAgents(await aRes.json())
      setRunningMissions(await mRes.json())
      setFailedMissions(await fRes.json())
      setAlerts(await alRes.json())
    } catch {}
  }

  const handleAcknowledge = async (id: string, action: string) => {
    await fetch('/api/supervisor', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: 1 } : a))
  }

  useEffect(() => { fetchAll(); const i = setInterval(fetchAll, 2000); return () => clearInterval(i) }, [])

  if (!stats) return (
    <div className="flex items-center justify-center h-96">
      <span className="font-orbitron text-sm" style={{ color: '#374151', letterSpacing: '0.1em' }}>{t('loading_hq')}</span>
    </div>
  )

  const teamAgents = (team: string) => agents.filter((a) => a.team === team)
  const unreadAlerts = alerts.filter(a => a.read === 0).length

  const statCards = [
    { label: t('agents_count'), value: stats.totalAgents, sub: `${stats.workingAgents} ${t('active')}`, color: '#2d7fff' },
    { label: t('missions_label'), value: stats.totalMissions, sub: `${stats.runningMissions} ${t('running_sub')}`, color: '#00e5ff' },
    { label: t('completed'), value: stats.doneMissions, sub: t('done_sub'), color: '#22c55e' },
    { label: t('memories'), value: stats.totalMemories, sub: t('stored_sub'), color: '#a855f7' },
    { label: t('tokens'), value: stats.totalTokens.toLocaleString(), sub: t('used_sub'), color: '#f59e0b' },
  ]

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-orbitron font-bold text-white" style={{ fontSize: '28px', letterSpacing: '0.05em' }}>{t('warroom_title')}</h1>
          <p className="font-orbitron mt-1" style={{ fontSize: '10px', color: '#374151', letterSpacing: '0.1em' }}>{t('warroom_subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadAlerts > 0 && (
            <span className="font-orbitron px-2 py-1 rounded" style={{ fontSize: '8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              ⚠️ {unreadAlerts} ALERTS
            </span>
          )}
          <button
            onClick={handleForceLearn}
            disabled={learnState !== 'idle'}
            className="font-orbitron px-3 py-1.5 rounded transition-all"
            style={{
              fontSize: '9px',
              letterSpacing: '0.06em',
              cursor: learnState !== 'idle' ? 'not-allowed' : 'pointer',
              background: learnState === 'done' ? 'rgba(34,197,94,0.15)' : 'rgba(168,85,247,0.1)',
              color: learnState === 'done' ? '#22c55e' : learnState === 'loading' ? '#94a3b8' : '#a855f7',
              border: `1px solid ${learnState === 'done' ? 'rgba(34,197,94,0.3)' : 'rgba(168,85,247,0.3)'}`,
            }}
          >
            {learnState === 'loading' ? t('force_learn_loading') : learnState === 'done' ? t('force_learn_done') : t('force_learn')}
          </button>
          <Link href="/missions" className="btn-deploy">{t('deploy_mission')}</Link>
        </div>
      </div>

      {/* Mini stat bar */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-lg px-3 py-2 flex items-center gap-3" style={{ background: '#111827', border: '1px solid #1e2d40' }}>
            <div>
              <div className="text-lg font-bold text-white leading-none">{s.value}</div>
              <div className="font-orbitron" style={{ fontSize: '7px', color: s.color, letterSpacing: '0.05em' }}>{s.sub}</div>
            </div>
            <div className="font-orbitron" style={{ fontSize: '7px', color: '#374151', letterSpacing: '0.08em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Office Floor Plan */}
      <div className="space-y-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 2.5fr' }}>
          <OfficeSection team="CORE" agents={teamAgents('CORE')} stats={stats} runningMissions={runningMissions} failedMissions={failedMissions} />
          <OfficeSection team="TECH" agents={teamAgents('TECH')} stats={stats} runningMissions={runningMissions} failedMissions={failedMissions} />
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: '2.5fr 1.5fr' }}>
          <OfficeSection team="CREATIVE" agents={teamAgents('CREATIVE')} stats={stats} runningMissions={runningMissions} failedMissions={failedMissions} />
          <OfficeSection team="BUSINESS" agents={teamAgents('BUSINESS')} stats={stats} runningMissions={runningMissions} failedMissions={failedMissions} />
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          <OfficeSection team="FINANCE" agents={teamAgents('FINANCE')} stats={stats} runningMissions={runningMissions} failedMissions={failedMissions} />
          <AlertsPanel alerts={alerts} onAcknowledge={handleAcknowledge} />
        </div>
      </div>
    </div>
  )
}
