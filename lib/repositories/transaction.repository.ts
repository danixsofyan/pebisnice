import { eq, and, gte, lte, inArray, desc, count, sql, isNull } from 'drizzle-orm'
import { transactions, stores, projects } from '@/lib/db/schema'
import { BaseRepository } from './base.repository'
import { withTenant } from '@/lib/db/tenant'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

export type Transaction = InferSelectModel<typeof transactions>
export type NewTransaction = InferInsertModel<typeof transactions>

export interface TransactionFilter {
  projectId: string
  userId: string
  platform?: string
  status?: string
  dateField: 'order_date' | 'settlement_date'
  startDate: Date
  endDate: Date
  page?: number
  pageSize?: number
}

export class TransactionRepository extends BaseRepository {
  async findByProjectWithAuth(filter: TransactionFilter) {
    const { projectId, userId, platform, status, dateField, startDate, endDate } = filter
    const page = filter.page ?? 1
    const pageSize = Math.min(filter.pageSize ?? 50, 200)
    const offset = (page - 1) * pageSize

    return withTenant(projectId, async (tx) => {
      const projectStores = await tx
        .select({ id: stores.id })
        .from(stores)
        .innerJoin(projects, eq(stores.projectId, projects.id))
        .where(
          and(
            eq(projects.id, projectId),
            isNull(stores.deletedAt),
            sql`(${projects.userId} = ${userId} OR EXISTS (
              SELECT 1 FROM team_members tm
              WHERE tm.project_id = ${projectId}
                AND tm.user_id = ${userId}
                AND tm.status = 'active'
                AND tm.deleted_at IS NULL
            ))`
          )
        )

      if (projectStores.length === 0) return { data: [], total: 0 }

      const storeIds = projectStores.map((s) => s.id)

      const baseWhere = and(
        inArray(transactions.storeId, storeIds),
        isNull(transactions.deletedAt),
        ...(platform && platform !== 'all'
          ? [eq(stores.platform, platform as 'shopee' | 'tiktok' | 'tokopedia' | 'lazada')]
          : []),
        ...(status
          ? [
              eq(
                transactions.status,
                status as 'completed' | 'cancelled' | 'returned' | 'processing' | 'shipped'
              ),
            ]
          : []),
        dateField === 'order_date'
          ? and(gte(transactions.orderDate, startDate), lte(transactions.orderDate, endDate))
          : and(
              gte(transactions.settlementDate, startDate),
              lte(transactions.settlementDate, endDate)
            )
      )

      const [data, [countResult]] = await Promise.all([
        tx
          .select({ transaction: transactions })
          .from(transactions)
          .innerJoin(stores, eq(transactions.storeId, stores.id))
          .where(baseWhere)
          .orderBy(desc(transactions.orderDate))
          .limit(pageSize)
          .offset(offset)
          .then((rows) => rows.map((row) => row.transaction)),
        tx
          .select({ count: count() })
          .from(transactions)
          .innerJoin(stores, eq(transactions.storeId, stores.id))
          .where(baseWhere),
      ])

      return { data, total: countResult?.count ?? 0 }
    })
  }

  async upsertMany(
    projectId: string,
    txData: NewTransaction[]
  ): Promise<{ inserted: number; skipped: number }> {
    if (txData.length === 0) return { inserted: 0, skipped: 0 }

    const result = await withTenant(projectId, (tx) =>
      tx
        .insert(transactions)
        .values(txData)
        .onConflictDoNothing({ target: [transactions.storeId, transactions.orderId] })
        .returning({ id: transactions.id })
    )

    return {
      inserted: result.length,
      skipped: txData.length - result.length,
    }
  }
}

export const transactionRepository = new TransactionRepository()
