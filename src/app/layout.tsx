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
  const { lang, t, toggle } = useLanguage()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats')
        const data = await res.json()
        setWorkingAgents(data.workingAgents ?? 0)
      } catch {}
    }
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
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
          <div
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded text-xl"
            style={{ background: '#0f1420', border: '1px solid #1a2535' }}
          >
            👾
          </div>
          {!collapsed && (
            <div>
              <div className="font-orbitron text-xs font-bold leading-tight">
                <span className="text-white">CLAUDE </span>
                <span style={{ color: '#00e5ff' }}>GANK</span>
              </div>
              <div className="font-orbitron text-gray-600" style={{ fontSize: '8px', letterSpacing: '0.12em' }}>
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

        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              background: '#22c55e',
              boxShadow: '0 0 6px #22c55e',
            }}
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
        <title>CLAUDE GANK — Command Center</title>
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
