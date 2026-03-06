import type { NextResponse } from 'next/server'

export function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64')
}

export function buildCsp(): string {
  const isDev = process.env.NODE_ENV === 'development'

  const directives = [
    `default-src 'self'`,

    `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net ${isDev ? "'unsafe-eval'" : ''}`,

    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,

    `img-src 'self' data: blob: https://lh3.googleusercontent.com https://hoirqrkdgbmvpwutwuwj.supabase.co`,

    `connect-src 'self' https://api.shopee.io https://open-api.tiktokglobalshop.com https://storage.googleapis.com ${isDev ? 'ws://localhost:3000' : ''}`,

    `frame-src 'none'`,
    `frame-ancestors 'none'`,

    `object-src 'none'`,

    `base-uri 'self'`,

    `form-action 'self'`,

    ...(isDev ? [] : [`upgrade-insecure-requests`]),
  ]

  return directives.join('; ')
}

export function applySecurityHeaders(response: NextResponse): NextResponse {
  const csp = buildCsp()

  response.headers.set('Content-Security-Policy', csp)

  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  response.headers.set('X-Content-Type-Options', 'nosniff')

  response.headers.set('X-Frame-Options', 'DENY')

  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()'
  )

  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin')

  response.headers.delete('X-Powered-By')
  response.headers.delete('Server')

  return response
}
