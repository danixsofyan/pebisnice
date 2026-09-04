import crypto from 'crypto'

// Verify a Midtrans notification signature. Midtrans signs with sha512(order_id + status_code + gross_amount + ServerKey); a webhook isn't trusted until it matches, else anyone could fake a paid status. Comparison is constant-time.
export function verifyMidtransSignature(input: {
  orderId: string
  statusCode: string
  grossAmount: string
  serverKey: string
  signatureKey: string
}): boolean {
  const expected = crypto
    .createHash('sha512')
    .update(input.orderId + input.statusCode + input.grossAmount + input.serverKey)
    .digest('hex')

  const a = Buffer.from(expected)
  const b = Buffer.from(input.signatureKey)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
