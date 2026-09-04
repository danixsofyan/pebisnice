import { describe, expect, it } from 'vitest'
import { fromDecimalString, toDecimalString } from '@/lib/domain/money'
import { calculateChange, priceCart, type CartLineInput } from '@/lib/domain/pos/cart'

function line(overrides: Partial<CartLineInput> = {}): CartLineInput {
  return {
    productVariantId: 'v1',
    productName: 'Buket Mawar',
    variantName: 'Sedang',
    sku: 'BKT-M',
    qty: 1,
    unitPrice: fromDecimalString('150000.00'),
    hppAtTime: fromDecimalString('90000.00'),
    ...overrides,
  }
}

describe('priceCart', () => {
  it('menghitung subtotal, COGS, dan laba kotor', () => {
    const cart = priceCart(
      [
        line({ qty: 2 }),
        line({
          productVariantId: 'v2',
          qty: 1,
          unitPrice: fromDecimalString('75000.00'),
          hppAtTime: fromDecimalString('40000.00'),
        }),
      ],
      { type: 'none' }
    )

    expect(toDecimalString(cart.subtotal)).toBe('375000.00')
    expect(toDecimalString(cart.discountAmount)).toBe('0.00')
    expect(toDecimalString(cart.total)).toBe('375000.00')
    expect(toDecimalString(cart.cogs)).toBe('220000.00')
    expect(toDecimalString(cart.grossProfit)).toBe('155000.00')
  })

  it('menyimpan total dan COGS per baris', () => {
    const cart = priceCart([line({ qty: 3 })], { type: 'none' })

    expect(toDecimalString(cart.lines[0]!.lineTotal)).toBe('450000.00')
    expect(toDecimalString(cart.lines[0]!.lineCogs)).toBe('270000.00')
  })

  it('menerapkan diskon nominal', () => {
    const cart = priceCart([line()], {
      type: 'nominal',
      amount: fromDecimalString('25000.00'),
    })

    expect(toDecimalString(cart.total)).toBe('125000.00')
    expect(toDecimalString(cart.grossProfit)).toBe('35000.00')
  })

  it('menerapkan diskon persen', () => {
    const cart = priceCart([line()], { type: 'percent', basisPoints: 1000 })

    expect(toDecimalString(cart.discountAmount)).toBe('15000.00')
    expect(toDecimalString(cart.total)).toBe('135000.00')
  })

  it('mengizinkan diskon sebesar subtotal', () => {
    const cart = priceCart([line()], {
      type: 'nominal',
      amount: fromDecimalString('150000.00'),
    })

    expect(toDecimalString(cart.total)).toBe('0.00')
  })

  it('menolak diskon yang melebihi subtotal', () => {
    expect(() =>
      priceCart([line()], { type: 'nominal', amount: fromDecimalString('150000.01') })
    ).toThrow('Diskon tidak boleh melebihi subtotal')
  })

  it('menolak diskon negatif', () => {
    expect(() =>
      priceCart([line()], { type: 'nominal', amount: fromDecimalString('-1.00') })
    ).toThrow('Diskon tidak boleh negatif')
  })

  it('menolak keranjang kosong', () => {
    expect(() => priceCart([], { type: 'none' })).toThrow('Keranjang tidak boleh kosong')
  })

  it('menolak qty tidak valid', () => {
    expect(() => priceCart([line({ qty: 0 })], { type: 'none' })).toThrow('Qty untuk Buket Mawar')
    expect(() => priceCart([line({ qty: -1 })], { type: 'none' })).toThrow('Qty untuk Buket Mawar')
    expect(() => priceCart([line({ qty: 1.5 })], { type: 'none' })).toThrow('Qty untuk Buket Mawar')
  })

  it('menolak harga atau HPP negatif', () => {
    expect(() =>
      priceCart([line({ unitPrice: fromDecimalString('-1.00') })], { type: 'none' })
    ).toThrow('tidak boleh negatif')
    expect(() =>
      priceCart([line({ hppAtTime: fromDecimalString('-1.00') })], { type: 'none' })
    ).toThrow('tidak boleh negatif')
  })

  it('mengizinkan laba kotor negatif bila dijual di bawah HPP', () => {
    const cart = priceCart(
      [
        line({
          unitPrice: fromDecimalString('50000.00'),
          hppAtTime: fromDecimalString('90000.00'),
        }),
      ],
      { type: 'none' }
    )

    expect(toDecimalString(cart.grossProfit)).toBe('-40000.00')
  })
})

describe('calculateChange', () => {
  it('menghitung kembalian', () => {
    const change = calculateChange(fromDecimalString('135000.00'), fromDecimalString('150000.00'))

    expect(toDecimalString(change)).toBe('15000.00')
  })

  it('mengembalikan nol saat uang pas', () => {
    expect(
      toDecimalString(calculateChange(fromDecimalString('100.00'), fromDecimalString('100.00')))
    ).toBe('0.00')
  })

  it('menolak pembayaran kurang', () => {
    expect(() => calculateChange(fromDecimalString('100.00'), fromDecimalString('99.99'))).toThrow(
      'Jumlah bayar kurang dari total'
    )
  })

  it('menolak pembayaran negatif', () => {
    expect(() => calculateChange(fromDecimalString('100.00'), fromDecimalString('-1.00'))).toThrow(
      'Jumlah bayar tidak boleh negatif'
    )
  })
})

describe('priceCart tax (PPN)', () => {
  it('adds exclusive tax on top of the post-discount base', () => {
    const cart = priceCart(
      [line({ unitPrice: fromDecimalString('100000.00') })],
      { type: 'none' },
      {
        basisPoints: 1100,
        inclusive: false,
      }
    )
    expect(toDecimalString(cart.taxAmount)).toBe('11000.00')
    expect(toDecimalString(cart.total)).toBe('111000.00')
    // profit uses revenue ex-tax
    expect(toDecimalString(cart.grossProfit)).toBe('10000.00')
  })

  it('extracts inclusive tax without changing the total', () => {
    const cart = priceCart(
      [line({ unitPrice: fromDecimalString('111000.00') })],
      { type: 'none' },
      {
        basisPoints: 1100,
        inclusive: true,
      }
    )
    expect(toDecimalString(cart.total)).toBe('111000.00')
    expect(toDecimalString(cart.taxAmount)).toBe('11000.00')
  })

  it('applies tax after discount', () => {
    const cart = priceCart(
      [line({ unitPrice: fromDecimalString('100000.00') })],
      { type: 'nominal', amount: fromDecimalString('20000.00') },
      { basisPoints: 1000, inclusive: false }
    )
    // base 80000, tax 10% = 8000, total 88000
    expect(toDecimalString(cart.taxAmount)).toBe('8000.00')
    expect(toDecimalString(cart.total)).toBe('88000.00')
  })

  it('no tax when rate is zero', () => {
    const cart = priceCart([line()], { type: 'none' })
    expect(toDecimalString(cart.taxAmount)).toBe('0.00')
  })
})
