import crypto from 'crypto'
import { logger } from '@/lib/logging/logger'

interface ShopeeClientOptions {
  partnerId: number
  partnerKey: string
  accessToken: string
  shopId: number
}

export function createShopeeClient(opts: ShopeeClientOptions) {
  const BASE = process.env.SHOPEE_API_BASE_URL!

  function sign(path: string, timestamp: number): string {
    const base = `${opts.partnerId}${path}${timestamp}${opts.accessToken}${opts.shopId}`
    return crypto.createHmac('sha256', opts.partnerKey).update(base).digest('hex')
  }

  async function get<T>(
    path: string,
    params: Record<string, string | number> = {},
    retries = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const ts = Math.floor(Date.now() / 1000)
      const url = new URL(`${BASE}${path}`)

      url.searchParams.set('partner_id', String(opts.partnerId))
      url.searchParams.set('timestamp', String(ts))
      url.searchParams.set('access_token', opts.accessToken)
      url.searchParams.set('shop_id', String(opts.shopId))
      url.searchParams.set('sign', sign(path, ts))
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

      try {
        const res = await fetch(url.toString(), {
          signal: AbortSignal.timeout(30_000),
        })

        if (res.status === 429) {
          const waitMs = Math.min(1000 * Math.pow(2, attempt), 30000)
          logger.warn({ path, attempt, waitMs }, 'Shopee rate limit, retrying')
          await new Promise((r) => setTimeout(r, waitMs))
          continue
        }

        if (!res.ok) throw new Error(`Shopee HTTP error: ${res.status}`)

        const data = (await res.json()) as { error?: string; message?: string; response: T }
        if (data.error) throw new Error(`Shopee API error: ${data.message}`)

        return data.response
      } catch (error) {
        if (attempt === retries) throw error
        logger.warn({ path, attempt, error: String(error) }, 'Shopee API retry')
        await new Promise((r) => setTimeout(r, 1000 * attempt))
      }
    }

    throw new Error('Shopee API: max retries exceeded')
  }

  return { get }
}
