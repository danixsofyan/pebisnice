const AUDIT_FIELDS = [
  'order_id',
  'transaction_id',
  'transaction_status',
  'status_code',
  'payment_type',
  'gross_amount',
  'currency',
  'fraud_status',
  'transaction_time',
  'settlement_time',
] as const

export function redactMidtransPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const kept: Record<string, unknown> = {}
  for (const field of AUDIT_FIELDS) {
    if (payload[field] !== undefined) kept[field] = payload[field]
  }
  return kept
}
