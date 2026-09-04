import { ValidationError } from '@/lib/errors/app-error'
import { ZERO, sumMoney, type Money } from '@/lib/domain/money'

export interface CashSessionClosing {
  /** Opening float when the shift starts. */
  openingBalance: Money
  /** Cash sales during the shift; cash method only. */
  cashSales: Money
  /** Physical cash counted at close. */
  countedBalance: Money
}

export interface CashSessionResult {
  expectedBalance: Money
  countedBalance: Money
  /** Positive = over, negative = short. */
  difference: Money
  isBalanced: boolean
}

export function calculateExpectedBalance(openingBalance: Money, cashSales: Money): Money {
  if (openingBalance < ZERO) {
    throw new ValidationError('Modal awal tidak boleh negatif', {
      openingBalance: ['Tidak boleh negatif'],
    })
  }
  if (cashSales < ZERO) {
    throw new ValidationError('Penjualan tunai tidak boleh negatif', {
      cashSales: ['Tidak boleh negatif'],
    })
  }
  return openingBalance + cashSales
}

// Close a cashier shift. The difference is reported as-is, never rounded or hidden, since that difference is the signal owners look for.
export function closeCashSession(input: CashSessionClosing): CashSessionResult {
  if (input.countedBalance < ZERO) {
    throw new ValidationError('Uang hasil hitung tidak boleh negatif', {
      countedBalance: ['Tidak boleh negatif'],
    })
  }

  const expectedBalance = calculateExpectedBalance(input.openingBalance, input.cashSales)
  const difference = input.countedBalance - expectedBalance

  return {
    expectedBalance,
    countedBalance: input.countedBalance,
    difference,
    isBalanced: difference === ZERO,
  }
}

// Sums cash transactions only; transfer and QRIS never hit the drawer.
export function sumCashSales(
  transactions: ReadonlyArray<{ paymentMethod: string; total: Money }>
): Money {
  return sumMoney(transactions.filter((tx) => tx.paymentMethod === 'cash').map((tx) => tx.total))
}
