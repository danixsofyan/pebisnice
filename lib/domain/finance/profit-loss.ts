import { ValidationError } from '@/lib/errors/app-error'
import { ZERO, type Money } from '@/lib/domain/money'

/**
 * Komponen laba-rugi. Dipisah per channel supaya laporan bisa menjawab
 * "berapa kontribusi offline vs marketplace" tanpa perhitungan ulang.
 */
export interface ProfitLossInput {
  marketplaceRevenue: Money
  posRevenue: Money
  /** COGS gabungan, dari snapshot HPP saat transaksi terjadi. */
  cogs: Money
  /** Potongan marketplace: komisi, layanan, ongkir, iklan. */
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
  /** Margin dalam basis point (1% = 100 bp) supaya tetap bilangan bulat. */
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

/**
 * Margin sebagai basis point, dibulatkan half-up. Mengembalikan 0 saat
 * pendapatan nol — bukan Infinity atau NaN.
 */
function marginBasisPoints(profit: Money, revenue: Money): number {
  if (revenue === ZERO) return 0

  const scaled = profit * 10_000n
  const quotient = scaled / revenue
  const remainder = scaled % revenue

  const rounded = remainder * 2n >= revenue ? quotient + 1n : quotient

  return Number(rounded)
}

/**
 * Menyusun laporan laba-rugi gabungan.
 *
 * Revenue − COGS = laba kotor. Laba kotor − biaya platform − OpEx = laba
 * bersih. COGS memakai snapshot HPP saat transaksi, bukan HPP saat ini,
 * sehingga laporan periode lampau tidak berubah ketika HPP diperbarui.
 */
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

/** Format margin basis point menjadi teks persen untuk tampilan. */
export function formatMargin(basisPoints: number): string {
  const percent = basisPoints / 100
  return `${percent.toFixed(2)}%`
}
