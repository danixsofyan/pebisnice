import { and, asc, eq, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { plans, subscriptions, users } from '@/lib/db/schema'
import { paidPeriod, trialPeriod, type PlanInterval } from '@/lib/domain/billing/period'
import { sendEmail } from '@/lib/email/mailer'
import { subscriptionExpiringEmail } from '@/lib/email/templates'
import { ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

const DAY_MS = 24 * 60 * 60 * 1000

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

  // Email owners whose subscription ends within `withinDays`. Sends at most once per billing
  // period: renewal_reminder_sent_at is stamped on success and compared against the period start,
  // so re-running the daily cron won't spam. Per-row failures are logged and don't stop the batch.
  async sendRenewalReminders(
    withinDays = 3,
    now: Date = new Date()
  ): Promise<{ sent: number; failed: number }> {
    const cutoff = new Date(now.getTime() + withinDays * DAY_MS)

    const rows = await db
      .select({
        id: subscriptions.id,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        email: users.email,
        name: users.name,
        planName: plans.name,
      })
      .from(subscriptions)
      .innerJoin(users, eq(users.id, subscriptions.userId))
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(
        and(
          isNull(subscriptions.deletedAt),
          inArray(subscriptions.status, ['active', 'trialing']),
          gt(subscriptions.currentPeriodEnd, now),
          lte(subscriptions.currentPeriodEnd, cutoff),
          or(
            isNull(subscriptions.renewalReminderSentAt),
            sql`${subscriptions.renewalReminderSentAt} < ${subscriptions.currentPeriodStart}`
          )
        )
      )

    let sent = 0
    let failed = 0
    for (const row of rows) {
      if (!row.email) continue
      const daysLeft = Math.max(1, Math.ceil((row.currentPeriodEnd.getTime() - now.getTime()) / DAY_MS))
      try {
        await sendEmail(
          subscriptionExpiringEmail({
            to: row.email,
            name: row.name ?? null,
            planName: row.planName,
            daysLeft,
            endsAt: new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
              row.currentPeriodEnd
            ),
          })
        )
        await db
          .update(subscriptions)
          .set({ renewalReminderSentAt: now })
          .where(eq(subscriptions.id, row.id))
        sent++
      } catch (error) {
        failed++
        logger.error({ err: error, subscriptionId: row.id }, 'renewal reminder failed')
      }
    }

    logger.info({ sent, failed, candidates: rows.length }, 'renewal reminders processed')
    return { sent, failed }
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
