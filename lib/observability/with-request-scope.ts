import { logger } from '@/lib/logging/logger'
import { enrichRequestContext, runWithRequestContext } from './request-context'
import { readRequestContext } from './server-context'

// Run a server action inside the request context. Middleware and Server Actions run in different runtimes, so proxy.ts's AsyncLocalStorage doesn't reach here; this rebuilds the context from the x-request-id header the proxy passes, so every log and error in the action carries the same correlation id as its HTTP request.
export async function withRequestScope<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const context = await readRequestContext()

  return runWithRequestContext(context, async () => {
    const startedAt = Date.now()
    logger.debug({ action: name }, 'action started')

    try {
      const result = await fn()
      logger.info({ action: name, durationMs: Date.now() - startedAt }, 'action completed')
      return result
    } catch (error) {
      // Logged here so duration and action name are captured; the error still throws so handleActionError decides the response.
      logger.warn(
        {
          action: name,
          durationMs: Date.now() - startedAt,
          err: error instanceof Error ? error.message : String(error),
        },
        'action threw'
      )
      throw error
    }
  })
}

/** Enrich the context once the session is known, so later logs carry it. */
export function tagRequestActor(userId: string, projectId?: string): void {
  enrichRequestContext(projectId ? { userId, projectId } : { userId })
}
