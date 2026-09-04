import crypto from 'crypto'

/**
 * Memverifikasi tanda tangan notifikasi Midtrans.
 *
 * Midtrans menandatangani dengan sha512(order_id + status_code + gross_amount +
 * ServerKey). Notifikasi webhook tidak tepercaya sampai tanda tangannya cocok —
 * tanpa ini siapa pun bisa memalsukan "sudah bayar". Perbandingan dibuat
 * konstan-waktu.
 */
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
