import { describe, expect, it } from 'vitest'
import {
  ZERO,
  fromDecimalString,
  fromRupiah,
  multiplyByQty,
  percentOf,
  percentToBasisPoints,
  sumMoney,
  toDecimalString,
} from '@/lib/domain/money'

describe('konversi Money', () => {
  it('membaca string NUMERIC(18,2) menjadi sen', () => {
    expect(fromDecimalString('12500.00')).toBe(1250000n)
    expect(fromDecimalString('0.01')).toBe(1n)
    expect(fromDecimalString('0.1')).toBe(10n)
    expect(fromDecimalString('100')).toBe(10000n)
    expect(fromDecimalString('-250.50')).toBe(-25050n)
  })

  it('menulis kembali ke format kolom NUMERIC(18,2)', () => {
    expect(toDecimalString(1250000n)).toBe('12500.00')
    expect(toDecimalString(1n)).toBe('0.01')
    expect(toDecimalString(ZERO)).toBe('0.00')
    expect(toDecimalString(-25050n)).toBe('-250.50')
  })

  it('bolak-balik tanpa kehilangan presisi pada nilai terbesar NUMERIC(18,2)', () => {
    const max = '9999999999999999.99'

    expect(toDecimalString(fromDecimalString(max))).toBe(max)
  })

  it('menangani nilai yang melewati Number.MAX_SAFE_INTEGER', () => {
    const huge = fromDecimalString('90071992547409.92')

    expect(huge).toBe(9007199254740992n)
    expect(toDecimalString(huge + 1n)).toBe('90071992547409.93')
  })

  it('menolak format yang tidak valid', () => {
    for (const bad of ['', 'abc', '1.234', '1,5', '1e3', ' 1.0.0 ']) {
      expect(() => fromDecimalString(bad), bad).toThrow('Nilai uang tidak valid')
    }
  })

  it('mengubah rupiah bulat menjadi sen', () => {
    expect(fromRupiah(12500)).toBe(1250000n)
    expect(() => fromRupiah(1.5)).toThrow('Rupiah harus bilangan bulat')
  })
})

describe('aritmetika Money', () => {
  it('mengalikan dengan qty tanpa float', () => {
    expect(multiplyByQty(fromDecimalString('0.10'), 3)).toBe(30n)
    expect(toDecimalString(multiplyByQty(fromDecimalString('19999.99'), 7))).toBe('139999.93')
  })

  it('menolak qty tidak valid', () => {
    expect(() => multiplyByQty(100n, -1)).toThrow('Qty harus bilangan')
    expect(() => multiplyByQty(100n, 1.5)).toThrow('Qty harus bilangan')
  })

  it('menjumlahkan tanpa akumulasi galat', () => {
    const tenCents = Array.from({ length: 10 }, () => fromDecimalString('0.10'))

    expect(toDecimalString(sumMoney(tenCents))).toBe('1.00')
    expect(sumMoney([])).toBe(ZERO)
  })
})

describe('diskon persen', () => {
  it('menghitung persen dari nominal', () => {
    expect(toDecimalString(percentOf(fromDecimalString('100.00'), 1000))).toBe('10.00')
    expect(toDecimalString(percentOf(fromDecimalString('12500.00'), 1500))).toBe('1875.00')
    expect(percentOf(1000n, 0)).toBe(ZERO)
    expect(percentOf(1000n, 10_000)).toBe(1000n)
  })

  it('membulatkan half-up pada sen terkecil', () => {
    // 5 sen * 50% = 2,5 sen -> 3 sen
    expect(percentOf(5n, 5000)).toBe(3n)
    // 3 sen * 50% = 1,5 sen -> 2 sen
    expect(percentOf(3n, 5000)).toBe(2n)
    // 1 sen * 33,33% = 0,3333 sen -> 0 sen
    expect(percentOf(1n, 3333)).toBe(ZERO)
  })

  it('menolak persen di luar 0-100', () => {
    expect(() => percentOf(1000n, -1)).toThrow('antara 0% dan 100%')
    expect(() => percentOf(1000n, 10_001)).toThrow('antara 0% dan 100%')
  })

  it('mengubah persen desimal menjadi basis point', () => {
    expect(percentToBasisPoints(10)).toBe(1000)
    expect(percentToBasisPoints(12.5)).toBe(1250)
    expect(percentToBasisPoints(0)).toBe(0)
    expect(percentToBasisPoints(100)).toBe(10_000)
    expect(() => percentToBasisPoints(101)).toThrow('antara 0% dan 100%')
  })
})
