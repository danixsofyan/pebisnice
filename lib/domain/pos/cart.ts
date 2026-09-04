import { ValidationError } from '@/lib/errors/app-error'
import { ZERO, multiplyByQty, percentOf, sumMoney, type Money } from '@/lib/domain/money'

export interface CartLineInput {
  productVariantId: string
  productName: string
  variantName: string | null
  sku: string | null
  qty: number
  unitPrice: Money
  /** Transaction-time HPP snapshot; computed server-side, never from the client. */
  hppAtTime: Money
}

export interface PricedCartLine extends CartLineInput {
  lineTotal: Money
  lineCogs: Money
}

export type CartDiscount =
  { type: 'none' } | { type: 'nominal'; amount: Money } | { type: 'percent'; basisPoints: number }

export interface PricedCart {
  lines: PricedCartLine[]
  subtotal: Money
  discountAmount: Money
  total: Money
  cogs: Money
  grossProfit: Money
}

function assertNotEmpty(lines: readonly CartLineInput[]): void {
  if (lines.length === 0) {
    throw new ValidationError('Keranjang tidak boleh kosong', {
      lines: ['Minimal satu item'],
    })
  }
}

function assertLine(line: CartLineInput): void {
  if (!Number.isInteger(line.qty) || line.qty <= 0) {
    throw new ValidationError(`Qty untuk ${line.productName} harus bilangan bulat positif`, {
      qty: ['Harus bilangan bulat positif'],
    })
  }
  if (line.unitPrice < ZERO) {
    throw new ValidationError(`Harga ${line.productName} tidak boleh negatif`, {
      unitPrice: ['Tidak boleh negatif'],
    })
  }
  if (line.hppAtTime < ZERO) {
    throw new ValidationError(`HPP ${line.productName} tidak boleh negatif`, {
      hppAtTime: ['Tidak boleh negatif'],
    })
  }
}

function resolveDiscount(subtotal: Money, discount: CartDiscount): Money {
  switch (discount.type) {
    case 'none':
      return ZERO

    case 'nominal':
      if (discount.amount < ZERO) {
        throw new ValidationError('Diskon tidak boleh negatif', {
          discountAmount: ['Tidak boleh negatif'],
        })
      }
      if (discount.amount > subtotal) {
        throw new ValidationError('Diskon tidak boleh melebihi subtotal', {
          discountAmount: ['Melebihi subtotal'],
        })
      }
      return discount.amount

    case 'percent':
      return percentOf(subtotal, discount.basisPoints)
  }
}

// Compute every number of one POS transaction from the cart. Pure: no database, clock, or randomness; the only place cashier money is computed.
export function priceCart(lines: readonly CartLineInput[], discount: CartDiscount): PricedCart {
  assertNotEmpty(lines)
  lines.forEach(assertLine)

  const priced: PricedCartLine[] = lines.map((line) => ({
    ...line,
    lineTotal: multiplyByQty(line.unitPrice, line.qty),
    lineCogs: multiplyByQty(line.hppAtTime, line.qty),
  }))

  const subtotal = sumMoney(priced.map((line) => line.lineTotal))
  const discountAmount = resolveDiscount(subtotal, discount)
  const total = subtotal - discountAmount
  const cogs = sumMoney(priced.map((line) => line.lineCogs))

  return {
    lines: priced,
    subtotal,
    discountAmount,
    total,
    cogs,
    grossProfit: total - cogs,
  }
}

// Change due; throws if paid is short, since an unpaid sale must not be saved.
export function calculateChange(total: Money, paidAmount: Money): Money {
  if (paidAmount < ZERO) {
    throw new ValidationError('Jumlah bayar tidak boleh negatif', {
      paidAmount: ['Tidak boleh negatif'],
    })
  }
  if (paidAmount < total) {
    throw new ValidationError('Jumlah bayar kurang dari total', {
      paidAmount: ['Kurang dari total'],
    })
  }
  return paidAmount - total
}
