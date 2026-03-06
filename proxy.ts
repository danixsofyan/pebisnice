import { NextResponse, type NextRequest } from 'next/server'
import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { applySecurityHeaders } from '@/lib/security/headers'
import { checkRateLimit } from '@/lib/security/rate-limiter'

const { auth } = NextAuth(authConfig)

const PROTECTED_ROUTES = ['/dashboard', '/projects', '/settings', '/inventory', '/transactions', '/reports', '/employees']
const AUTH_ROUTES = ['/login']
const PUBLIC_API_ROUTES = ['/api/v1/webhooks', '/api/health']

export async function proxy(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'

  const path = request.nextUrl.pathname
  const isNextData = path.includes('/_next/data/') || request.headers.has('x-nextjs-data')

  const isApiRoute = path.startsWith('/api/')
  const rateLimitKey = isApiRoute ? `api:${ip}` : `web:${ip}`
  const rateLimitWindow = isApiRoute ? 60 : 120
  const rateLimitMax = isApiRoute ? 100 : 300

  const { allowed, remaining, resetAt } = isNextData 
    ? { allowed: true, remaining: 100, resetAt: 0 }
    : await checkRateLimit(
        rateLimitKey,
        rateLimitMax,
        rateLimitWindow
      )

  if (!allowed) {
    const response = NextResponse.json(
      { error: 'Too Many Requests', retryAfter: resetAt },
      { status: 429 }
    )
    response.headers.set('Retry-After', String(resetAt))
    response.headers.set('X-RateLimit-Limit', String(rateLimitMax))
    response.headers.set('X-RateLimit-Remaining', '0')
    return applySecurityHeaders(response)
  }

  const isPublicApi = PUBLIC_API_ROUTES.some((r) => path.startsWith(r))
  if (isPublicApi) {
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    return applySecurityHeaders(response)
  }

  const session = await auth()
  const user = session?.user

  const isProtected = PROTECTED_ROUTES.some((r) => path.startsWith(r))
  const isAuthRoute = AUTH_ROUTES.some((r) => path.startsWith(r))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', encodeURIComponent(path))
    const redirect = NextResponse.redirect(url)
    return applySecurityHeaders(redirect)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const redirect = NextResponse.redirect(url)
    return applySecurityHeaders(redirect)
  }

  if (path === '/') {
    const url = request.nextUrl.clone()
    url.pathname = user ? '/dashboard' : '/login'
    const redirect = NextResponse.redirect(url)
    return applySecurityHeaders(redirect)
  }

  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Remaining', String(remaining))
  return applySecurityHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
