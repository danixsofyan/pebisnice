import { AsyncLocalStorage } from 'node:async_hooks'

// Per-request context that follows the whole call chain, so every log line from one request can be correlated without threading requestId through every function. Without it, a production error log is just a stack trace with no link to which request, user, or tenant.
export interface RequestContext {
  /** From the x-request-id header; created by the proxy if absent. */
  requestId: string
  method: string
  path: string
  /** Filled once the session is known. */
  userId?: string
  projectId?: string
}

const storage = new AsyncLocalStorage<RequestContext>()

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn)
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore()
}

// Enrich the running context; called once the session is known, so later logs carry the user and tenant identity.
export function enrichRequestContext(fields: Partial<RequestContext>): void {
  const current = storage.getStore()
  if (!current) return

  Object.assign(current, fields)
}

export const REQUEST_ID_HEADER = 'x-request-id'
