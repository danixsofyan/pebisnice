import crypto from 'crypto'
import { logger } from '@/lib/logging/logger'

/**
 * Memeriksa header Authorization sebuah permintaan cron.
 *
 * Dibuat bersama agar setiap endpoint cron memakai pemeriksaan yang persis
 * sama. Kedua sisi di-hash lebih dulu sebelum dibandingkan: `timingSafeEqual`
 * melempar bila panjang buffer berbeda, dan hashing juga menghindari kebocoran
 * panjang secret lewat waktu perbandingan.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    logger.error('CRON_SECRET belum diisi, menolak permintaan cron')
    return false
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false

  const received = crypto.createHash('sha256').update(authHeader).digest()
  const expected = crypto.createHash('sha256').update(`Bearer ${secret}`).digest()

  return crypto.timingSafeEqual(received, expected)
}
