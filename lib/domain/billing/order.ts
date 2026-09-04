/**
 * Membentuk order_id Midtrans. Harus unik dan ≤ 50 karakter; hanya huruf,
 * angka, dan tanda hubung agar aman di URL dan panel Midtrans.
 *
 * Menerima waktu dan komponen acak dari pemanggil supaya bisa diuji dan tetap
 * unik lintas percobaan bayar dalam milidetik yang sama.
 */
export function buildOrderId(userId: string, nowMs: number, random: string): string {
  const user = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
  const time = nowMs.toString(36)
  const rand = random.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  return `SUB-${user}-${time}-${rand}`.slice(0, 50)
}

/**
 * Rupiah tidak berdesimal di Midtrans: gross_amount harus bilangan bulat.
 * Kolom uang kita NUMERIC(18,2), jadi "99000.00" dikonversi ke 99000.
 */
export function toMidtransAmount(decimal: string): number {
  const value = Math.round(Number(decimal))
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Jumlah tidak sah: ${decimal}`)
  }
  return value
}
