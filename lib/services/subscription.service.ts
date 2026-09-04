import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { plans, subscriptions } from '@/lib/db/schema'
import { paidPeriod, trialPeriod, type PlanInterval } from '@/lib/domain/billing/period'
import { ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

export type PlanRow = typeof plans.$inferSelect
export type SubscriptionRow = typeof subscriptions.$inferSelect

export interface SubscriptionWithPlan {
  subscription: SubscriptionRow
  plan: PlanRow
}

export class SubscriptionService {
  /** Plans a customer can choose, ordered. */
  async listActivePlans(): Promise<PlanRow[]> {
    return db
      .select()
      .from(plans)
      .where(and(eq(plans.isActive, true), isNull(plans.deletedAt)))
      .orderBy(asc(plans.sortOrder))
  }

  async getPlan(planId: string): Promise<PlanRow | null> {
    const rows = await db
      .select()
      .from(plans)
      .where(and(eq(plans.id, planId), isNull(plans.deletedAt)))
      .limit(1)
    return rows[0] ?? null
  }

  /** The user's subscription with its plan, or null if never subscribed. */
  async getForUser(userId: string): Promise<SubscriptionWithPlan | null> {
    const rows = await db
      .select({ subscription: subscriptions, plan: plans })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(eq(subscriptions.userId, userId), isNull(subscriptions.deletedAt)))
      .limit(1)
    return rows[0] ?? null
  }

  // Start a trial. Rejects if the user already has a subscription; trial is for genuinely new users, checked server-side so the client can't bypass it.
  async startTrial(userId: string, now: Date = new Date()): Promise<SubscriptionWithPlan> {
    const existing = await this.getForUser(userId)
    if (existing) {
      throw new ValidationError('Anda sudah memiliki langganan')
    }

    const trialPlans = await db
      .select()
      .from(plans)
      .where(and(eq(plans.interval, 'trial'), eq(plans.isActive, true), isNull(plans.deletedAt)))
      .orderBy(asc(plans.sortOrder))
      .limit(1)

    const plan = trialPlans[0]
    if (!plan || !plan.trialDays) {
      throw new ValidationError('Paket trial belum tersedia')
    }

    const period = trialPeriod(now, plan.trialDays)
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        planId: plan.id,
        status: 'trialing',
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      })
      .returning()

    logger.info({ userId, planId: plan.id, until: period.end }, 'trial started')
    return { subscription: subscription!, plan }
  }

  // Activate a paid plan after payment settles. Called by the Midtrans webhook. Idempotent at the subscription level: updates the existing row or creates one, extending from the current end while still active.
  async activatePaidPlan(
    userId: string,
    planId: string,
    now: Date = new Date()
  ): Promise<SubscriptionWithPlan> {
    const plan = await this.getPlan(planId)
    if (!plan) throw new ValidationError('Paket tidak ditemukan')
    if (plan.interval === 'trial') throw new ValidationError('Paket trial tidak bisa diaktifkan')

    const existing = await this.getForUser(userId)
    const currentEnd =
      existing && existing.subscription.status !== 'expired'
        ? existing.subscription.currentPeriodEnd
        : null
    const period = paidPeriod(now, plan.interval as PlanInterval, currentEnd)

    if (existing) {
      const [updated] = await db
        .update(subscriptions)
        .set({
          planId: plan.id,
          status: 'active',
          currentPeriodStart: period.start,
          currentPeriodEnd: period.end,
          canceledAt: null,
        })
        .where(eq(subscriptions.id, existing.subscription.id))
        .returning()
      logger.info({ userId, planId: plan.id, until: period.end }, 'subscription renewed')
      return { subscription: updated!, plan }
    }

    const [created] = await db
      .insert(subscriptions)
      .values({
        userId,
        planId: plan.id,
        status: 'active',
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      })
      .returning()
    logger.info({ userId, planId: plan.id, until: period.end }, 'subscription activated')
    return { subscription: created!, plan }
  }
}

export const subscriptionService = new SubscriptionService()
