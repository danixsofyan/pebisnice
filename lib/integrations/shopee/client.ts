import { shopeeConfig } from './config'
import { signPublic, signShop } from './signing'
import type { ShopeeOrder } from './order-mapper'

const nowUnix = () => Math.floor(Date.now() / 1000)

export interface ShopeeTokens {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
}

function publicUrl(path: string, timestamp: number): string {
  const { partnerId, partnerKey, baseUrl } = shopeeConfig()
  const sign = signPublic(partnerId, partnerKey, path, timestamp)
  const params = new URLSearchParams({ partner_id: partnerId, timestamp: String(timestamp), sign })
  return `${baseUrl}${path}?${params.toString()}`
}

function shopUrl(
  path: string,
  accessToken: string,
  shopId: string,
  timestamp: number
): URLSearchParams {
  const { partnerId, partnerKey } = shopeeConfig()
  const sign = signShop(partnerId, partnerKey, path, timestamp, accessToken, shopId)
  return new URLSearchParams({
    partner_id: partnerId,
    timestamp: String(timestamp),
    access_token: accessToken,
    shop_id: shopId,
    sign,
  })
}

async function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as Record<string, unknown>
  if (data.error) throw new Error(`Shopee: ${data.error} ${data.message ?? ''}`)
  return data
}

// Exchange the authorization code for tokens (called from the OAuth callback).
export async function getAccessToken(code: string, shopId: string): Promise<ShopeeTokens> {
  const { partnerId } = shopeeConfig()
  const timestamp = nowUnix()
  const data = await postJson(publicUrl('/api/v2/auth/token/get', timestamp), {
    code,
    shop_id: Number(shopId),
    partner_id: Number(partnerId),
  })
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token),
    expiresInSeconds: Number(data.expire_in ?? 0),
  }
}

export async function refreshAccessToken(
  refreshToken: string,
  shopId: string
): Promise<ShopeeTokens> {
  const { partnerId } = shopeeConfig()
  const timestamp = nowUnix()
  const data = await postJson(publicUrl('/api/v2/auth/access_token/get', timestamp), {
    refresh_token: refreshToken,
    shop_id: Number(shopId),
    partner_id: Number(partnerId),
  })
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token),
    expiresInSeconds: Number(data.expire_in ?? 0),
  }
}

async function shopGet(
  path: string,
  accessToken: string,
  shopId: string,
  extra: Record<string, string>
) {
  const { baseUrl } = shopeeConfig()
  const params = shopUrl(path, accessToken, shopId, nowUnix())
  for (const [k, v] of Object.entries(extra)) params.set(k, v)
  const res = await fetch(`${baseUrl}${path}?${params.toString()}`)
  const data = (await res.json()) as Record<string, unknown>
  if (data.error) throw new Error(`Shopee: ${data.error} ${data.message ?? ''}`)
  return (data.response ?? {}) as Record<string, unknown>
}

// Shopee caps get_order_list at a 15-day window, so callers pass a bounded range.
export async function fetchOrders(
  accessToken: string,
  shopId: string,
  timeFrom: number,
  timeTo: number
): Promise<ShopeeOrder[]> {
  const orderSns: string[] = []
  let cursor = ''
  let more = true
  while (more) {
    const list = await shopGet('/api/v2/order/get_order_list', accessToken, shopId, {
      time_range_field: 'create_time',
      time_from: String(timeFrom),
      time_to: String(timeTo),
      page_size: '50',
      cursor,
    })
    for (const o of (list.order_list as Array<{ order_sn: string }>) ?? [])
      orderSns.push(o.order_sn)
    more = Boolean(list.more)
    cursor = String(list.next_cursor ?? '')
    if (!cursor) more = false
  }

  const orders: ShopeeOrder[] = []
  for (let i = 0; i < orderSns.length; i += 50) {
    const batch = orderSns.slice(i, i + 50)
    const detail = await shopGet('/api/v2/order/get_order_detail', accessToken, shopId, {
      order_sn_list: batch.join(','),
      response_optional_fields: 'order_status,total_amount,create_time,currency',
    })
    for (const o of (detail.order_list as ShopeeOrder[]) ?? []) orders.push(o)
  }
  return orders
}
