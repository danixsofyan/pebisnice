import type { planIntervalEnum } from '@/lib/db/schema/enums'

export type PlanInterval = (typeof planIntervalEnum.enumValues)[number]
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'expired' | 'canceled'

// Add months, clamping to month end (Jan 31 + 1 = Feb 28/29); JS Date otherwise overflows.
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime())
  const targetMonth = result.getUTCMonth() + months
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(targetMonth)
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

export interface Period {
  start: Date
  end: Date
}

export function trialPeriod(now: Date, trialDays: number): Period {
  return { start: now, end: addDays(now, trialDays) }
}

// An active renewal extends from the current end so remaining days are not lost.
export function paidPeriod(now: Date, interval: PlanInterval, currentEnd: Date | null): Period {
  const start = currentEnd && currentEnd > now ? currentEnd : now
  const end = interval === 'yearly' ? addMonths(start, 12) : addMonths(start, 1)
  return { start: now, end }
}

export type AccessState = 'active' | 'expired' | 'none'

export function accessState(
  subscription: { status: SubscriptionStatus; currentPeriodEnd: Date } | null,
  now: Date
): AccessState {
  if (!subscription) return 'none'
  if (subscription.status === 'canceled') return 'expired'
  if (subscription.currentPeriodEnd <= now) return 'expired'
  if (subscription.status === 'trialing' || subscription.status === 'active') return 'active'
  return 'expired'
}

export function daysLeft(periodEnd: Date, now: Date): number {
  return Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
}
