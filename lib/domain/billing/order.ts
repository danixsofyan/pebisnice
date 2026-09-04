// Build a Midtrans order_id: unique, <=50 chars, url- and panel-safe. Time and randomness come from the caller for testability.
export function buildOrderId(userId: string, nowMs: number, random: string): string {
  const user = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
  const time = nowMs.toString(36)
  const rand = random.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  return `SUB-${user}-${time}-${rand}`.slice(0, 50)
}

// Midtrans amounts are whole rupiah; convert our NUMERIC(18,2) "99000.00" to 99000.
export function toMidtransAmount(decimal: string): number {
  const value = Math.round(Number(decimal))
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Jumlah tidak sah: ${decimal}`)
  }
  return value
}
