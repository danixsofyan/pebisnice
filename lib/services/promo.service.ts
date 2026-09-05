import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { promotions, transactions } from '@/lib/db/schema'
import { withTenant, type Transaction } from '@/lib/db/tenant'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { fromDecimalString, percentOf, toDecimalString, type Money, ZERO } from '@/lib/domain/money'
import { requirePermission } from '@/lib/rbac'
import { sanitizeText } from '@/lib/security/sanitizer'
import { NotFoundError, ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

const MANAGE: Parameters<typeof requirePermission>[2] = 'product:manage'

export interface PromoContext {
  userId: string
  ip: string
  userAgent: string
}

export interface PromoInput {
  code: string
  name: string
  discountType: 'percent' | 'nominal'
  percentBasisPoints: number
  amount: string
  minSpend: string
  maxDiscount: string | null
  startsAt: string | null
  endsAt: string | null
  usageLimit: number | null
}

export interface PromoValidation {
  promotionId: string
  code: string
  discountAmount: Money
}

export class PromoService {
  async create(projectId: string, input: PromoInput, context: PromoContext): Promise<{ id: string }> {
    await requirePermission(projectId, context.userId, MANAGE)
    const code = input.code.trim().toUpperCase()
    if (!code) throw new ValidationError('Kode voucher wajib diisi')

    const [row] = await withTenant(projectId, (tx) =>
      tx
        .insert(promotions)
        .values({
          projectId,
          code,
          name: sanitizeText(input.name || code),
          discountType: input.discountType,
          percentBasisPoints: input.discountType === 'percent' ? input.percentBasisPoints : 0,
          amount: input.discountType === 'nominal' ? input.amount : '0',
          minSpend: input.minSpend,
          maxDiscount: input.maxDiscount,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          usageLimit: input.usageLimit,
          createdBy: context.userId,
          updatedBy: context.userId,
        })
        .onConflictDoNothing()
        .returning({ id: promotions.id })
    )
    if (!row) throw new ValidationError('Kode voucher sudah dipakai')

    await auditRepository.log({
      action: 'create',
      resource: 'promotion',
      resourceId: row.id,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { code },
    })
    logger.info({ projectId, promotionId: row.id }, 'promotion created')
    return row
  }

  async setActive(projectId: string, id: string, isActive: boolean, context: PromoContext): Promise<void> {
    await requirePermission(projectId, context.userId, MANAGE)
    const updated = await withTenant(projectId, (tx) =>
      tx
        .update(promotions)
        .set({ isActive, updatedBy: context.userId })
        .where(and(eq(promotions.id, id), eq(promotions.projectId, projectId)))
        .returning({ id: promotions.id })
    )
    if (updated.length === 0) throw new NotFoundError('Voucher tidak ditemukan')
  }

  async list(projectId: string, userId: string) {
    await requirePermission(projectId, userId, MANAGE)
    return withTenant(projectId, (tx) =>
      tx
        .select()
        .from(promotions)
        .where(and(eq(promotions.projectId, projectId), isNull(promotions.deletedAt)))
        .orderBy(desc(promotions.createdAt))
        .limit(200)
    )
  }

  // Validate a code against a subtotal and compute the discount. Pure business rules; throws with
  // a user-facing reason so the cashier sees why a code was rejected.
  async validate(
    projectId: string,
    userId: string,
    code: string,
    subtotal: Money
  ): Promise<PromoValidation> {
    await requirePermission(projectId, userId, 'pos:operate')
    const [p] = await withTenant(projectId, (tx) =>
      tx
        .select()
        .from(promotions)
        .where(
          and(
            eq(promotions.projectId, projectId),
            eq(promotions.code, code.trim().toUpperCase()),
            isNull(promotions.deletedAt)
          )
        )
        .limit(1)
    )
    if (!p) throw new ValidationError('Kode voucher tidak ditemukan')
    if (!p.isActive) throw new ValidationError('Voucher tidak aktif')
    const now = new Date()
    if (p.startsAt && now < p.startsAt) throw new ValidationError('Voucher belum berlaku')
    if (p.endsAt && now > p.endsAt) throw new ValidationError('Voucher sudah kedaluwarsa')
    if (p.usageLimit !== null && p.usedCount >= p.usageLimit) {
      throw new ValidationError('Kuota voucher habis')
    }
    if (subtotal < fromDecimalString(p.minSpend)) {
      throw new ValidationError(`Minimal belanja ${toDecimalString(fromDecimalString(p.minSpend))}`)
    }

    let discount =
      p.discountType === 'percent'
        ? percentOf(subtotal, p.percentBasisPoints)
        : fromDecimalString(p.amount)
    if (p.maxDiscount) {
      const cap = fromDecimalString(p.maxDiscount)
      if (discount > cap) discount = cap
    }
    if (discount > subtotal) discount = subtotal
    if (discount <= ZERO) throw new ValidationError('Voucher tidak memberi potongan')

    return { promotionId: p.id, code: p.code, discountAmount: discount }
  }

  // Redeem inside the sale's transaction: bump used_count (bounded by usage_limit) and stamp the
  // promotion onto the sale. The conditional WHERE makes the quota check race-safe — a concurrent
  // sale that pushes used_count to the limit leaves 0 rows updated, so this one rolls the sale back.
  async redeem(
    tx: Transaction,
    projectId: string,
    promotionId: string,
    transactionId: string
  ): Promise<void> {
    const bumped = await tx
      .update(promotions)
      .set({ usedCount: sql`${promotions.usedCount} + 1` })
      .where(
        and(
          eq(promotions.id, promotionId),
          eq(promotions.projectId, projectId),
          or(isNull(promotions.usageLimit), lt(promotions.usedCount, promotions.usageLimit))
        )
      )
      .returning({ id: promotions.id })
    if (bumped.length === 0) throw new ValidationError('Kuota voucher habis')

    await tx
      .update(transactions)
      .set({ promotionId })
      .where(and(eq(transactions.id, transactionId), eq(transactions.projectId, projectId)))
  }
}

export const promoService = new PromoService()
