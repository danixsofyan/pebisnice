import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Konteks per-request yang mengikuti seluruh rantai pemanggilan.
 *
 * Dipakai supaya setiap baris log dari satu request bisa dikorelasikan tanpa
 * mengoper `requestId` sebagai parameter ke setiap fungsi. Tanpa ini, log
 * error di produksi hanya berupa stack trace tanpa cara menghubungkannya ke
 * permintaan yang mana, pengguna yang mana, atau tenant yang mana.
 */
export interface RequestContext {
  /** Diambil dari header `x-request-id`; dibuat proxy bila belum ada. */
  requestId: string
  method: string
  path: string
  /** Terisi setelah sesi diketahui. */
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

/**
 * Melengkapi konteks yang sedang berjalan. Dipanggil setelah sesi diketahui,
 * sehingga log berikutnya membawa identitas pengguna dan tenant.
 */
export function enrichRequestContext(fields: Partial<RequestContext>): void {
  const current = storage.getStore()
  if (!current) return

  Object.assign(current, fields)
}

export const REQUEST_ID_HEADER = 'x-request-id'
