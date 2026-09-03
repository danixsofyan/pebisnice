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
  /**
   * Membuka shift. Satu cabang hanya boleh punya satu sesi terbuka; pengecekan
   * di sini ramah pengguna, sementara partial unique index di database yang
   * menutup celah balapan antara dua kasir.
   */
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

  /**
   * Menutup shift. Penjualan tunai dijumlahkan dari database, bukan dari
   * angka yang dikirim client — kasir hanya menyetor hasil hitung fisik.
   */
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
}

export const cashSessionService = new CashSessionService()
