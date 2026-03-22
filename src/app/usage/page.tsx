'use client'

import { useEffect, useState, useCallback } from 'react'
import { Zap, Calendar, TrendingUp, Clock, BarChart2, Bot } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface SessionData {
  tokens: number
  missions: number
  done_tokens: number
  done_missions: number
  running_missions: number
  failed_missions: number
  resets_in_ms: number
  resets_in: string
}
interface WeeklyData {
  tokens: number
  missions: number
  done_tokens: number
  active_days: number
  resets_in_ms: number
  resets_in: string
}
interface DayData {
  day: string
  tokens: number
  missions: number
  done: number
  failed: number
}
interface HourData {
  hour: string
  tokens: number
  missions: number
}
interface AgentData {
  name: string
  sprite: string
  color: string
  tokens: number
  missions: number
}
interface UsageData {
  session: SessionData
  weekly: WeeklyData
  daily: DayData[]
  hourly: HourData[]
  topAgents: AgentData[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function dayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
}

function msToCountdown(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${String(h % 24).padStart(2, '0')}h ${String(m % 60).padStart(2, '0')}m`
  if (h > 0) return `${String(h).padStart(2, '0')}h ${String(m % 60).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`
  return `${String(m).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function Pulse({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: color, boxShadow: `0 0 6px ${color}` }}
    />
  )
}

function StatBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-orbitron font-bold" style={{ fontSize: '18px', color }}>{value}</span>
      <span className="font-orbitron text-gray-600" style={{ fontSize: '8px', letterSpacing: '0.1em' }}>{label}</span>
    </div>
  )
}

// Countdown that ticks every second
function Countdown({ initialMs }: { initialMs: number }) {
  const [ms, setMs] = useState(initialMs)
  useEffect(() => {
    const iv = setInterval(() => setMs((p) => Math.max(0, p - 1000)), 1000)
    return () => clearInterval(iv)
  }, [])
  useEffect(() => { setMs(initialMs) }, [initialMs])
  return <span>{msToCountdown(ms)}</span>
}

