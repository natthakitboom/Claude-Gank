'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/agents'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#13101e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          background: '#1c1830',
          border: '1px solid #2d2848',
          borderRadius: 20,
          padding: '48px 40px',
          width: 360,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#13101e',
              border: '1px solid #4a4275',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#9b93c8" />
                  <stop offset="100%" stopColor="#635C8A" />
                </linearGradient>
              </defs>
              <polygon
                points="14,5 21,9 21,17 14,21 7,17 7,9"
                fill="url(#lg)"
                fillOpacity="0.15"
                stroke="#9b93c8"
                strokeWidth="0.6"
                strokeOpacity="0.6"
              />
              <text x="9" y="17" fill="#c4bfe8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                CG
              </text>
            </svg>
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-orbitron, monospace)',
                fontSize: 18,
                fontWeight: 700,
                color: '#ede9f8',
                textAlign: 'center',
              }}
            >
              CLAUDE GANG
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#5a5680',
                textAlign: 'center',
                marginTop: 2,
              }}
            >
              Command Center
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '100%', height: 1, background: '#2d2848' }} />

        {/* Sign in */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#9b93c8', textAlign: 'center' }}>
            เข้าสู่ระบบด้วย Microsoft Account
          </div>
          <button
            onClick={() => signIn('azure-ad', { callbackUrl })}
            style={{
              width: '100%',
              background: '#0078D4',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {/* Microsoft logo */}
            <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            Sign in with Microsoft
          </button>
        </div>

        {/* Footer note */}
        <div style={{ fontSize: 10, color: '#374151', textAlign: 'center', lineHeight: 1.6 }}>
          ระบบนี้ใช้ Microsoft SSO<br />
          เฉพาะบัญชีที่ได้รับอนุญาตเท่านั้น
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
