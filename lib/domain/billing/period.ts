import type { planIntervalEnum } from '@/lib/db/schema/enums'

export type PlanInterval = (typeof planIntervalEnum.enumValues)[number]
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'expired' | 'canceled'

/**
 * Menambah bulan dengan menjepit tanggal akhir bulan: 31 Jan + 1 bulan → 28/29
 * Feb, bukan meluber ke Maret. JavaScript Date meluber diam-diam, jadi ditangani
 * eksplisit di sini.
 */
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

/** Masa trial: mulai sekarang, berakhir sekian hari kemudian. */
export function trialPeriod(now: Date, trialDays: number): Period {
  return { start: now, end: addDays(now, trialDays) }
}

/**
 * Periode berbayar. Untuk perpanjangan yang masih aktif, mulai dihitung dari
 * akhir periode berjalan agar sisa hari tidak hangus; bila sudah kedaluwarsa,
 * dari sekarang.
 */
export function paidPeriod(now: Date, interval: PlanInterval, currentEnd: Date | null): Period {
  const start = currentEnd && currentEnd > now ? currentEnd : now
  const end = interval === 'yearly' ? addMonths(start, 12) : addMonths(start, 1)
  return { start: now, end }
}

/**
 * Keputusan akses tunggal yang dipakai gating. Memisahkan "boleh pakai app"
 * dari status mentah, supaya pemanggil tak perlu mengulang aturannya.
 */
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
