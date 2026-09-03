import {
  transactionRepository,
  type TransactionFilter,
  type NewTransaction,
} from '@/lib/repositories/transaction.repository'
import { stores } from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'
import { eq, and, isNull } from 'drizzle-orm'
import { NotFoundError } from '@/lib/errors/app-error'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { requirePermission } from '@/lib/rbac'
import { logger } from '@/lib/logging/logger'

export class TransactionService {
  async getTransactions(filter: TransactionFilter) {
    return transactionRepository.findByProjectWithAuth(filter)
  }

  async syncTransactionsForStore(
    projectId: string,
    storeId: string,
    transactions: NewTransaction[]
  ) {
    const storeExists = await withTenant(projectId, (tx) =>
      tx
        .select({ id: stores.id })
        .from(stores)
        .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)))
        .limit(1)
    )
    if (storeExists.length === 0) throw new NotFoundError('Store tidak ditemukan')

    const result = await transactionRepository.upsertMany(projectId, transactions)
    logger.info(
      { storeId, inserted: result.inserted, skipped: result.skipped },
      'Transactions synced'
    )

    return result
  }

  async triggerManualSync(
    storeId: string,
    projectId: string,
    userId: string,
    requestMeta: { ip: string; userAgent: string }
  ) {
    await requirePermission(projectId, userId, 'store:manage')

    logger.info({ storeId, userId }, 'Manual sync triggered')

    await auditRepository.log({
      action: 'update',
      resource: 'transaction',
      resourceId: storeId,
      userId,
      projectId,
      ipAddress: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      metadata: { action: 'manual_sync' },
    })

    return { success: true, message: 'Sync started in background' }
  }
}

export const transactionService = new TransactionService()
