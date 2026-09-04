import { sql } from 'drizzle-orm'
import type { Transaction } from '@/lib/db/tenant'
import { fromDecimalString, ZERO, type Money } from '@/lib/domain/money'

export interface PeriodFilter {
  projectId: string
  /** Inclusive, YYYY-MM-DD. */
  startDate: string
  endDate: string
  /** NULL means all branches. */
  branchId: string | null
  // Project timezone, setting day boundaries; taken from projects.timezone, not hardcoded, so tenants in other zones get correct day cutoffs.
  timezone: string
}

export interface RevenueBreakdown {
  marketplaceRevenue: Money
  posRevenue: Money
  cogs: Money
  platformFees: Money
}

function firstRow<T>(result: unknown): T | undefined {
  return (result as { rows?: T[] }).rows?.[0]
}

function toMoney(value: string | null | undefined): Money {
  return value ? fromDecimalString(value) : ZERO
}

export class ReportRepository {
  // Revenue, COGS, and platform fees in one aggregate query. Voided and soft-deleted transactions are excluded. The date range uses order_date (already TIMESTAMPTZ), converted to the project timezone so day boundaries match user perception; the timezone is a bind parameter, not spliced into the SQL string.
  async revenueBreakdown(tx: Transaction, filter: PeriodFilter): Promise<RevenueBreakdown> {
    const branchCondition = filter.branchId ? sql`AND t.branch_id = ${filter.branchId}` : sql``

    const result = await tx.execute<{
      marketplace_revenue: string
      pos_revenue: string
      cogs: string
      platform_fees: string
    }>(sql`
      WITH scoped AS (
        SELECT t.id, t.channel, t.net_amount, t.total_fees
        FROM transactions t
        WHERE t.project_id = ${filter.projectId}
          AND t.deleted_at IS NULL
          AND t.voided_at IS NULL
          AND t.status NOT IN ('cancelled', 'returned')
          AND (t.order_date AT TIME ZONE ${filter.timezone})::date
              BETWEEN ${filter.startDate}::date AND ${filter.endDate}::date
          ${branchCondition}
      )
      SELECT
        COALESCE(SUM(s.net_amount) FILTER (WHERE s.channel = 'marketplace'), 0)::text
          AS marketplace_revenue,
        COALESCE(SUM(s.net_amount) FILTER (WHERE s.channel = 'pos'), 0)::text
          AS pos_revenue,
        COALESCE((
          SELECT SUM(i.hpp_at_time * i.qty)
          FROM transaction_items i
          WHERE i.transaction_id IN (SELECT id FROM scoped)
        ), 0)::text AS cogs,
        COALESCE(SUM(s.total_fees), 0)::text AS platform_fees
      FROM scoped s
    `)

    const row = firstRow<{
      marketplace_revenue: string
      pos_revenue: string
      cogs: string
      platform_fees: string
    }>(result)

    return {
      marketplaceRevenue: toMoney(row?.marketplace_revenue),
      posRevenue: toMoney(row?.pos_revenue),
      cogs: toMoney(row?.cogs),
      platformFees: toMoney(row?.platform_fees),
    }
  }

  async operatingExpenses(tx: Transaction, filter: PeriodFilter): Promise<Money> {
    const branchCondition = filter.branchId ? sql`AND e.branch_id = ${filter.branchId}` : sql``

    const result = await tx.execute<{ total: string }>(sql`
      SELECT COALESCE(SUM(e.amount), 0)::text AS total
      FROM expenses e
      WHERE e.project_id = ${filter.projectId}
        AND e.deleted_at IS NULL
        AND e.expense_date BETWEEN ${filter.startDate}::date AND ${filter.endDate}::date
        ${branchCondition}
    `)

    return toMoney(firstRow<{ total: string }>(result)?.total)
  }

  async expensesByCategory(
    tx: Transaction,
    filter: PeriodFilter
  ): Promise<Array<{ category: string; amount: Money }>> {
    const branchCondition = filter.branchId ? sql`AND e.branch_id = ${filter.branchId}` : sql``

    const result = await tx.execute<{ category: string; total: string }>(sql`
      SELECT e.category::text AS category, SUM(e.amount)::text AS total
      FROM expenses e
      WHERE e.project_id = ${filter.projectId}
        AND e.deleted_at IS NULL
        AND e.expense_date BETWEEN ${filter.startDate}::date AND ${filter.endDate}::date
        ${branchCondition}
      GROUP BY e.category
      ORDER BY SUM(e.amount) DESC
    `)

    const rows = (result as { rows?: Array<{ category: string; total: string }> }).rows ?? []
    return rows.map((row) => ({ category: row.category, amount: toMoney(row.total) }))
  }

  /** Daily sales per channel; basis for the 30-day trend chart. */
  async dailySales(
    tx: Transaction,
    filter: PeriodFilter
  ): Promise<Array<{ date: string; marketplaceRevenue: Money; posRevenue: Money }>> {
    const branchCondition = filter.branchId ? sql`AND t.branch_id = ${filter.branchId}` : sql``

    const result = await tx.execute<{
      day: string
      marketplace_revenue: string
      pos_revenue: string
    }>(sql`
      SELECT
        (t.order_date AT TIME ZONE ${filter.timezone})::date::text AS day,
        COALESCE(SUM(t.net_amount) FILTER (WHERE t.channel = 'marketplace'), 0)::text
          AS marketplace_revenue,
        COALESCE(SUM(t.net_amount) FILTER (WHERE t.channel = 'pos'), 0)::text
          AS pos_revenue
      FROM transactions t
      WHERE t.project_id = ${filter.projectId}
        AND t.deleted_at IS NULL
        AND t.voided_at IS NULL
        AND t.status NOT IN ('cancelled', 'returned')
        AND (t.order_date AT TIME ZONE ${filter.timezone})::date
            BETWEEN ${filter.startDate}::date AND ${filter.endDate}::date
        ${branchCondition}
      GROUP BY 1
      ORDER BY 1
    `)

    const rows =
      (
        result as {
          rows?: Array<{ day: string; marketplace_revenue: string; pos_revenue: string }>
        }
      ).rows ?? []

    return rows.map((row) => ({
      date: row.day,
      marketplaceRevenue: toMoney(row.marketplace_revenue),
      posRevenue: toMoney(row.pos_revenue),
    }))
  }
}

export const reportRepository = new ReportRepository()
