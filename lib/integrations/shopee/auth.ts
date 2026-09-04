import { shopeeConfig } from './config'
import { signPublic } from './signing'

const AUTH_PATH = '/api/v2/shop/auth_partner'

// Build the merchant authorization URL. The merchant opens it, approves, and
// Shopee redirects back to `redirectUrl` with `code` and `shop_id`.
export function buildAuthUrl(
  redirectUrl: string,
  now: () => number = () => Math.floor(Date.now() / 1000)
): string {
  const { partnerId, partnerKey, baseUrl } = shopeeConfig()
  const timestamp = now()
  const sign = signPublic(partnerId, partnerKey, AUTH_PATH, timestamp)
  const params = new URLSearchParams({
    partner_id: partnerId,
    timestamp: String(timestamp),
    sign,
    redirect: redirectUrl,
  })
  return `${baseUrl}${AUTH_PATH}?${params.toString()}`
}
