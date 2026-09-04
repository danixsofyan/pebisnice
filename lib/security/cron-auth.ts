import crypto from 'crypto'
import { logger } from '@/lib/logging/logger'

// Check a cron request's Authorization header. Shared so every cron endpoint uses the exact same check; both sides are hashed before comparison, since timingSafeEqual throws on length mismatch and hashing also avoids leaking secret length via comparison time.
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
