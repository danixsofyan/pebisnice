import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { customers, receivablePayments, receivables } from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { fromDecimalString, toDecimalString, ZERO } from '@/lib/domain/money'
import { requirePermission } from '@/lib/rbac'
import { sanitizeText } from '@/lib/security/sanitizer'
import { NotFoundError, ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

const MANAGE: Parameters<typeof requirePermission>[2] = 'expense:manage'

export interface ReceivableContext {
  userId: string
  ip: string
  userAgent: string
}

type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'card' | 'other'

export interface ReceivableRow {
  id: string
  customerName: string | null
  amount: string
  paid: string
  outstanding: string
  description: string | null
  dueDate: string | null
  settled: boolean
  createdAt: Date
}

export class ReceivableService {
  async create(
    projectId: string,
    input: {
      customerId: string | null
      amount: string
      description: string | null
      dueDate: string | null
    },
    context: ReceivableContext
  ): Promise<{ id: string }> {
    await requirePermission(projectId, context.userId, MANAGE)
    if (fromDecimalString(input.amount) <= ZERO)
      throw new ValidationError('Jumlah harus lebih dari 0')

    const [row] = await withTenant(projectId, (tx) =>
      tx
        .insert(receivables)
        .values({
          projectId,
          customerId: input.customerId,
          amount: input.amount,
          description: input.description ? sanitizeText(input.description) : null,
          dueDate: input.dueDate,
          createdBy: context.userId,
          updatedBy: context.userId,
        })
        .returning({ id: receivables.id })
    )
    await auditRepository.log({
      action: 'create',
      resource: 'receivable',
      resourceId: row!.id,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { amount: input.amount },
    })
    logger.info({ projectId, receivableId: row!.id }, 'receivable created')
    return row!
  }

  // Record an installment. Recomputes the paid total in the same transaction and flips settled_at
  // once fully paid. Rejects overpayment.
  async addPayment(
    projectId: string,
    receivableId: string,
    input: { amount: string; method: PaymentMethod | null; note: string | null },
    context: ReceivableContext
  ): Promise<void> {
    await requirePermission(projectId, context.userId, MANAGE)
    const pay = fromDecimalString(input.amount)
    if (pay <= ZERO) throw new ValidationError('Jumlah bayar harus lebih dari 0')

    await withTenant(projectId, async (tx) => {
      const [r] = await tx
        .select({ amount: receivables.amount })
        .from(receivables)
        .where(
          and(
            eq(receivables.id, receivableId),
            eq(receivables.projectId, projectId),
            isNull(receivables.deletedAt)
          )
        )
        .limit(1)
      if (!r) throw new NotFoundError('Piutang tidak ditemukan')

      const [paidRow] = await tx
        .select({ paid: sql<string>`coalesce(sum(${receivablePayments.amount}), 0)` })
        .from(receivablePayments)
        .where(eq(receivablePayments.receivableId, receivableId))
      const outstanding = fromDecimalString(r.amount) - fromDecimalString(paidRow?.paid ?? '0')
      if (pay > outstanding) {
        throw new ValidationError(`Melebihi sisa piutang (${toDecimalString(outstanding)})`)
      }

      await tx.insert(receivablePayments).values({
        projectId,
        receivableId,
        amount: input.amount,
        method: input.method,
        note: input.note ? sanitizeText(input.note) : null,
        createdBy: context.userId,
      })

      const settled = pay === outstanding
      await tx
        .update(receivables)
        .set({ settledAt: settled ? new Date() : null, updatedBy: context.userId })
        .where(eq(receivables.id, receivableId))
    })

    await auditRepository.log({
      action: 'update',
      resource: 'receivable',
      resourceId: receivableId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { payment: input.amount },
    })
  }

  async list(
    projectId: string,
    userId: string,
    filter: { status?: 'open' | 'settled' } = {}
  ): Promise<ReceivableRow[]> {
    await requirePermission(projectId, userId, MANAGE)
    return withTenant(projectId, async (tx) => {
      const conditions = [eq(receivables.projectId, projectId), isNull(receivables.deletedAt)]
      if (filter.status === 'open') conditions.push(isNull(receivables.settledAt))
      if (filter.status === 'settled') conditions.push(sql`${receivables.settledAt} is not null`)

      const rows = await tx
        .select({
          id: receivables.id,
          customerName: customers.name,
          amount: receivables.amount,
          description: receivables.description,
          dueDate: receivables.dueDate,
          settledAt: receivables.settledAt,
          createdAt: receivables.createdAt,
          paid: sql<string>`coalesce((select sum(p.amount) from receivable_payments p where p.receivable_id = ${receivables.id}), 0)`,
        })
        .from(receivables)
        .leftJoin(customers, eq(customers.id, receivables.customerId))
        .where(and(...conditions))
        .orderBy(desc(receivables.createdAt))
        .limit(300)

      return rows.map((r) => ({
        id: r.id,
        customerName: r.customerName,
        amount: r.amount,
        paid: r.paid,
        outstanding: toDecimalString(fromDecimalString(r.amount) - fromDecimalString(r.paid)),
        description: r.description,
        dueDate: r.dueDate,
        settled: r.settledAt !== null,
        createdAt: r.createdAt,
      }))
    })
  }

  async outstandingTotal(projectId: string, userId: string): Promise<string> {
    await requirePermission(projectId, userId, MANAGE)
    return withTenant(projectId, async (tx) => {
      const [row] = await tx
        .select({
          total: sql<string>`coalesce(sum(${receivables.amount}), 0) - coalesce((select sum(p.amount) from receivable_payments p join receivables r on r.id = p.receivable_id where r.project_id = ${projectId} and r.deleted_at is null and r.settled_at is null), 0)`,
        })
        .from(receivables)
        .where(
          and(
            eq(receivables.projectId, projectId),
            isNull(receivables.deletedAt),
            isNull(receivables.settledAt)
          )
        )
      return row?.total ?? '0'
    })
  }
}

export const receivableService = new ReceivableService()
