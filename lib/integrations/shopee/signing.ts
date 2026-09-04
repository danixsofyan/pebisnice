import crypto from 'crypto'

// Shopee Open Platform v2 signing. Every call is signed with
// HMAC-SHA256(partner_key, base_string). Public calls (auth, token) sign
// partner_id + path + timestamp; shop calls also append access_token + shop_id.
export function hmacHex(partnerKey: string, baseString: string): string {
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex')
}

export function signPublic(
  partnerId: string,
  partnerKey: string,
  apiPath: string,
  timestamp: number
): string {
  return hmacHex(partnerKey, `${partnerId}${apiPath}${timestamp}`)
}

export function signShop(
  partnerId: string,
  partnerKey: string,
  apiPath: string,
  timestamp: number,
  accessToken: string,
  shopId: string
): string {
  return hmacHex(partnerKey, `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`)
}
