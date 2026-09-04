import { subscriptionService, type SubscriptionWithPlan } from '@/lib/services/subscription.service'
import { accessState, daysLeft, type AccessState } from '@/lib/domain/billing/period'

export interface BillingState {
  access: AccessState
  current: SubscriptionWithPlan | null
  /** Sisa hari periode berjalan; 0 bila tak ada/kedaluwarsa. */
  daysLeft: number
}

/**
 * Keadaan langganan sebuah akun untuk keperluan gating. Tidak melempar — halaman
 * yang memutuskan ke mana mengarahkan, sama pola dengan `resolveSessionState`.
 */
export async function resolveBillingState(
  userId: string,
  now: Date = new Date()
): Promise<BillingState> {
  const current = await subscriptionService.getForUser(userId)
  const access = accessState(
    current
      ? {
          status: current.subscription.status,
          currentPeriodEnd: current.subscription.currentPeriodEnd,
        }
      : null,
    now
  )

  return {
    access,
    current,
    daysLeft: current ? daysLeft(current.subscription.currentPeriodEnd, now) : 0,
  }
}
