import { LRUCache } from 'lru-cache'

interface RateLimitState {
  count: number
  resetAt: number
}

const cache = new LRUCache<string, RateLimitState>({
  max: 10000,
  ttl: 60 * 1000,
})

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  const current = cache.get(key)

  if (!current || now > current.resetAt) {
    const newState: RateLimitState = {
      count: 1,
      resetAt: now + windowMs,
    }
    cache.set(key, newState, { ttl: windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetAt: newState.resetAt }
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt }
  }

  current.count++
  cache.set(key, current, { ttl: current.resetAt - now })
  return { allowed: true, remaining: maxRequests - current.count, resetAt: current.resetAt }
}

export const RATE_LIMITS = {
  AUTH_LOGIN: { max: 5, windowSec: 300 },
  API_GENERAL: { max: 100, windowSec: 60 },
  API_UPLOAD: { max: 10, windowSec: 300 },
  API_EXPORT: { max: 20, windowSec: 60 },
  API_SYNC: { max: 5, windowSec: 300 },
  API_INVITE: { max: 10, windowSec: 3600 },
} as const
