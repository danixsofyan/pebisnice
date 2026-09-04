import { headers } from 'next/headers'
import { REQUEST_ID_HEADER, type RequestContext } from './request-context'

/**
 * Membaca konteks request dari header yang disisipkan `proxy.ts`.
 *
 * Server Component dan Server Action tidak berbagi AsyncLocalStorage dengan
 * middleware, jadi id korelasinya dititipkan lewat header request. Ini cara
 * yang sama dipakai untuk nonce CSP.
 */
export async function readRequestContext(): Promise<RequestContext> {
  const headerList = await headers()

  return {
    requestId: headerList.get(REQUEST_ID_HEADER) ?? 'unknown',
    method: headerList.get('x-invoke-method') ?? 'GET',
    path: headerList.get('x-pathname') ?? 'unknown',
  }
}

/** Metadata request untuk audit log — IP dan user agent. */
export async function readRequestMeta(): Promise<{
  requestId: string
  ip: string
  userAgent: string
}> {
  const headerList = await headers()

  return {
    requestId: headerList.get(REQUEST_ID_HEADER) ?? 'unknown',
    ip: headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
    userAgent: headerList.get('user-agent') ?? 'unknown',
  }
}
