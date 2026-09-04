import { and, desc, eq, gte, isNull, lte, ne, sql } from 'drizzle-orm'
import { withTenant } from '@/lib/db/tenant'
import {
  transactions,
  transactionItems,
  inventory,
  productVariants,
  products,
} from '@/lib/db/schema'
import { requirePermission } from '@/lib/rbac'

export interface DashboardExtras {
  topProducts: Array<{ name: string; qty: number; revenue: string }>
  paymentBreakdown: Array<{ method: string; count: number; total: string }>
  lowStock: Array<{ name: string; stockQty: number }>
}

const LOW_STOCK_THRESHOLD = 5

export class DashboardService {
  // Best sellers, payment mix, and low stock for the dashboard. Read-only and
  // tenant-scoped; a cashier without report:view never reaches here.
  async extras(
    projectId: string,
    userId: string,
    branchId: string | null,
    startDate: string,
    endDate: string
  ): Promise<DashboardExtras> {
    await requirePermission(projectId, userId, 'report:view')
    const start = new Date(`${startDate}T00:00:00.000Z`)
    const end = new Date(`${endDate}T23:59:59.999Z`)

    return withTenant(projectId, async (tx) => {
      const soldWhere = and(
        eq(transactions.projectId, projectId),
        ne(transactions.status, 'cancelled'),
        isNull(transactions.voidedAt),
        isNull(transactions.deletedAt),
        gte(transactions.orderDate, start),
        lte(transactions.orderDate, end),
        // Keep these panels consistent with the branch-scoped KPIs above.
        ...(branchId ? [eq(transactions.branchId, branchId)] : [])
      )

      const topProducts = await tx
        .select({
          name: transactionItems.productName,
          qty: sql<number>`sum(${transactionItems.qty})::int`,
          revenue: sql<string>`coalesce(sum(${transactionItems.qty} * ${transactionItems.unitPrice}), 0)`,
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactions.id, transactionItems.transactionId))
        .where(soldWhere)
        .groupBy(transactionItems.productName)
        .orderBy(desc(sql`sum(${transactionItems.qty} * ${transactionItems.unitPrice})`))
        .limit(5)

      const paymentBreakdown = await tx
        .select({
          method: sql<string>`coalesce(${transactions.paymentMethod}, 'other')`,
          count: sql<number>`count(*)::int`,
          total: sql<string>`coalesce(sum(${transactions.netAmount}), 0)`,
        })
        .from(transactions)
        .where(and(soldWhere, eq(transactions.channel, 'pos')))
        .groupBy(transactions.paymentMethod)

      const lowStock = await tx
        .select({
          name: products.name,
          variantName: productVariants.variantName,
          stockQty: inventory.stockQty,
        })
        .from(inventory)
        .innerJoin(productVariants, eq(productVariants.id, inventory.productVariantId))
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(
          and(
            eq(inventory.projectId, projectId),
            isNull(inventory.deletedAt),
            isNull(products.deletedAt),
            lte(inventory.stockQty, LOW_STOCK_THRESHOLD),
            ...(branchId ? [eq(inventory.branchId, branchId)] : [])
          )
        )
        .orderBy(inventory.stockQty)
        .limit(8)

      return {
        topProducts,
        paymentBreakdown,
        lowStock: lowStock.map((r) => ({
          name: r.variantName ? `${r.name} · ${r.variantName}` : r.name,
          stockQty: r.stockQty,
        })),
      }
    })
  }
}

export const dashboardService = new DashboardService()
