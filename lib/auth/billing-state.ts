import { subscriptionService, type SubscriptionWithPlan } from '@/lib/services/subscription.service'
import { accessState, daysLeft, type AccessState } from '@/lib/domain/billing/period'

export interface BillingState {
  access: AccessState
  current: SubscriptionWithPlan | null
  /** Days left in the current period; 0 if none or expired. */
  daysLeft: number
}

// An account's subscription state for gating. Never throws; the page decides where to redirect, like resolveSessionState.
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
