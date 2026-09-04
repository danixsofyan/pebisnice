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
  /** Paket yang bisa dipilih pelanggan, terurut. */
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

  /** Langganan pengguna berikut paketnya, atau null bila belum pernah berlangganan. */
  async getForUser(userId: string): Promise<SubscriptionWithPlan | null> {
    const rows = await db
      .select({ subscription: subscriptions, plan: plans })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(eq(subscriptions.userId, userId), isNull(subscriptions.deletedAt)))
      .limit(1)
    return rows[0] ?? null
  }

  /**
   * Memulai masa coba. Menolak bila pengguna sudah punya langganan — trial
   * hanya untuk yang benar-benar baru, dan dicek di server agar tak bisa
   * dilewati dari klien.
   */
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

  /**
   * Mengaktifkan paket berbayar setelah pembayaran lunas. Dipanggil webhook
   * Midtrans. Idempoten pada tingkat langganan: memperbarui baris yang ada atau
   * membuat baru, memperpanjang dari akhir periode bila masih aktif.
   */
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
