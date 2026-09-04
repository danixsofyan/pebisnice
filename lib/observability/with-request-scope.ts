import { logger } from '@/lib/logging/logger'
import { enrichRequestContext, runWithRequestContext } from './request-context'
import { readRequestContext } from './server-context'

/**
 * Menjalankan sebuah server action di dalam konteks request.
 *
 * Middleware dan Server Action berjalan di runtime yang berbeda, sehingga
 * AsyncLocalStorage milik `proxy.ts` tidak sampai ke sini. Pembungkus ini
 * membangun ulang konteksnya dari header `x-request-id` yang dititipkan
 * proxy, supaya seluruh log dan error di dalam action membawa id korelasi
 * yang sama dengan permintaan HTTP-nya.
 */
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
      // Dicatat di sini agar durasi dan nama action ikut terekam; error-nya
      // tetap dilempar supaya `handleActionError` yang memutuskan responsnya.
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

/** Melengkapi konteks setelah sesi diketahui, agar log berikutnya membawanya. */
export function tagRequestActor(userId: string, projectId?: string): void {
  enrichRequestContext(projectId ? { userId, projectId } : { userId })
}
