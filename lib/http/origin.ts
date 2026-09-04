import { headers } from 'next/headers'

/**
 * Origin absolut permintaan saat ini (mis. https://app.contoh.id).
 *
 * Dibaca dari header yang diteruskan proxy, bukan dari env, supaya callback
 * Midtrans otomatis benar di produksi maupun preview tanpa konfigurasi tambahan.
 */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}
