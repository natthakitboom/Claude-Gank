'use client'

import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Users, Crosshair, Radio, Flag, Cpu, ChevronLeft, CalendarClock, FolderOpen, MessageCircle, BarChart2, GitBranch, RefreshCw, X, LayoutTemplate } from 'lucide-react'
import { LanguageProvider, useLanguage } from '@/lib/i18n'

const NAV_KEYS = [
  { href: '/agents',   key: 'nav_agents',   Icon: Users },
  { href: '/projects', key: 'nav_projects', Icon: FolderOpen },
  { href: '/templates',  key: 'nav_templates',  Icon: LayoutTemplate },
  // { href: '/warroom',  key: 'nav_warroom',  Icon: Crosshair },
  { href: '/usage',    key: 'nav_usage',    Icon: BarChart2 },
  { href: '/comms',    key: 'nav_comms',    Icon: Radio },
  // { href: '/chat',     key: 'nav_chat',     Icon: MessageCircle },
  { href: '/missions', key: 'nav_missions', Icon: Flag },
  { href: '/sdlc',     key: 'nav_sdlc',     Icon: GitBranch },
  // { href: '/schedule', key: 'nav_schedule', Icon: CalendarClock },
  { href: '/system',   key: 'nav_system',   Icon: Cpu },
] as const

