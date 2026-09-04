import { headers } from 'next/headers'

// Absolute origin of the current request (e.g. https://app.example.id). Read from proxy-forwarded headers, not env, so Midtrans callbacks are automatically correct in production and previews.
export async function getRequestOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}
