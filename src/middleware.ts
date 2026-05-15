import { getToken } from 'next-auth/jwt'
import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_PREFIXES = ['/login', '/api/auth', '/_next', '/favicon']

export async function middleware(req: NextRequest) {
  // Only enforce when explicitly enabled in env
  if (process.env.MS_SSO_ENABLED !== '1') return NextResponse.next()

  const path = req.nextUrl.pathname
  if (PUBLIC_PREFIXES.some(p => path.startsWith(p))) return NextResponse.next()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (token) return NextResponse.next()

  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.href)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
