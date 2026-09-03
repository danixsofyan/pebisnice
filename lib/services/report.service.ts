import { reportRepository, type PeriodFilter } from '@/lib/repositories/report.repository'
import { withTenant } from '@/lib/db/tenant'
import { calculateProfitLoss, type ProfitLossReport } from '@/lib/domain/finance/profit-loss'
import { toDecimalString } from '@/lib/domain/money'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { checkPermission, requireBranchAccess, requirePermission } from '@/lib/rbac'
import { COST_PERMISSION } from '@/lib/authz/permissions'
import { ForbiddenError, ValidationError } from '@/lib/errors/app-error'

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

/** Bentuk P&L siap tampil, seluruh angka sudah jadi string desimal. */
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
  /**
   * Laba-rugi gabungan marketplace dan offline.
   *
   * Menuntut `cost:view` karena COGS adalah angka biaya — kasir dan produksi
   * tidak boleh menyimpulkan HPP dari laporan ini.
   */
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

  /** Tren harian per channel. Tidak memuat biaya, jadi cukup `report:view`. */
  async dailySales(request: ReportRequest, context: ReportContext) {
    assertPeriod(request)
    await requirePermission(request.projectId, context.userId, 'report:view')

    if (request.branchId) {
      await requireBranchAccess(request.projectId, context.userId, request.branchId)
    }

    const rows = await withTenant(request.projectId, (tx) =>
      reportRepository.dailySales(tx, {
        projectId: request.projectId,
        startDate: request.startDate,
        endDate: request.endDate,
        branchId: request.branchId,
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

    const rows = await withTenant(request.projectId, (tx) =>
      reportRepository.expensesByCategory(tx, {
        projectId: request.projectId,
        startDate: request.startDate,
        endDate: request.endDate,
        branchId: request.branchId,
      })
    )

    return rows.map((row) => ({ category: row.category, amount: toDecimalString(row.amount) }))
  }
}

export const reportService = new ReportService()
