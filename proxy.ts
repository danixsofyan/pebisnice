import { NextResponse, type NextRequest } from 'next/server'
import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { applySecurityHeaders, buildCsp, generateNonce } from '@/lib/security/headers'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { REQUEST_ID_HEADER } from '@/lib/observability/request-context'

const { auth } = NextAuth(authConfig)

const PROTECTED_ROUTES = [
  '/dashboard',
  '/projects',
  '/settings',
  '/audit',
  '/inventory',
  '/transactions',
  '/reports',
  '/employees',
  '/profile',
  '/pos',
  '/production',
  '/expenses',
  '/finance',
  '/customers',
  '/transfers',
  '/suppliers',
  '/purchases',
  '/onboarding',
  '/billing',
  '/admin',
  '/products',
  '/receipt',
]
const AUTH_ROUTES = ['/login']
const PUBLIC_API_ROUTES = ['/api/v1/webhooks', '/api/health']

// Correlation id for one request. Honors an existing x-request-id so a chain from a fronting proxy or load balancer isn't broken; creates a new one if absent.
function resolveRequestId(request: NextRequest): string {
  const incoming = request.headers.get(REQUEST_ID_HEADER)
  if (incoming && /^[\w-]{8,128}$/.test(incoming)) return incoming

  return crypto.randomUUID()
}

export async function proxy(request: NextRequest) {
  const requestId = resolveRequestId(request)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'

  // Next.js only stamps its bootstrap/next-script tags with the nonce when it
  // sees the CSP on the *request* headers, so build both from the same value.
  const nonce = generateNonce()
  const csp = buildCsp(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('content-security-policy', csp)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set(REQUEST_ID_HEADER, requestId)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  const forward = { request: { headers: requestHeaders } }

  const path = request.nextUrl.pathname
  const isNextData = path.includes('/_next/data/') || request.headers.has('x-nextjs-data')

  const isApiRoute = path.startsWith('/api/')
  const rateLimitKey = isApiRoute ? `api:${ip}` : `web:${ip}`
  const rateLimitWindow = isApiRoute ? 60 : 120
  const rateLimitMax = isApiRoute ? 100 : 300

  const { allowed, remaining, resetAt } = isNextData
    ? { allowed: true, remaining: 100, resetAt: 0 }
    : await checkRateLimit(rateLimitKey, rateLimitMax, rateLimitWindow)

  if (!allowed) {
    const response = NextResponse.json(
      { error: 'Too Many Requests', retryAfter: resetAt },
      { status: 429 }
    )
    response.headers.set('Retry-After', String(resetAt))
    response.headers.set('X-RateLimit-Limit', String(rateLimitMax))
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set(REQUEST_ID_HEADER, requestId)
    return applySecurityHeaders(response, csp)
  }

  const isPublicApi = PUBLIC_API_ROUTES.some((r) => path.startsWith(r))
  if (isPublicApi) {
    const response = NextResponse.next(forward)
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    response.headers.set(REQUEST_ID_HEADER, requestId)
    return applySecurityHeaders(response, csp)
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
    redirect.headers.set(REQUEST_ID_HEADER, requestId)
    return applySecurityHeaders(redirect, csp)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const redirect = NextResponse.redirect(url)
    redirect.headers.set(REQUEST_ID_HEADER, requestId)
    return applySecurityHeaders(redirect, csp)
  }

  if (path === '/') {
    const url = request.nextUrl.clone()
    url.pathname = user ? '/dashboard' : '/login'
    const redirect = NextResponse.redirect(url)
    redirect.headers.set(REQUEST_ID_HEADER, requestId)
    return applySecurityHeaders(redirect, csp)
  }

  const response = NextResponse.next(forward)
  response.headers.set('X-RateLimit-Remaining', String(remaining))
  response.headers.set(REQUEST_ID_HEADER, requestId)
  return applySecurityHeaders(response, csp)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
