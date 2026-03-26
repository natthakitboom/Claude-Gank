'use client'

import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Users, Crosshair, Radio, Flag, Cpu, ChevronLeft, CalendarClock, FolderOpen, MessageCircle, BarChart2, GitBranch } from 'lucide-react'
import { LanguageProvider, useLanguage } from '@/lib/i18n'

const NAV_KEYS = [
  { href: '/agents',   key: 'nav_agents',   Icon: Users },
  { href: '/warroom',  key: 'nav_warroom',  Icon: Crosshair },
  { href: '/usage',  key: 'nav_usage',  Icon: BarChart2 },
  { href: '/comms',    key: 'nav_comms',    Icon: Radio },
  { href: '/chat',     key: 'nav_chat',     Icon: MessageCircle },
  { href: '/missions', key: 'nav_missions', Icon: Flag },
  { href: '/projects', key: 'nav_projects', Icon: FolderOpen },
  { href: '/sdlc',     key: 'nav_sdlc',     Icon: GitBranch },
  { href: '/schedule', key: 'nav_schedule', Icon: CalendarClock },
  { href: '/system',   key: 'nav_system',   Icon: Cpu },
] as const

function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [workingAgents, setWorkingAgents] = useState(0)
  const [runningMissions, setRunningMissions] = useState(0)
  const [stuckMissions, setStuckMissions] = useState(0)
  const { lang, t, toggle } = useLanguage()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats')
        const data = await res.json()
        setWorkingAgents(data.workingAgents ?? 0)
        setRunningMissions(data.runningMissions ?? 0)
        setStuckMissions(data.stuckMissions ?? 0)
      } catch {}
    }
    fetchStats()
    const interval = setInterval(fetchStats, 8000)
    return () => clearInterval(interval)
  }, [])

  const w = collapsed ? '64px' : '176px'

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-50 transition-all duration-300"
      style={{
        width: w,
        background: '#080a0f',
        borderRight: '1px solid #111820',
      }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: '#111820' }}>
        <div className="flex items-center gap-3">
          {/* CG Logo */}
          <div className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center" style={{ background: '#0a0e18', border: '1px solid #1a2535' }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <defs>
                <filter id="cglow">
                  <feGaussianBlur stdDeviation="1.2" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <linearGradient id="cgrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#00e5ff"/>
                  <stop offset="100%" stopColor="#0077ff"/>
                </linearGradient>
              </defs>
              {/* Outer hexagon */}
              <polygon
                points="14,2 24,7.5 24,18.5 14,24 4,18.5 4,7.5"
                fill="none" stroke="#00e5ff" strokeWidth="0.8" strokeOpacity="0.25"
              />
              {/* Inner hex filled */}
              <polygon
                points="14,5 21,9 21,17 14,21 7,17 7,9"
                fill="url(#cgrad)" fillOpacity="0.07"
                stroke="#00e5ff" strokeWidth="0.6" strokeOpacity="0.5"
              />
              {/* CG text */}
              <text x="9" y="17" fill="#00e5ff" fontSize="8" fontFamily="monospace" fontWeight="bold" filter="url(#cglow)">CG</text>
              {/* slash accent */}
              <line x1="13.5" y1="8" x2="11" y2="20" stroke="#00e5ff" strokeWidth="0.6" strokeOpacity="0.3"/>
            </svg>
          </div>
          {!collapsed && (
            <div>
              <div className="font-orbitron font-bold leading-tight">
                <div style={{ fontSize: '9px', letterSpacing: '0.06em', color: '#64748b' }}>CLAUDE</div>
                <div style={{ fontSize: '13px', letterSpacing: '0.1em', color: '#00e5ff' }}>GANG</div>
              </div>
              <div className="font-orbitron text-gray-600" style={{ fontSize: '7px', letterSpacing: '0.12em', marginTop: '1px' }}>
                {t('cmd_center')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4">
        {NAV_KEYS.map(({ href, key, Icon }) => {
          const isActive = pathname === href || (href === '/agents' && pathname === '/')
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
              title={collapsed ? t(key) : undefined}
            >
              <Icon size={15} className="nav-icon flex-shrink-0" />
              {!collapsed && <span>{t(key)}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: '#111820' }}>

        {/* Language Toggle */}
        <button
          onClick={toggle}
          className="flex items-center justify-center w-full rounded transition-colors"
          style={{
            background: '#0d1117',
            border: '1px solid #1a2535',
            padding: collapsed ? '4px' : '4px 8px',
          }}
          title="Toggle Language / เปลี่ยนภาษา"
        >
          {collapsed ? (
            <span className="font-orbitron font-bold" style={{ fontSize: '9px', color: '#00e5ff', letterSpacing: '0.05em' }}>
              {lang}
            </span>
          ) : (
            <div className="flex items-center gap-1 w-full">
              <span
                className="font-orbitron font-bold px-1.5 py-0.5 rounded flex-1 text-center transition-colors"
                style={{
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  background: lang === 'EN' ? '#00e5ff20' : 'transparent',
                  color: lang === 'EN' ? '#00e5ff' : '#374151',
                  border: lang === 'EN' ? '1px solid #00e5ff40' : '1px solid transparent',
                }}
              >
                EN
              </span>
              <span style={{ color: '#1f2937', fontSize: '9px' }}>/</span>
              <span
                className="font-orbitron font-bold px-1.5 py-0.5 rounded flex-1 text-center transition-colors"
                style={{
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  background: lang === 'TH' ? '#00e5ff20' : 'transparent',
                  color: lang === 'TH' ? '#00e5ff' : '#374151',
                  border: lang === 'TH' ? '1px solid #00e5ff40' : '1px solid transparent',
                }}
              >
                TH
              </span>
            </div>
          )}
        </button>

        {/* Mission health indicator */}
        {!collapsed && (
          <div
            className="rounded-lg px-3 py-2 flex items-center gap-2"
            style={{
              background: stuckMissions > 0 ? 'rgba(239,68,68,0.07)' : runningMissions > 0 ? 'rgba(251,191,36,0.07)' : 'rgba(34,197,94,0.07)',
              border: `1px solid ${stuckMissions > 0 ? 'rgba(239,68,68,0.2)' : runningMissions > 0 ? 'rgba(251,191,36,0.2)' : 'rgba(34,197,94,0.2)'}`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: stuckMissions > 0 ? '#ef4444' : runningMissions > 0 ? '#fbbf24' : '#22c55e',
                boxShadow: `0 0 5px ${stuckMissions > 0 ? '#ef4444' : runningMissions > 0 ? '#fbbf24' : '#22c55e'}`,
                animation: runningMissions > 0 ? 'pulse 2s infinite' : undefined,
              }}
            />
            <div>
              <div className="font-orbitron" style={{ fontSize: '8px', letterSpacing: '0.05em', color: stuckMissions > 0 ? '#ef4444' : runningMissions > 0 ? '#fbbf24' : '#22c55e' }}>
                {stuckMissions > 0 ? `⚠ ${stuckMissions} ค้าง!` : runningMissions > 0 ? `⚡ ${runningMissions} กำลังทำงาน` : '✓ ไม่มีค้าง'}
              </div>
              <div className="font-orbitron" style={{ fontSize: '7px', color: '#374151', marginTop: '1px' }}>
                {stuckMissions > 0 ? 'มี mission ค้างเกิน 30 นาที' : runningMissions > 0 ? 'agents กำลัง active' : 'agents พร้อมทำงาน'}
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <span
              className="w-2.5 h-2.5 rounded-full"
              title={stuckMissions > 0 ? `${stuckMissions} ค้าง!` : runningMissions > 0 ? `${runningMissions} running` : 'ไม่มีค้าง'}
              style={{
                background: stuckMissions > 0 ? '#ef4444' : runningMissions > 0 ? '#fbbf24' : '#22c55e',
                boxShadow: `0 0 6px ${stuckMissions > 0 ? '#ef4444' : runningMissions > 0 ? '#fbbf24' : '#22c55e'}`,
              }}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}
          />
          {!collapsed && (
            <span className="font-orbitron text-gray-500" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>
              SYSTEM v1.0.0
            </span>
          )}
        </div>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-400 transition-colors w-full"
          style={{ fontSize: '10px' }}
        >
          <ChevronLeft
            size={14}
            className="transition-transform duration-300"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
          {!collapsed && (
            <span className="font-orbitron" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>
              {t('collapse')}
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}

function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isIDE = /^\/projects\/[^/]+/.test(pathname)

  if (isIDE) {
    return <>{children}</>
  }

  return (
    <>
      <Sidebar />
      <main
        className="min-h-screen transition-all duration-300"
        style={{ marginLeft: '176px', background: 'var(--bg-primary)' }}
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
