import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm'
import { expenses } from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'
import { toDecimalString, type Money } from '@/lib/domain/money'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { requireBranchAccess, requirePermission } from '@/lib/rbac'
import { sanitizeText } from '@/lib/security/sanitizer'
import { NotFoundError, ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

export type ExpenseCategory =
  'rent' | 'salary' | 'utility' | 'marketing' | 'shipping' | 'supply' | 'tax' | 'other'

export interface RecordExpenseRequest {
  projectId: string
  branchId: string | null
  category: ExpenseCategory
  amount: Money
  expenseDate: string
  note: string | null
}

export interface ExpenseContext {
  userId: string
  ip: string
  userAgent: string
}

export class ExpenseService {
  async record(request: RecordExpenseRequest, context: ExpenseContext) {
    await requirePermission(request.projectId, context.userId, 'expense:manage')

    if (request.branchId) {
      await requireBranchAccess(request.projectId, context.userId, request.branchId)
    }

    if (request.amount <= 0n) {
      throw new ValidationError('Nominal pengeluaran harus lebih dari nol', {
        amount: ['Harus lebih dari nol'],
      })
    }

    const expense = await withTenant(request.projectId, async (tx) => {
      const [created] = await tx
        .insert(expenses)
        .values({
          projectId: request.projectId,
          branchId: request.branchId,
          category: request.category,
          amount: toDecimalString(request.amount),
          expenseDate: request.expenseDate,
          note: request.note ? sanitizeText(request.note) : null,
          createdBy: context.userId,
          updatedBy: context.userId,
        })
        .returning()

      return created!
    })

    await auditRepository.log({
      action: 'create',
      resource: 'expense',
      resourceId: expense.id,
      userId: context.userId,
      projectId: request.projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { category: request.category, branchId: request.branchId },
    })

    logger.info({ projectId: request.projectId, expenseId: expense.id }, 'Expense recorded')

    return expense
  }

  async list(projectId: string, startDate: string, endDate: string, userId: string) {
    await requirePermission(projectId, userId, 'report:view')

    return withTenant(projectId, (tx) =>
      tx
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.projectId, projectId),
            gte(expenses.expenseDate, startDate),
            lte(expenses.expenseDate, endDate),
            isNull(expenses.deletedAt)
          )
        )
        .orderBy(desc(expenses.expenseDate))
    )
  }

  /** Soft delete; the row stays for the audit trail. */
  async remove(projectId: string, expenseId: string, context: ExpenseContext): Promise<void> {
    await requirePermission(projectId, context.userId, 'expense:manage')

    const removed = await withTenant(projectId, async (tx) => {
      const rows = await tx
        .update(expenses)
        .set({ deletedAt: new Date(), isActive: false, updatedBy: context.userId })
        .where(
          and(
            eq(expenses.id, expenseId),
            eq(expenses.projectId, projectId),
            isNull(expenses.deletedAt)
          )
        )
        .returning({ id: expenses.id })

      return rows.length > 0
    })

    if (!removed) throw new NotFoundError('Pengeluaran tidak ditemukan')

    await auditRepository.log({
      action: 'delete',
      resource: 'expense',
      resourceId: expenseId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    })
  }
}

export const expenseService = new ExpenseService()
