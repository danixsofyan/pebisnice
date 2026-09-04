import { describe, expect, it } from 'vitest'
import crypto from 'crypto'
import { hmacHex, signPublic, signShop } from '@/lib/integrations/shopee/signing'

const KEY = 'test-partner-key'

describe('Shopee signing', () => {
  it('signs public calls as HMAC-SHA256(partner_id + path + timestamp)', () => {
    const expected = crypto
      .createHmac('sha256', KEY)
      .update('123/api/v2/shop/auth_partner1700000000')
      .digest('hex')
    expect(signPublic('123', KEY, '/api/v2/shop/auth_partner', 1700000000)).toBe(expected)
  })

  it('signs shop calls with access_token and shop_id appended', () => {
    const base = '123/api/v2/order/get_order_list1700000000tok999'
    expect(signShop('123', KEY, '/api/v2/order/get_order_list', 1700000000, 'tok', '999')).toBe(
      crypto.createHmac('sha256', KEY).update(base).digest('hex')
    )
  })

  it('is deterministic and hex', () => {
    const a = hmacHex(KEY, 'x')
    expect(a).toBe(hmacHex(KEY, 'x'))
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })
})