type LogItem = { type: string; msg: string }

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const [_workingAgents, setWorkingAgents] = useState(0)
  const [runningMissions, setRunningMissions] = useState(0)
  const [stuckMissions, setStuckMissions] = useState(0)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateBehind, setUpdateBehind] = useState(0)
  const [updateLatestMsg, setUpdateLatestMsg] = useState('')
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateLogs, setUpdateLogs] = useState<LogItem[]>([])
  const [updating, setUpdating] = useState(false)
  const { lang, t, toggle } = useLanguage()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats')
        const data = await res.json()
        setWorkingAgents(data.workingAgents ?? 0)
        setRunningMissions(data.runningMissions ?? 0)
        setStuckMissions(data.stuckMissions ?? 0)
      } catch { /* ignore */ }
    }
    fetchStats()
    const iv = setInterval(fetchStats, 8000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/system/version')
        const data = await res.json()
        if (!data.error) {
          setUpdateAvailable(!data.upToDate)
          setUpdateBehind(data.behind ?? 0)
          setUpdateLatestMsg(data.latestMessage ?? '')
        }
      } catch { /* ignore */ }
    }
    check()
    const iv = setInterval(check, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  const runUpdate = async () => {
    setUpdating(true)
    setUpdateLogs([])
    try {
      const res = await fetch('/api/system/update', { method: 'POST' })
      if (!res.body) return
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let active = true
      while (active) {
        const chunk = await reader.read()
        if (chunk.done) { active = false; break }
        buf += decoder.decode(chunk.value, { stream: true })
        const parts = buf.split('\n')
        buf = parts.pop() ?? ''
        parts.forEach((part) => {
          if (part.startsWith('data: ')) {
            try {
              const item: LogItem = JSON.parse(part.slice(6))
              setUpdateLogs((prev) => [...prev, item])
              if (item.type === 'done') setUpdateAvailable(false)
            } catch { /* ignore */ }
          }
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setUpdateLogs((prev) => [...prev, { type: 'error', msg: msg }])
    } finally {
      setUpdating(false)
    }
  }

  const w = collapsed ? '64px' : '220px'

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-50 transition-all duration-300"
      style={{ width: w, background: '#13101e', borderRight: '1px solid #2d2848' }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: '#2d2848' }}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1c1830', border: '1px solid #4a4275' }}>
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <defs>
                <filter id="cglow"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <linearGradient id="cgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#9b93c8"/><stop offset="100%" stopColor="#635C8A"/></linearGradient>
              </defs>
              <polygon points="14,2 24,7.5 24,18.5 14,24 4,18.5 4,7.5" fill="none" stroke="#9b93c8" strokeWidth="0.8" strokeOpacity="0.3"/>
              <polygon points="14,5 21,9 21,17 14,21 7,17 7,9" fill="url(#cgrad)" fillOpacity="0.15" stroke="#9b93c8" strokeWidth="0.6" strokeOpacity="0.6"/>
              <text x="9" y="17" fill="#c4bfe8" fontSize="8" fontFamily="monospace" fontWeight="bold" filter="url(#cglow)">CG</text>
            </svg>
          </div>
          {!collapsed && (
            <div>
              <div className="font-bold leading-tight" style={{ fontSize: '15px', color: '#ede9f8' }}>Claude Gang</div>
              <div className="text-xs mt-0.5" style={{ color: '#5a5680' }}>{t('cmd_center')}</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_KEYS.map(({ href, key, Icon }) => {
          const isActive = pathname === href || (href === '/projects' && pathname === '/')
          return (
            <Link
              key={href} href={href}
              className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
              title={collapsed ? t(key) : undefined}
              style={{ fontSize: '13px', padding: collapsed ? '10px 0' : '10px 16px', justifyContent: collapsed ? 'center' : undefined }}
            >
              <Icon size={18} className="nav-icon flex-shrink-0" />
              {!collapsed && <span>{t(key)}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t px-3 py-3 space-y-2" style={{ borderColor: '#2d2848' }}>

        {/* Language Toggle */}
        <button onClick={toggle} className="flex items-center justify-center w-full rounded-lg transition-colors" style={{ background: '#1c1830', border: '1px solid #2d2848', padding: collapsed ? '6px' : '6px 10px' }} title="Toggle Language">
          {collapsed ? (
            <span className="font-bold text-xs" style={{ color: '#c4bfe8' }}>{lang}</span>
          ) : (
            <div className="flex items-center gap-1 w-full">
              <span className="font-bold px-2 py-0.5 rounded flex-1 text-center text-xs" style={{ background: lang === 'EN' ? 'rgba(99,92,138,0.2)' : 'transparent', color: lang === 'EN' ? '#c4bfe8' : '#5a5680', border: lang === 'EN' ? '1px solid rgba(99,92,138,0.4)' : '1px solid transparent' }}>EN</span>
              <span className="text-xs" style={{ color: '#3d3a55' }}>/</span>
              <span className="font-bold px-2 py-0.5 rounded flex-1 text-center text-xs" style={{ background: lang === 'TH' ? 'rgba(99,92,138,0.2)' : 'transparent', color: lang === 'TH' ? '#c4bfe8' : '#5a5680', border: lang === 'TH' ? '1px solid rgba(99,92,138,0.4)' : '1px solid transparent' }}>TH</span>
            </div>
          )}
        </button>

        {/* Mission health */}
        {!collapsed ? (
          <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: stuckMissions > 0 ? 'rgba(239,68,68,0.07)' : runningMissions > 0 ? 'rgba(251,191,36,0.07)' : 'rgba(34,197,94,0.07)', border: `1px solid ${stuckMissions > 0 ? 'rgba(239,68,68,0.2)' : runningMissions > 0 ? 'rgba(251,191,36,0.2)' : 'rgba(34,197,94,0.2)'}` }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stuckMissions > 0 ? '#ef4444' : runningMissions > 0 ? '#fbbf24' : '#22c55e', boxShadow: `0 0 5px ${stuckMissions > 0 ? '#ef4444' : runningMissions > 0 ? '#fbbf24' : '#22c55e'}` }} />
            <div className="text-xs leading-tight" style={{ color: stuckMissions > 0 ? '#ef4444' : runningMissions > 0 ? '#fbbf24' : '#22c55e' }}>
              {stuckMissions > 0 ? `⚠ ${stuckMissions} ${t('health_stuck')}` : runningMissions > 0 ? `⚡ ${runningMissions} ${t('health_running')}` : `✓ ${t('health_ok')}`}
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2.5 h-2.5 rounded-full" title={stuckMissions > 0 ? `${stuckMissions} ${t('health_stuck')}` : runningMissions > 0 ? `${runningMissions} ${t('health_running')}` : t('health_ok')} style={{ background: stuckMissions > 0 ? '#ef4444' : runningMissions > 0 ? '#fbbf24' : '#22c55e', boxShadow: `0 0 6px ${stuckMissions > 0 ? '#ef4444' : runningMissions > 0 ? '#fbbf24' : '#22c55e'}` }} />
          </div>
        )}

        {/* Update button */}
        <button
          onClick={() => { setShowUpdateModal(true); setUpdateLogs([]) }}
          className="flex items-center justify-center gap-2 w-full rounded-lg transition-all relative"
          title={updateAvailable ? `${updateBehind} ${t('update_new_badge')}` : t('update_check_tooltip')}
          style={{ background: updateAvailable ? 'rgba(251,191,36,0.12)' : '#1c1830', border: `1px solid ${updateAvailable ? 'rgba(251,191,36,0.4)' : '#2d2848'}`, padding: collapsed ? '6px' : '6px 10px' }}
        >
          {updateAvailable && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#fbbf24', color: '#000', fontSize: '9px' }}>{updateBehind}</span>}
          <RefreshCw size={13} style={{ color: updateAvailable ? '#fbbf24' : '#4b5563' }} />
          {!collapsed && <span className="text-xs font-semibold" style={{ color: updateAvailable ? '#fbbf24' : '#4b5563' }}>{updateAvailable ? `${t('update_btn')} (${updateBehind})` : t('update_latest')}</span>}
        </button>

        {/* Collapse toggle */}
        <button onClick={onToggle} className="flex items-center gap-2 text-gray-600 hover:text-gray-400 transition-colors w-full rounded-lg py-1.5" style={{ paddingLeft: collapsed ? 0 : '4px', justifyContent: collapsed ? 'center' : undefined }}>
          <ChevronLeft size={16} className="transition-transform duration-300 flex-shrink-0" style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          {!collapsed && <span className="text-xs">{t('collapse')}</span>}
        </button>
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed z-[200]" style={{ left: w, bottom: '16px', width: '420px' }}>
          <div style={{ background: '#13101e', border: '1px solid #2d2848', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2d2848' }}>
              <div className="flex items-center gap-2">
                <RefreshCw size={14} style={{ color: '#9b93c8' }} />
                <span className="font-semibold text-sm" style={{ color: '#c4bfe8' }}>{t('update_title')}</span>
                {updateAvailable && <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>{updateBehind} {t('update_new_badge')}</span>}
              </div>
              <button onClick={() => setShowUpdateModal(false)} className="hover:text-gray-400" style={{ color: '#4b5563' }}><X size={15} /></button>
            </div>
            {!updating && updateLogs.length === 0 && (
              <div className="px-4 py-4">
                {updateAvailable ? (
                  <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <div className="text-sm font-semibold mb-1" style={{ color: '#fbbf24' }}>{lang === 'TH' ? `มี ${updateBehind} เวอร์ชันใหม่` : `${updateBehind} new versions available`}</div>
                    {updateLatestMsg && <div className="text-xs" style={{ color: '#6b7280' }}>{updateLatestMsg}</div>}
                  </div>
                ) : (
                  <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div className="text-sm font-semibold" style={{ color: '#22c55e' }}>{t('update_on_latest')}</div>
                  </div>
                )}
                <button onClick={runUpdate} className="w-full rounded-lg py-2.5 text-sm font-semibold transition-all" style={{ background: updateAvailable ? '#fbbf24' : '#1c1830', color: updateAvailable ? '#000' : '#5a5680', border: `1px solid ${updateAvailable ? '#fbbf24' : '#2d2848'}` }}>
                  {updateAvailable ? t('update_do_now') : t('update_check_again')}
                </button>
              </div>
            )}
            {(updating || updateLogs.length > 0) && (
              <div className="px-4 py-3">
                <div className="rounded-lg p-3 font-mono overflow-y-auto" style={{ background: '#020408', border: '1px solid #0F0B0D', height: '220px', fontSize: '11px', lineHeight: '1.7' }}>
                  {updateLogs.map((l, i) => (
                    <div key={i} style={{ color: l.type === 'error' ? '#ef4444' : l.type === 'warn' ? '#fbbf24' : l.type === 'done' ? '#22c55e' : '#9ca3af' }}>{l.msg}</div>
                  ))}
                  {updating && <div style={{ color: '#9b93c8' }}>|</div>}
                </div>
                {!updating && (
                  <button onClick={() => setUpdateLogs([])} className="w-full mt-2 rounded-lg py-2 text-sm text-gray-500 hover:text-gray-400" style={{ border: '1px solid #2d2848', background: '#1c1830' }}>{t('update_close')}</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

function WelcomeModal() {
  const [show, setShow] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    if (!localStorage.getItem('cg_welcomed_v1')) setShow(true)
  }, [])

  if (!show) return null

  const dismiss = () => {
    localStorage.setItem('cg_welcomed_v1', '1')
    setShow(false)
  }

  const steps = [
    { icon: '💬', title: t('welcome_step1_title'), desc: t('welcome_step1_desc') },
    { icon: '⚙️', title: t('welcome_step2_title'), desc: t('welcome_step2_desc') },
    { icon: '🌐', title: t('welcome_step3_title'), desc: t('welcome_step3_desc') },
  ]

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-6"
      style={{ background: 'rgba(13,11,20,0.9)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#1c1830', border: '1px solid #4a4275' }}>
        {/* Header */}
        <div className="px-6 pt-8 pb-5 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: 'rgba(99,92,138,0.2)', border: '1px solid #4a4275' }}>
            🤖
          </div>
          <h1 className="text-2xl font-bold text-white">{t('welcome_title')}</h1>
          <p className="text-base mt-2 leading-relaxed" style={{ color: '#9591b4' }}>
            {t('welcome_subtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="px-6 pb-4 space-y-2.5">
          <p className="text-sm font-semibold mb-3" style={{ color: '#5a5680' }}>{t('welcome_steps_title')}</p>
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3.5 p-3.5 rounded-xl" style={{ background: '#13101e', border: '1px solid #2d2848' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(99,92,138,0.15)', border: '1px solid #3d3660' }}>
                {s.icon}
              </div>
              <div>
                <div className="font-semibold text-white text-sm">{s.title}</div>
                <div className="text-xs mt-0.5 leading-relaxed" style={{ color: '#9591b4' }}>{s.desc}</div>
              </div>
              <div className="ml-auto flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(99,92,138,0.2)', color: '#c4bfe8' }}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 pt-3 flex gap-3">
          <a
            href="/sdlc"
            onClick={dismiss}
            className="flex-1 py-3 rounded-xl text-center font-semibold text-white text-base transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7a72a8 0%, #4a4480 100%)' }}
          >
            {t('welcome_cta')}
          </a>
          <button
            onClick={dismiss}
            className="px-4 py-3 rounded-xl text-sm transition-colors hover:text-gray-300"
            style={{ background: '#13101e', border: '1px solid #2d2848', color: '#5a5680' }}
          >
            {t('welcome_browse')}
          </button>
        </div>
      </div>
    </div>
  )
}

function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isIDE = /^\/projects\/[^/]+/.test(pathname)
  const [collapsed, setCollapsed] = useState(false)

  if (isIDE) {
    return <>{children}</>
  }

  const sidebarW = collapsed ? '64px' : '220px'

  return (
    <>
      <WelcomeModal />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main
        className="min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarW, background: 'var(--bg-primary)' }}
      >
        {children}
      </main>
    </>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <title>CLAUDE GANG — Command Center</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <LanguageProvider>
          <LayoutShell>{children}</LayoutShell>
        </LanguageProvider>
      </body>
    </html>
  )
}