// Bar chart for daily/hourly
function MiniBar({
  value, max, color, label, subLabel,
}: {
  value: number; max: number; color: string; label: string; subLabel?: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="flex flex-col items-center gap-1" style={{ flex: 1, minWidth: 0 }}>
      <div
        className="w-full relative rounded-sm overflow-hidden"
        style={{ height: '64px', background: '#0a0e16', border: '1px solid #111820' }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 rounded-sm transition-all duration-500"
          style={{ height: `${pct}%`, background: color, opacity: 0.85 }}
        />
        {value > 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center font-orbitron"
            style={{ fontSize: '7px', color: '#fff', opacity: 0.9, textShadow: '0 1px 2px #000' }}
          >
            {fmt(value)}
          </div>
        )}
      </div>
      <span className="font-orbitron text-gray-600 text-center truncate w-full" style={{ fontSize: '7px' }}>
        {label}
      </span>
      {subLabel && (
        <span className="font-orbitron text-center" style={{ fontSize: '6px', color: '#374151' }}>
          {subLabel}
        </span>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/usage')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const iv = setInterval(load, 15_000)
    return () => clearInterval(iv)
  }, [load])

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div
            className="w-8 h-8 border-2 rounded-full mx-auto animate-spin"
            style={{ borderColor: '#00e5ff', borderTopColor: 'transparent' }}
          />
          <p className="font-orbitron text-gray-500" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>
            LOADING USAGE DATA...
          </p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="font-orbitron text-red-500" style={{ fontSize: '11px' }}>
          ERROR: {error ?? 'No data'}
        </p>
      </div>
    )
  }

  const { session, weekly, daily, hourly, topAgents } = data

  const maxDayTokens = Math.max(...daily.map((d) => d.tokens), 1)
  const maxHourTokens = Math.max(...hourly.map((h) => h.tokens), 1)
  const maxAgentTokens = topAgents[0]?.tokens ?? 1

  // Session progress (visual only — no hard limit, scale to week avg)
  const weekAvgPerDay = weekly.tokens / 7
  const sessionPct = weekAvgPerDay > 0
    ? Math.min(100, (session.tokens / (weekAvgPerDay * 1.5)) * 100)
    : Math.min(100, (session.tokens / 50_000) * 100)

  // Weekly progress bar (scale to 500K as reference)
  const weeklyRef = Math.max(weekly.tokens * 1.2, 500_000)
  const weeklyPct = Math.min(100, (weekly.tokens / weeklyRef) * 100)

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-white font-bold" style={{ fontSize: '18px', letterSpacing: '0.12em' }}>
            USAGE
          </h1>
          <p className="font-orbitron text-gray-600 mt-0.5" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>
            // CLAUDE TOKEN CONSUMPTION MONITOR
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pulse color="#22c55e" />
          <span className="font-orbitron text-gray-500" style={{ fontSize: '9px', letterSpacing: '0.1em' }}>
            AUTO-REFRESH 15s
          </span>
        </div>
      </div>

      {/* ── Session + Weekly cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Session card */}
        <div
          className="rounded-lg p-5 space-y-4"
          style={{ background: '#0a0e16', border: '1px solid #1a2535' }}
        >
          {/* Card header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: '#00e5ff15', border: '1px solid #00e5ff30' }}
              >
                <Zap size={14} color="#00e5ff" />
              </div>
              <div>
                <div className="font-orbitron text-white font-bold" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
                  CURRENT SESSION
                </div>
                <div className="font-orbitron text-gray-600" style={{ fontSize: '8px' }}>
                  resets at midnight
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded"
              style={{ background: '#00e5ff10', border: '1px solid #00e5ff20' }}
            >
              <Clock size={9} color="#00e5ff" />
              <span className="font-orbitron font-bold" style={{ fontSize: '10px', color: '#00e5ff' }}>
                <Countdown initialMs={session.resets_in_ms} />
              </span>
            </div>
          </div>

          {/* Token count + progress */}
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <span className="font-orbitron font-bold" style={{ fontSize: '32px', color: '#00e5ff', lineHeight: 1 }}>
                {fmt(session.tokens)}
              </span>
              <span className="font-orbitron text-gray-500" style={{ fontSize: '9px' }}>
                tokens today
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: '6px', background: '#111820' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${sessionPct}%`,
                  background: `linear-gradient(90deg, #00e5ff, #0080ff)`,
                  boxShadow: `0 0 8px #00e5ff60`,
                }}
              />
            </div>
          </div>

          {/* Mini stats row */}
          <div
            className="grid grid-cols-4 gap-2 pt-2"
            style={{ borderTop: '1px solid #111820' }}
          >
            <StatBadge label="MISSIONS" value={session.missions} color="#a0aec0" />
            <StatBadge label="DONE" value={session.done_missions} color="#22c55e" />
            <StatBadge label="RUNNING" value={session.running_missions} color="#f59e0b" />
            <StatBadge label="FAILED" value={session.failed_missions} color="#ef4444" />
          </div>
        </div>

        {/* Weekly card */}
        <div
          className="rounded-lg p-5 space-y-4"
          style={{ background: '#0a0e16', border: '1px solid #1a2535' }}
        >
          {/* Card header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: '#a855f715', border: '1px solid #a855f730' }}
              >
                <Calendar size={14} color="#a855f7" />
              </div>
              <div>
                <div className="font-orbitron text-white font-bold" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
                  WEEKLY LIMITS
                </div>
                <div className="font-orbitron text-gray-600" style={{ fontSize: '8px' }}>
                  resets Monday 00:00
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded"
              style={{ background: '#a855f710', border: '1px solid #a855f720' }}
            >
              <Clock size={9} color="#a855f7" />
              <span className="font-orbitron font-bold" style={{ fontSize: '10px', color: '#a855f7' }}>
                <Countdown initialMs={weekly.resets_in_ms} />
              </span>
            </div>
          </div>

          {/* Token count + progress */}
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <span className="font-orbitron font-bold" style={{ fontSize: '32px', color: '#a855f7', lineHeight: 1 }}>
                {fmt(weekly.tokens)}
              </span>
              <span className="font-orbitron text-gray-500" style={{ fontSize: '9px' }}>
                tokens this week
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: '6px', background: '#111820' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${weeklyPct}%`,
                  background: `linear-gradient(90deg, #a855f7, #ec4899)`,
                  boxShadow: `0 0 8px #a855f760`,
                }}
              />
            </div>
          </div>

          {/* Mini stats row */}
          <div
            className="grid grid-cols-3 gap-2 pt-2"
            style={{ borderTop: '1px solid #111820' }}
          >
            <StatBadge label="MISSIONS" value={weekly.missions} color="#a0aec0" />
            <StatBadge label="DONE" value={weekly.done_tokens > 0 ? fmt(weekly.done_tokens) : '—'} color="#22c55e" />
            <StatBadge label="ACTIVE DAYS" value={weekly.active_days} color="#a855f7" />
          </div>
        </div>
      </div>

      {/* ── Daily bar chart ─────────────────────────────────────── */}
      <div
        className="rounded-lg p-5 space-y-4"
        style={{ background: '#0a0e16', border: '1px solid #1a2535' }}
      >
        <div className="flex items-center gap-2">
          <BarChart2 size={14} color="#f59e0b" />
          <span className="font-orbitron text-white font-bold" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
            DAILY USAGE — LAST 7 DAYS
          </span>
          <span className="font-orbitron text-gray-600 ml-auto" style={{ fontSize: '8px' }}>
            tokens
          </span>
        </div>

        <div className="flex gap-2 items-end">
          {daily.map((d) => (
            <MiniBar
              key={d.day}
              value={d.tokens}
              max={maxDayTokens}
              color={d.day === new Date().toISOString().slice(0, 10) ? '#00e5ff' : '#2d7fff'}
              label={dayLabel(d.day)}
              subLabel={d.missions > 0 ? `${d.missions}m` : undefined}
            />
          ))}
        </div>

        {/* Row stats */}
        <div className="flex gap-6" style={{ borderTop: '1px solid #111820', paddingTop: '12px' }}>
          {daily.map((d) => (
            <div key={d.day} className="flex flex-col items-center gap-0.5" style={{ flex: 1 }}>
              <div className="flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
                <span className="font-orbitron text-gray-500" style={{ fontSize: '7px' }}>{d.done}</span>
              </div>
              {d.failed > 0 && (
                <div className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444' }} />
                  <span className="font-orbitron text-gray-500" style={{ fontSize: '7px' }}>{d.failed}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Hourly today + Top agents ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Hourly today */}
        <div
          className="rounded-lg p-5 space-y-4"
          style={{ background: '#0a0e16', border: '1px solid #1a2535' }}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={14} color="#22c55e" />
            <span className="font-orbitron text-white font-bold" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
              HOURLY — TODAY
            </span>
            <span className="font-orbitron text-gray-600 ml-auto" style={{ fontSize: '8px' }}>
              24h
            </span>
          </div>

          <div className="flex gap-0.5 items-end" style={{ height: '64px' }}>
            {hourly.map((h) => {
              const pct = maxHourTokens > 0 ? (h.tokens / maxHourTokens) * 100 : 0
              const isNow = h.hour === String(new Date().getHours()).padStart(2, '0')
              return (
                <div
                  key={h.hour}
                  className="flex-1 flex flex-col justify-end"
                  title={`${h.hour}:00 — ${h.tokens.toLocaleString()} tokens, ${h.missions} missions`}
                >
                  <div
                    className="w-full rounded-sm transition-all duration-500"
                    style={{
                      height: `${Math.max(pct, h.tokens > 0 ? 4 : 0)}%`,
                      background: isNow ? '#22c55e' : '#1a3a2a',
                      minHeight: h.tokens > 0 ? '3px' : '0',
                    }}
                  />
                </div>
              )
            })}
          </div>

          {/* Hour labels — just show a few */}
          <div className="flex justify-between">
            {['00', '06', '12', '18', '23'].map((h) => (
              <span key={h} className="font-orbitron text-gray-700" style={{ fontSize: '7px' }}>
                {h}h
              </span>
            ))}
          </div>
        </div>

        {/* Top agents */}
        <div
          className="rounded-lg p-5 space-y-3"
          style={{ background: '#0a0e16', border: '1px solid #1a2535' }}
        >
          <div className="flex items-center gap-2">
            <Bot size={14} color="#06b6d4" />
            <span className="font-orbitron text-white font-bold" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
              TOP CONSUMERS — WEEK
            </span>
          </div>

          <div className="space-y-2">
            {topAgents.length === 0 && (
              <p className="font-orbitron text-gray-600" style={{ fontSize: '9px' }}>No data yet</p>
            )}
            {topAgents.map((agent, i) => {
              const pct = maxAgentTokens > 0 ? (agent.tokens / maxAgentTokens) * 100 : 0
              const barColor = agent.color && agent.color !== '#ffffff' ? agent.color : '#2d7fff'
              return (
                <div key={agent.name} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '13px', lineHeight: 1 }}>{agent.sprite}</span>
                    <span
                      className="font-orbitron text-gray-300 flex-1 truncate"
                      style={{ fontSize: '9px' }}
                    >
                      {agent.name}
                    </span>
                    <span className="font-orbitron font-bold" style={{ fontSize: '9px', color: barColor }}>
                      {fmt(agent.tokens)}
                    </span>
                    <span className="font-orbitron text-gray-600" style={{ fontSize: '8px' }}>
                      {agent.missions}m
                    </span>
                  </div>
                  <div
                    className="w-full rounded-full overflow-hidden"
                    style={{ height: '3px', background: '#111820' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: barColor, opacity: 0.8 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}
