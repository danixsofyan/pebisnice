export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'canceled' | 'refunded'

interface MidtransNotification {
  transaction_status: string
  fraud_status?: string
}

/**
 * Memetakan status Midtrans ke status pembayaran internal.
 *
 * `capture` dan `settlement` dianggap lunas — kecuali fraud_status `challenge`,
 * yang belum boleh memberi akses sampai ditinjau. Pemetaan ini murni agar bisa
 * diuji tanpa memanggil Midtrans.
 */
export function mapMidtransStatus(notification: MidtransNotification): PaymentStatus {
  const status = notification.transaction_status
  const fraud = notification.fraud_status

  if (status === 'capture') {
    return fraud === 'challenge' ? 'pending' : 'paid'
  }
  if (status === 'settlement') return 'paid'
  if (status === 'pending') return 'pending'
  if (status === 'deny') return 'failed'
  if (status === 'cancel') return 'canceled'
  if (status === 'expire') return 'expired'
  if (status === 'refund' || status === 'partial_refund') return 'refunded'
  return 'pending'
}

/** Hanya status lunas yang boleh mengaktifkan langganan. */
export function grantsAccess(status: PaymentStatus): boolean {
  return status === 'paid'
}
