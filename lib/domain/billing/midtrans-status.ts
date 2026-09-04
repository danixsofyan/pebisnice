export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'canceled' | 'refunded'

interface MidtransNotification {
  transaction_status: string
  fraud_status?: string
}

// Map Midtrans status to our payment status; capture/settlement count as paid unless fraud_status is 'challenge'. Pure, testable.
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

// Only a paid status may activate a subscription.
export function grantsAccess(status: PaymentStatus): boolean {
  return status === 'paid'
}
