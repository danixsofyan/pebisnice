import { and, desc, eq, gte, isNull, lte, ne, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, transactionItems, transactions } from '@/lib/db/schema'
import { reportRepository, type PeriodFilter } from '@/lib/repositories/report.repository'
import { withTenant } from '@/lib/db/tenant'
import { calculateProfitLoss, type ProfitLossReport } from '@/lib/domain/finance/profit-loss'
import { toDecimalString } from '@/lib/domain/money'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { checkPermission, requireBranchAccess, requirePermission } from '@/lib/rbac'
import { COST_PERMISSION } from '@/lib/authz/permissions'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors/app-error'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface ReportRequest {
  projectId: string
  startDate: string
  endDate: string
  branchId: string | null
}

export interface ReportContext {
  userId: string
  ip: string
  userAgent: string
}

/** Display-ready P&L; every number is already a decimal string. */
export interface ProfitLossView {
  marketplaceRevenue: string
  posRevenue: string
  revenue: string
  cogs: string
  grossProfit: string
  platformFees: string
  operatingExpenses: string
  netProfit: string
  grossMarginBasisPoints: number
  netMarginBasisPoints: number
}

function assertPeriod(request: ReportRequest): void {
  if (!DATE_PATTERN.test(request.startDate) || !DATE_PATTERN.test(request.endDate)) {
    throw new ValidationError('Tanggal harus berformat YYYY-MM-DD', {
      period: ['Format tanggal tidak valid'],
    })
  }
  if (request.startDate > request.endDate) {
    throw new ValidationError('Tanggal mulai tidak boleh setelah tanggal akhir', {
      period: ['Rentang tanggal terbalik'],
    })
  }
}

// The project timezone sets report day boundaries; read from the database each time, not a constant, so tenants in other zones are correct.
async function projectTimezone(projectId: string): Promise<string> {
  const [project] = await db
    .select({ timezone: projects.timezone })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1)

  if (!project) throw new NotFoundError('Project tidak ditemukan')
  return project.timezone
}

function toView(report: ProfitLossReport): ProfitLossView {
  return {
    marketplaceRevenue: toDecimalString(report.marketplaceRevenue),
    posRevenue: toDecimalString(report.posRevenue),
    revenue: toDecimalString(report.revenue),
    cogs: toDecimalString(report.cogs),
    grossProfit: toDecimalString(report.grossProfit),
    platformFees: toDecimalString(report.platformFees),
    operatingExpenses: toDecimalString(report.operatingExpenses),
    netProfit: toDecimalString(report.netProfit),
    grossMarginBasisPoints: report.grossMarginBasisPoints,
    netMarginBasisPoints: report.netMarginBasisPoints,
  }
}

export class ReportService {
  // Combined marketplace + offline P&L. Requires cost:view because COGS is a cost figure the cashier and production roles must not infer.
  async profitLoss(request: ReportRequest, context: ReportContext): Promise<ProfitLossView> {
    assertPeriod(request)
    await requirePermission(request.projectId, context.userId, 'report:view')

    const canViewCost = await checkPermission(request.projectId, context.userId, COST_PERMISSION)
    if (!canViewCost) {
      throw new ForbiddenError('Laporan laba-rugi memuat data biaya yang tidak boleh Anda akses.')
    }

    if (request.branchId) {
      await requireBranchAccess(request.projectId, context.userId, request.branchId)
    }

    const filter: PeriodFilter = {
      projectId: request.projectId,
      startDate: request.startDate,
      endDate: request.endDate,
      branchId: request.branchId,
      timezone: await projectTimezone(request.projectId),
    }

    const report = await withTenant(request.projectId, async (tx) => {
      const [revenue, operatingExpenses] = await Promise.all([
        reportRepository.revenueBreakdown(tx, filter),
        reportRepository.operatingExpenses(tx, filter),
      ])

      return calculateProfitLoss({ ...revenue, operatingExpenses })
    })

    await auditRepository.log({
      action: 'export',
      resource: 'profit_loss_report',
      userId: context.userId,
      projectId: request.projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: {
        startDate: request.startDate,
        endDate: request.endDate,
        branchId: request.branchId,
      },
    })

    return toView(report)
  }

  /** Daily trend per channel. No cost data, so report:view is enough. */
  async dailySales(request: ReportRequest, context: ReportContext) {
    assertPeriod(request)
    await requirePermission(request.projectId, context.userId, 'report:view')

    if (request.branchId) {
      await requireBranchAccess(request.projectId, context.userId, request.branchId)
    }

    const timezone = await projectTimezone(request.projectId)

    const rows = await withTenant(request.projectId, (tx) =>
      reportRepository.dailySales(tx, {
        projectId: request.projectId,
        startDate: request.startDate,
        endDate: request.endDate,
        branchId: request.branchId,
        timezone,
      })
    )

    return rows.map((row) => ({
      date: row.date,
      marketplaceRevenue: toDecimalString(row.marketplaceRevenue),
      posRevenue: toDecimalString(row.posRevenue),
    }))
  }

  async expenseBreakdown(request: ReportRequest, context: ReportContext) {
    assertPeriod(request)
    await requirePermission(request.projectId, context.userId, 'report:view')

    const timezone = await projectTimezone(request.projectId)

    const rows = await withTenant(request.projectId, (tx) =>
      reportRepository.expensesByCategory(tx, {
        projectId: request.projectId,
        startDate: request.startDate,
        endDate: request.endDate,
        branchId: request.branchId,
        timezone,
      })
    )

    return rows.map((row) => ({ category: row.category, amount: toDecimalString(row.amount) }))
  }

  // Best sellers over a period: quantity, revenue, and order count per product. Ranked by revenue; branch-scoped when a branch is given.
  async salesByProduct(
    request: ReportRequest,
    context: ReportContext
  ): Promise<SalesByProductRow[]> {
    assertPeriod(request)
    await requirePermission(request.projectId, context.userId, 'report:view')

    const start = new Date(`${request.startDate}T00:00:00.000Z`)
    const end = new Date(`${request.endDate}T23:59:59.999Z`)

    return withTenant(request.projectId, (tx) => {
      const conditions = [
        eq(transactions.projectId, request.projectId),
        ne(transactions.status, 'cancelled'),
        isNull(transactions.voidedAt),
        isNull(transactions.deletedAt),
        gte(transactions.orderDate, start),
        lte(transactions.orderDate, end),
      ]
      if (request.branchId) conditions.push(eq(transactions.branchId, request.branchId))

      return tx
        .select({
          name: transactionItems.productName,
          qty: sql<number>`sum(${transactionItems.qty})::int`,
          revenue: sql<string>`coalesce(sum(${transactionItems.qty} * ${transactionItems.unitPrice}), 0)`,
          orders: sql<number>`count(distinct ${transactions.id})::int`,
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactions.id, transactionItems.transactionId))
        .where(and(...conditions))
        .groupBy(transactionItems.productName)
        .orderBy(desc(sql`sum(${transactionItems.qty} * ${transactionItems.unitPrice})`))
        .limit(200)
    })
  }
}

export interface SalesByProductRow {
  name: string
  qty: number
  revenue: string
  orders: number
}

export const reportService = new ReportService()
