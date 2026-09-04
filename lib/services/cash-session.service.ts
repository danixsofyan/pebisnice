import { and, desc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { branches, cashSessions, users } from '@/lib/db/schema'
import { cashSessionRepository } from '@/lib/repositories/cash-session.repository'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { withTenant } from '@/lib/db/tenant'
import { closeCashSession } from '@/lib/domain/pos/cash-session'
import { fromDecimalString, type Money } from '@/lib/domain/money'
import { requireBranchAccess, requirePermission } from '@/lib/rbac'
import { NotFoundError, ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

export interface CashSessionContext {
  userId: string
  ip: string
  userAgent: string
}

export class CashSessionService {
  // Open a shift. A branch may have only one open session; this check is user-friendly while the partial unique index closes the race between two cashiers.
  async open(
    projectId: string,
    branchId: string,
    openingBalance: Money,
    context: CashSessionContext
  ) {
    await requirePermission(projectId, context.userId, 'cash_session:manage')
    await requireBranchAccess(projectId, context.userId, branchId)

    const session = await withTenant(projectId, async (tx) => {
      const existing = await cashSessionRepository.findOpenByBranch(tx, branchId)
      if (existing) {
        throw new ValidationError('Masih ada sesi kasir yang terbuka di cabang ini', {
          branchId: ['Tutup shift sebelumnya terlebih dahulu'],
        })
      }

      return cashSessionRepository.open(tx, {
        projectId,
        branchId,
        openedBy: context.userId,
        openingBalance,
      })
    })

    await auditRepository.log({
      action: 'create',
      resource: 'cash_session',
      resourceId: session.id,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { branchId },
    })

    logger.info({ projectId, branchId, sessionId: session.id }, 'Cash session opened')

    return session
  }

  // Close a shift. Cash sales are summed from the database, not from the client; the cashier only submits the physical count.
  async close(
    projectId: string,
    branchId: string,
    countedBalance: Money,
    note: string | null,
    context: CashSessionContext
  ) {
    await requirePermission(projectId, context.userId, 'cash_session:manage')
    await requireBranchAccess(projectId, context.userId, branchId)

    const result = await withTenant(projectId, async (tx) => {
      const session = await cashSessionRepository.findOpenByBranch(tx, branchId)
      if (!session) throw new NotFoundError('Tidak ada sesi kasir yang terbuka')

      const cashSales = await cashSessionRepository.sumCashSales(tx, session.id)

      const closing = closeCashSession({
        openingBalance: fromDecimalString(session.openingBalance),
        cashSales,
        countedBalance,
      })

      const closed = await cashSessionRepository.close(tx, {
        sessionId: session.id,
        closedBy: context.userId,
        expectedBalance: closing.expectedBalance,
        countedBalance: closing.countedBalance,
        difference: closing.difference,
        note,
      })

      if (!closed) throw new ValidationError('Sesi sudah ditutup oleh pengguna lain')

      return { session: closed, closing }
    })

    await auditRepository.log({
      action: 'update',
      resource: 'cash_session',
      resourceId: result.session.id,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: {
        branchId,
        difference: result.session.difference,
        isBalanced: result.closing.isBalanced,
      },
    })

    logger.info(
      { projectId, branchId, sessionId: result.session.id, balanced: result.closing.isBalanced },
      'Cash session closed'
    )

    return result
  }

  // Shift history for the closing report: opener/closer, expected vs counted, and the difference. Scoped to branches the caller can access.
  async history(
    projectId: string,
    userId: string,
    filter: { branchId?: string; limit?: number } = {}
  ): Promise<ShiftHistoryRow[]> {
    await requirePermission(projectId, userId, 'cash_session:manage')

    const opener = alias(users, 'opener')
    const closer = alias(users, 'closer')

    return withTenant(projectId, (tx) => {
      const conditions = [eq(cashSessions.projectId, projectId)]
      if (filter.branchId) conditions.push(eq(cashSessions.branchId, filter.branchId))

      return tx
        .select({
          id: cashSessions.id,
          branchName: branches.name,
          status: cashSessions.status,
          openedAt: cashSessions.openedAt,
          closedAt: cashSessions.closedAt,
          openingBalance: cashSessions.openingBalance,
          expectedBalance: cashSessions.expectedBalance,
          countedBalance: cashSessions.countedBalance,
          difference: cashSessions.difference,
          note: cashSessions.note,
          openedByEmail: opener.email,
          closedByEmail: closer.email,
        })
        .from(cashSessions)
        .leftJoin(branches, eq(branches.id, cashSessions.branchId))
        .leftJoin(opener, eq(opener.id, cashSessions.openedBy))
        .leftJoin(closer, eq(closer.id, cashSessions.closedBy))
        .where(and(...conditions))
        .orderBy(desc(cashSessions.openedAt))
        .limit(Math.min(filter.limit ?? 60, 200))
    })
  }
}

export interface ShiftHistoryRow {
  id: string
  branchName: string | null
  status: 'open' | 'closed'
  openedAt: Date
  closedAt: Date | null
  openingBalance: string
  expectedBalance: string | null
  countedBalance: string | null
  difference: string | null
  note: string | null
  openedByEmail: string | null
  closedByEmail: string | null
}

export const cashSessionService = new CashSessionService()
