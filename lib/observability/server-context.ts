import { headers } from 'next/headers'
import { REQUEST_ID_HEADER, type RequestContext } from './request-context'

// Read request context from headers injected by proxy.ts. Server Components and Actions don't share AsyncLocalStorage with middleware, so the correlation id is passed via request headers, the same way as the CSP nonce.
export async function readRequestContext(): Promise<RequestContext> {
  const headerList = await headers()

  return {
    requestId: headerList.get(REQUEST_ID_HEADER) ?? 'unknown',
    method: headerList.get('x-invoke-method') ?? 'GET',
    path: headerList.get('x-pathname') ?? 'unknown',
  }
}

/** Request metadata for audit logs: IP and user agent. */
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
