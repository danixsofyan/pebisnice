import { ValidationError } from '@/lib/errors/app-error'
import { ZERO, sumMoney, type Money } from '@/lib/domain/money'

export interface CashSessionClosing {
  /** Modal awal saat shift dibuka. */
  openingBalance: Money
  /** Penjualan tunai selama shift — hanya metode `cash`. */
  cashSales: Money
  /** Uang fisik yang dihitung kasir saat tutup shift. */
  countedBalance: Money
}

export interface CashSessionResult {
  expectedBalance: Money
  countedBalance: Money
  /** Positif = lebih, negatif = kurang. */
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

/**
 * Menutup shift kasir. Selisih dilaporkan apa adanya — tidak pernah
 * dibulatkan atau disembunyikan, karena justru selisih itulah sinyal yang
 * dicari owner.
 */
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

/** Menjumlahkan hanya transaksi tunai — transfer dan QRIS tidak masuk laci. */
export function sumCashSales(
  transactions: ReadonlyArray<{ paymentMethod: string; total: Money }>
): Money {
  return sumMoney(transactions.filter((tx) => tx.paymentMethod === 'cash').map((tx) => tx.total))
}
