import { describe, expect, it } from 'vitest'
import { fromDecimalString, toDecimalString, ZERO } from '@/lib/domain/money'
import {
  calculateProfitLoss,
  formatMargin,
  type ProfitLossInput,
} from '@/lib/domain/finance/profit-loss'

function input(overrides: Partial<ProfitLossInput> = {}): ProfitLossInput {
  return {
    marketplaceRevenue: fromDecimalString('100000000.00'),
    posRevenue: fromDecimalString('50000000.00'),
    cogs: fromDecimalString('90000000.00'),
    platformFees: fromDecimalString('5500000.00'),
    operatingExpenses: fromDecimalString('12000000.00'),
    ...overrides,
  }
}

describe('calculateProfitLoss', () => {
  it('menjumlahkan pendapatan dua channel', () => {
    const report = calculateProfitLoss(input())

    expect(toDecimalString(report.revenue)).toBe('150000000.00')
    expect(toDecimalString(report.marketplaceRevenue)).toBe('100000000.00')
    expect(toDecimalString(report.posRevenue)).toBe('50000000.00')
  })

  it('menghitung laba kotor dan laba bersih', () => {
    const report = calculateProfitLoss(input())

    // 150jt - 90jt = 60jt
    expect(toDecimalString(report.grossProfit)).toBe('60000000.00')
    // 60jt - 5,5jt - 12jt = 42,5jt
    expect(toDecimalString(report.netProfit)).toBe('42500000.00')
  })

  it('menghitung margin dalam basis point', () => {
    const report = calculateProfitLoss(input())

    // 60jt / 150jt = 40%
    expect(report.grossMarginBasisPoints).toBe(4000)
    // 42,5jt / 150jt = 28,3333% -> 2833 bp
    expect(report.netMarginBasisPoints).toBe(2833)
  })

  it('mengembalikan margin nol saat tidak ada pendapatan', () => {
    const report = calculateProfitLoss({
      marketplaceRevenue: ZERO,
      posRevenue: ZERO,
      cogs: ZERO,
      platformFees: ZERO,
      operatingExpenses: fromDecimalString('1000000.00'),
    })

    expect(report.grossMarginBasisPoints).toBe(0)
    expect(report.netMarginBasisPoints).toBe(0)
    expect(toDecimalString(report.netProfit)).toBe('-1000000.00')
  })

  it('melaporkan rugi sebagai angka negatif', () => {
    const report = calculateProfitLoss(
      input({
        marketplaceRevenue: fromDecimalString('10000000.00'),
        posRevenue: ZERO,
        cogs: fromDecimalString('12000000.00'),
      })
    )

    expect(toDecimalString(report.grossProfit)).toBe('-2000000.00')
    expect(report.grossMarginBasisPoints).toBe(-2000)
    expect(report.netMarginBasisPoints).toBeLessThan(0)
  })

  it('membulatkan margin half-up', () => {
    // laba 1, pendapatan 3 -> 3333,33 bp -> 3333
    const turun = calculateProfitLoss({
      marketplaceRevenue: 3n,
      posRevenue: ZERO,
      cogs: 2n,
      platformFees: ZERO,
      operatingExpenses: ZERO,
    })
    expect(turun.grossMarginBasisPoints).toBe(3333)

    // laba 1, pendapatan 6 -> 1666,67 bp -> 1667
    const naik = calculateProfitLoss({
      marketplaceRevenue: 6n,
      posRevenue: ZERO,
      cogs: 5n,
      platformFees: ZERO,
      operatingExpenses: ZERO,
    })
    expect(naik.grossMarginBasisPoints).toBe(1667)
  })

  it('tetap eksak pada angka sangat besar', () => {
    const report = calculateProfitLoss({
      marketplaceRevenue: fromDecimalString('9999999999999.99'),
      posRevenue: fromDecimalString('0.01'),
      cogs: ZERO,
      platformFees: ZERO,
      operatingExpenses: ZERO,
    })

    expect(toDecimalString(report.revenue)).toBe('10000000000000.00')
    expect(report.grossMarginBasisPoints).toBe(10_000)
  })

  it('menolak komponen negatif', () => {
    const negative = fromDecimalString('-1.00')

    expect(() => calculateProfitLoss(input({ cogs: negative }))).toThrow('cogs tidak boleh negatif')
    expect(() => calculateProfitLoss(input({ platformFees: negative }))).toThrow(
      'platformFees tidak boleh negatif'
    )
    expect(() => calculateProfitLoss(input({ operatingExpenses: negative }))).toThrow(
      'operatingExpenses tidak boleh negatif'
    )
  })
})

describe('formatMargin', () => {
  it('menampilkan basis point sebagai persen', () => {
    expect(formatMargin(4000)).toBe('40.00%')
    expect(formatMargin(2833)).toBe('28.33%')
    expect(formatMargin(0)).toBe('0.00%')
    expect(formatMargin(-2000)).toBe('-20.00%')
  })
})
