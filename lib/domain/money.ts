import { ValidationError } from '@/lib/errors/app-error'

// Money is a bigint in the smallest unit (cents). NUMERIC(18,2) exceeds Number.MAX_SAFE_INTEGER in cents, and floats are banned for rupiah.
export type Money = bigint

export const ZERO: Money = 0n

const SCALE = 100n
const DECIMAL_PATTERN = /^-?\d+(\.\d{1,2})?$/

/** Parse a NUMERIC(18,2) string into Money. */
export function fromDecimalString(value: string): Money {
  const trimmed = value.trim()
  if (!DECIMAL_PATTERN.test(trimmed)) {
    throw new ValidationError(`Nilai uang tidak valid: ${value}`, {
      amount: ['Format harus angka dengan maksimal 2 desimal'],
    })
  }

  const negative = trimmed.startsWith('-')
  const parts = trimmed.replace('-', '').split('.')
  const whole = parts[0] ?? '0'
  const fraction = parts[1] ?? ''
  const cents = BigInt(whole) * SCALE + BigInt(fraction.padEnd(2, '0'))

  return negative ? -cents : cents
}

/** Serialize Money to a NUMERIC(18,2) string. */
export function toDecimalString(value: Money): string {
  const negative = value < ZERO
  const absolute = negative ? -value : value
  const whole = absolute / SCALE
  const fraction = absolute % SCALE

  return `${negative ? '-' : ''}${whole}.${fraction.toString().padStart(2, '0')}`
}

/** Whole rupiah (no cents) to Money. */
export function fromRupiah(rupiah: number): Money {
  if (!Number.isInteger(rupiah)) {
    throw new ValidationError('Rupiah harus bilangan bulat', {
      amount: ['Harus bilangan bulat'],
    })
  }
  return BigInt(rupiah) * SCALE
}

export function multiplyByQty(amount: Money, qty: number): Money {
  if (!Number.isInteger(qty) || qty < 0) {
    throw new ValidationError('Qty harus bilangan bulat tidak negatif', {
      qty: ['Harus bilangan bulat tidak negatif'],
    })
  }
  return amount * BigInt(qty)
}

export function sumMoney(values: readonly Money[]): Money {
  return values.reduce<Money>((total, value) => total + value, ZERO)
}

// Percentages are basis points (1% = 100 bp); half-up rounding at the smallest cent.
export function percentOf(amount: Money, basisPoints: number): Money {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new ValidationError('Diskon persen harus antara 0% dan 100%', {
      discountPercent: ['Harus antara 0 dan 100'],
    })
  }

  const numerator = amount * BigInt(basisPoints)
  const denominator = 10_000n
  const quotient = numerator / denominator
  const remainder = numerator % denominator

  return remainder * 2n >= denominator ? quotient + 1n : quotient
}

export function percentToBasisPoints(percent: number): number {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new ValidationError('Diskon persen harus antara 0% dan 100%', {
      discountPercent: ['Harus antara 0 dan 100'],
    })
  }
  return Math.round(percent * 100)
}

export function isNegative(value: Money): boolean {
  return value < ZERO
}
