import { ValidationError } from '@/lib/errors/app-error'
import { ZERO, type Money } from '@/lib/domain/money'

// Profit-and-loss parts, split by channel so reports can answer offline vs marketplace without recomputing.
export interface ProfitLossInput {
  marketplaceRevenue: Money
  posRevenue: Money
  /** Combined COGS, from the HPP snapshot at transaction time. */
  cogs: Money
  /** Marketplace fees: commission, service, shipping, ads. */
  platformFees: Money
  operatingExpenses: Money
}

export interface ProfitLossReport {
  marketplaceRevenue: Money
  posRevenue: Money
  revenue: Money
  cogs: Money
  grossProfit: Money
  platformFees: Money
  operatingExpenses: Money
  netProfit: Money
  /** Margin in basis points (1% = 100 bp) to stay integer. */
  grossMarginBasisPoints: number
  netMarginBasisPoints: number
}

function assertNonNegative(value: Money, field: string): void {
  if (value < ZERO) {
    throw new ValidationError(`${field} tidak boleh negatif`, {
      [field]: ['Tidak boleh negatif'],
    })
  }
}

// Margin in basis points, half-up; returns 0 (not Infinity/NaN) when revenue is zero.
function marginBasisPoints(profit: Money, revenue: Money): number {
  if (revenue === ZERO) return 0

  const scaled = profit * 10_000n
  const quotient = scaled / revenue
  const remainder = scaled % revenue

  const rounded = remainder * 2n >= revenue ? quotient + 1n : quotient

  return Number(rounded)
}

// Combined P&L: revenue - COGS = gross; gross - platform fees - opex = net. COGS uses the transaction-time HPP snapshot so past reports stay stable.
export function calculateProfitLoss(input: ProfitLossInput): ProfitLossReport {
  assertNonNegative(input.marketplaceRevenue, 'marketplaceRevenue')
  assertNonNegative(input.posRevenue, 'posRevenue')
  assertNonNegative(input.cogs, 'cogs')
  assertNonNegative(input.platformFees, 'platformFees')
  assertNonNegative(input.operatingExpenses, 'operatingExpenses')

  const revenue = input.marketplaceRevenue + input.posRevenue
  const grossProfit = revenue - input.cogs
  const netProfit = grossProfit - input.platformFees - input.operatingExpenses

  return {
    marketplaceRevenue: input.marketplaceRevenue,
    posRevenue: input.posRevenue,
    revenue,
    cogs: input.cogs,
    grossProfit,
    platformFees: input.platformFees,
    operatingExpenses: input.operatingExpenses,
    netProfit,
    grossMarginBasisPoints: marginBasisPoints(grossProfit, revenue),
    netMarginBasisPoints: marginBasisPoints(netProfit, revenue),
  }
}

/** Format a basis-point margin as a percent string. */
export function formatMargin(basisPoints: number): string {
  const percent = basisPoints / 100
  return `${percent.toFixed(2)}%`
}
