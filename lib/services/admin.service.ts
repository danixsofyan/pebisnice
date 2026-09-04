import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { plans, subscriptionPayments, subscriptions, users } from '@/lib/db/schema'
import { addDays, type SubscriptionStatus } from '@/lib/domain/billing/period'
import { ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

export interface AdminOverview {
  totalSubscribers: number
  active: number
  trialing: number
  expired: number
  revenueTotal: string
  revenueThisMonth: string
  recentPayments: Array<{
    orderId: string
    email: string | null
    amount: string
    status: string
    paymentType: string | null
    createdAt: Date
  }>
}

export interface SubscriberRow {
  userId: string
  name: string | null
  email: string
  planName: string | null
  status: SubscriptionStatus | null
  currentPeriodEnd: Date | null
}

export class AdminService {
  /** Ringkasan untuk halaman utama admin. */
  async overview(now: Date = new Date()): Promise<AdminOverview> {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

    const [totals] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where (${subscriptions.status} in ('active','trialing')) and ${subscriptions.currentPeriodEnd} > ${now})::int`,
        trialing: sql<number>`count(*) filter (where ${subscriptions.status} = 'trialing' and ${subscriptions.currentPeriodEnd} > ${now})::int`,
      })
      .from(subscriptions)
      .where(isNull(subscriptions.deletedAt))

    const [revenue] = await db
      .select({
        total: sql<string>`coalesce(sum(${subscriptionPayments.grossAmount}), 0)`,
        month: sql<string>`coalesce(sum(${subscriptionPayments.grossAmount}) filter (where ${subscriptionPayments.paidAt} >= ${monthStart}), 0)`,
      })
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.status, 'paid'))

    const recent = await db
      .select({
        orderId: subscriptionPayments.orderId,
        email: users.email,
        amount: subscriptionPayments.grossAmount,
        status: subscriptionPayments.status,
        paymentType: subscriptionPayments.paymentType,
        createdAt: subscriptionPayments.createdAt,
      })
      .from(subscriptionPayments)
      .leftJoin(users, eq(users.id, subscriptionPayments.userId))
      .orderBy(desc(subscriptionPayments.createdAt))
      .limit(10)

    const total = totals?.total ?? 0
    const active = totals?.active ?? 0

    return {
      totalSubscribers: total,
      active,
      trialing: totals?.trialing ?? 0,
      expired: total - active,
      revenueTotal: revenue?.total ?? '0',
      revenueThisMonth: revenue?.month ?? '0',
      recentPayments: recent,
    }
  }

  /** Daftar pelanggan dengan pencarian dan filter status. */
  async listSubscribers(options: {
    search?: string
    status?: SubscriptionStatus
    limit?: number
    offset?: number
  }): Promise<SubscriberRow[]> {
    const filters: SQL[] = []
    if (options.search) {
      const term = `%${options.search}%`
      filters.push(or(ilike(users.email, term), ilike(users.name, term)) as SQL)
    }
    if (options.status) {
      filters.push(eq(subscriptions.status, options.status))
    }

    return db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        planName: plans.name,
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(users)
      .leftJoin(
        subscriptions,
        and(eq(subscriptions.userId, users.id), isNull(subscriptions.deletedAt))
      )
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(asc(users.email))
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0)
  }

  /**
   * Menambah/memperpanjang akses beberapa hari secara manual.
   *
   * Menghitung dari sisa masa yang masih berjalan bila ada, jadi hari yang
   * tersisa tidak hangus. Membuat langganan trial baru bila pelanggan belum
   * punya.
   */
  async grantAccessDays(userId: string, days: number, adminId: string): Promise<void> {
    if (days < 1 || days > 365) throw new ValidationError('Jumlah hari tidak wajar')

    const now = new Date()
    const existing = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), isNull(subscriptions.deletedAt)))
      .limit(1)

    const current = existing[0]
    const base = current && current.currentPeriodEnd > now ? current.currentPeriodEnd : now
    const newEnd = addDays(base, days)

    if (current) {
      await db
        .update(subscriptions)
        .set({ currentPeriodEnd: newEnd, status: 'trialing', canceledAt: null })
        .where(eq(subscriptions.id, current.id))
    } else {
      const trialPlan = (
        await db
          .select({ id: plans.id })
          .from(plans)
          .where(and(eq(plans.interval, 'trial'), isNull(plans.deletedAt)))
          .limit(1)
      )[0]
      if (!trialPlan) throw new ValidationError('Paket trial belum ada untuk dasar akses')

      await db.insert(subscriptions).values({
        userId,
        planId: trialPlan.id,
        status: 'trialing',
        currentPeriodStart: now,
        currentPeriodEnd: newEnd,
      })
    }

    logger.info({ adminId, userId, days, until: newEnd }, 'admin granted access days')
  }

  /** Mengubah status langganan (mis. membatalkan atau mengaktifkan kembali). */
  async setStatus(userId: string, status: SubscriptionStatus, adminId: string): Promise<void> {
    const rows = await db
      .update(subscriptions)
      .set({ status, canceledAt: status === 'canceled' ? new Date() : null })
      .where(and(eq(subscriptions.userId, userId), isNull(subscriptions.deletedAt)))
      .returning({ id: subscriptions.id })

    if (rows.length === 0) throw new ValidationError('Pelanggan belum punya langganan')
    logger.info({ adminId, userId, status }, 'admin changed subscription status')
  }
}

export const adminService = new AdminService()
