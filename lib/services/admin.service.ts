import { and, asc, count, desc, eq, gt, gte, ilike, isNull, or, sql, type SQL } from 'drizzle-orm'
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

    // Hitungan pakai operator drizzle, bukan fragmen SQL mentah: menyisipkan
    // Date langsung ke `sql`...`` membuat driver gagal mem-bind parameternya.
    const notDeleted = isNull(subscriptions.deletedAt)
    const runningNow = and(
      or(eq(subscriptions.status, 'active'), eq(subscriptions.status, 'trialing')),
      gt(subscriptions.currentPeriodEnd, now)
    )

    const [[total], [active], [trialing]] = await Promise.all([
      db.select({ n: count() }).from(subscriptions).where(notDeleted),
      db.select({ n: count() }).from(subscriptions).where(and(notDeleted, runningNow)),
      db
        .select({ n: count() })
        .from(subscriptions)
        .where(
          and(
            notDeleted,
            eq(subscriptions.status, 'trialing'),
            gt(subscriptions.currentPeriodEnd, now)
          )
        ),
    ])

    const sumAmount = sql<string>`coalesce(sum(${subscriptionPayments.grossAmount}), 0)`
    const [[revenueTotal], [revenueMonth]] = await Promise.all([
      db
        .select({ v: sumAmount })
        .from(subscriptionPayments)
        .where(eq(subscriptionPayments.status, 'paid')),
      db
        .select({ v: sumAmount })
        .from(subscriptionPayments)
        .where(
          and(eq(subscriptionPayments.status, 'paid'), gte(subscriptionPayments.paidAt, monthStart))
        ),
    ])

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

    const totalCount = total?.n ?? 0
    const activeCount = active?.n ?? 0

    return {
      totalSubscribers: totalCount,
      active: activeCount,
      trialing: trialing?.n ?? 0,
      expired: totalCount - activeCount,
      revenueTotal: revenueTotal?.v ?? '0',
      revenueThisMonth: revenueMonth?.v ?? '0',
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

  /** Semua paket, termasuk yang nonaktif, untuk halaman kelola paket. */
  async listAllPlans() {
    return db.select().from(plans).where(isNull(plans.deletedAt)).orderBy(asc(plans.sortOrder))
  }

  /**
   * Memperbarui isi paket. Hanya memengaruhi checkout dan trial berikutnya —
   * langganan yang sedang berjalan mempertahankan periode dan harganya.
   */
  async updatePlan(
    planId: string,
    fields: {
      name: string
      description: string | null
      price: string
      trialDays: number | null
      isActive: boolean
      sortOrder: number
    },
    adminId: string
  ): Promise<void> {
    const rows = await db
      .update(plans)
      .set(fields)
      .where(and(eq(plans.id, planId), isNull(plans.deletedAt)))
      .returning({ id: plans.id })

    if (rows.length === 0) throw new ValidationError('Paket tidak ditemukan')
    logger.info({ adminId, planId }, 'admin updated plan')
  }

  /** Membuat paket baru. Kode harus unik di antara paket yang belum dihapus. */
  async createPlan(
    fields: {
      code: string
      name: string
      description: string | null
      interval: 'trial' | 'monthly' | 'yearly'
      price: string
      trialDays: number | null
      sortOrder: number
    },
    adminId: string
  ): Promise<void> {
    const clash = await db
      .select({ id: plans.id })
      .from(plans)
      .where(and(eq(plans.code, fields.code), isNull(plans.deletedAt)))
      .limit(1)
    if (clash.length > 0) throw new ValidationError(`Kode paket "${fields.code}" sudah dipakai`)

    await db.insert(plans).values(fields)
    logger.info({ adminId, code: fields.code }, 'admin created plan')
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
