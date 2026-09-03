import type { NextResponse } from 'next/server'

export function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64')
}

export function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  const storageHost = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_HOST
    ? ` https://${process.env.NEXT_PUBLIC_SUPABASE_STORAGE_HOST}`
    : ''

  const directives = [
    `default-src 'self'`,

    // 'strict-dynamic' lets the nonced Next.js bootstrap load its own chunks and
    // next/script tags; browsers that honour it ignore host allowlists, so no CDN
    // origin is listed here on purpose.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,

    // next/font meng-host font sendiri saat build, jadi tidak perlu
    // mengizinkan origin Google Fonts.
    `style-src 'self' 'unsafe-inline'`,
    `font-src 'self'`,

    `img-src 'self' data: blob: https://lh3.googleusercontent.com${storageHost}`,

    `connect-src 'self'${isDev ? ' ws://localhost:*' : ''}`,

    `frame-src 'none'`,
    `frame-ancestors 'none'`,

    `object-src 'none'`,

    `base-uri 'self'`,

    `form-action 'self'`,

    ...(isDev ? [] : [`upgrade-insecure-requests`]),
  ]

  return directives.join('; ')
}

export function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
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
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  response.headers.delete('X-Powered-By')
  response.headers.delete('Server')

  return response
}
