import { describe, expect, it } from 'vitest'
import { fromDecimalString, toDecimalString } from '@/lib/domain/money'
import {
  calculateExpectedBalance,
  closeCashSession,
  sumCashSales,
} from '@/lib/domain/pos/cash-session'

describe('calculateExpectedBalance', () => {
  it('menjumlahkan modal awal dengan penjualan tunai', () => {
    const expected = calculateExpectedBalance(
      fromDecimalString('500000.00'),
      fromDecimalString('2350000.00')
    )

    expect(toDecimalString(expected)).toBe('2850000.00')
  })

  it('menolak nilai negatif', () => {
    expect(() => calculateExpectedBalance(fromDecimalString('-1.00'), 0n)).toThrow(
      'Modal awal tidak boleh negatif'
    )
    expect(() => calculateExpectedBalance(0n, fromDecimalString('-1.00'))).toThrow(
      'Penjualan tunai tidak boleh negatif'
    )
  })
})

describe('closeCashSession', () => {
  it('melaporkan shift yang pas', () => {
    const result = closeCashSession({
      openingBalance: fromDecimalString('500000.00'),
      cashSales: fromDecimalString('1000000.00'),
      countedBalance: fromDecimalString('1500000.00'),
    })

    expect(toDecimalString(result.expectedBalance)).toBe('1500000.00')
    expect(toDecimalString(result.difference)).toBe('0.00')
    expect(result.isBalanced).toBe(true)
  })

  it('melaporkan selisih kurang sebagai negatif', () => {
    const result = closeCashSession({
      openingBalance: fromDecimalString('500000.00'),
      cashSales: fromDecimalString('1000000.00'),
      countedBalance: fromDecimalString('1450000.00'),
    })

    expect(toDecimalString(result.difference)).toBe('-50000.00')
    expect(result.isBalanced).toBe(false)
  })

  it('melaporkan selisih lebih sebagai positif', () => {
    const result = closeCashSession({
      openingBalance: fromDecimalString('500000.00'),
      cashSales: fromDecimalString('1000000.00'),
      countedBalance: fromDecimalString('1520000.00'),
    })

    expect(toDecimalString(result.difference)).toBe('20000.00')
    expect(result.isBalanced).toBe(false)
  })

  it('tidak menyembunyikan selisih sekecil satu sen', () => {
    const result = closeCashSession({
      openingBalance: 0n,
      cashSales: fromDecimalString('100.00'),
      countedBalance: fromDecimalString('99.99'),
    })

    expect(toDecimalString(result.difference)).toBe('-0.01')
    expect(result.isBalanced).toBe(false)
  })

  it('menolak hasil hitung negatif', () => {
    expect(() =>
      closeCashSession({
        openingBalance: 0n,
        cashSales: 0n,
        countedBalance: fromDecimalString('-1.00'),
      })
    ).toThrow('Uang hasil hitung tidak boleh negatif')
  })
})

describe('sumCashSales', () => {
  it('hanya menjumlahkan transaksi tunai', () => {
    const total = sumCashSales([
      { paymentMethod: 'cash', total: fromDecimalString('100000.00') },
      { paymentMethod: 'qris', total: fromDecimalString('250000.00') },
      { paymentMethod: 'transfer', total: fromDecimalString('500000.00') },
      { paymentMethod: 'cash', total: fromDecimalString('50000.00') },
      { paymentMethod: 'card', total: fromDecimalString('75000.00') },
    ])

    expect(toDecimalString(total)).toBe('150000.00')
  })

  it('mengembalikan nol saat tidak ada transaksi tunai', () => {
    expect(sumCashSales([{ paymentMethod: 'qris', total: 100n }])).toBe(0n)
    expect(sumCashSales([])).toBe(0n)
  })
})
