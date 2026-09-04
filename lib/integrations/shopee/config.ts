interface ShopeeConfig {
  partnerId: string
  partnerKey: string
  baseUrl: string
}

let cached: ShopeeConfig | null = null

// Read lazily so a missing env fails only the Shopee flow, not the whole build.
export function shopeeConfig(): ShopeeConfig {
  if (cached) return cached
  const partnerId = process.env.SHOPEE_PARTNER_ID
  const partnerKey = process.env.SHOPEE_PARTNER_KEY
  if (!partnerId || !partnerKey) {
    throw new Error(
      'Shopee belum dikonfigurasi: SHOPEE_PARTNER_ID / SHOPEE_PARTNER_KEY belum diisi'
    )
  }
  cached = {
    partnerId,
    partnerKey,
    baseUrl: (process.env.SHOPEE_API_BASE_URL || 'https://partner.shopeemobile.com').replace(
      /\/+$/,
      ''
    ),
  }
  return cached
}

export function __resetShopeeConfigForTests(): void {
  cached = null
}
