/**
 * Klien Snap Midtrans, mode redirect.
 *
 * Kami tidak memuat snap.js di klien: server membuat transaksi lalu browser
 * diarahkan ke halaman pembayaran Midtrans. Ini menghindari kerumitan CSP
 * (skrip & iframe pihak ketiga) dan membuat webhook tetap menjadi satu-satunya
 * sumber kebenaran status.
 *
 * Konfigurasi dibaca malas agar satu env yang belum diisi tidak menggagalkan
 * build seluruh aplikasi — hanya alur pembayaran yang gagal, dengan pesan jelas.
 */

interface MidtransConfig {
  serverKey: string
  isProduction: boolean
}

let cached: MidtransConfig | null = null

function readConfig(): MidtransConfig {
  if (cached) return cached

  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey) {
    throw new Error('Pembayaran belum dikonfigurasi: MIDTRANS_SERVER_KEY belum diisi')
  }

  cached = {
    serverKey,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  }
  return cached
}

function snapBaseUrl(isProduction: boolean): string {
  return isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'
}

export interface SnapItem {
  id: string
  price: number
  quantity: number
  name: string
}

export interface CreateSnapInput {
  orderId: string
  grossAmount: number
  item: SnapItem
  customer: { firstName?: string; email?: string }
  finishUrl: string
  /** Diberitahukan ke Midtrans sebagai URL notifikasi untuk transaksi ini. */
  notificationUrl?: string
  enabledPayments?: string[]
}

export interface SnapTransaction {
  token: string
  redirectUrl: string
}

/**
 * Membuat transaksi Snap dan mengembalikan URL redirect.
 *
 * `gross_amount` harus sama dengan harga item dikalikan jumlahnya, kalau tidak
 * Midtrans menolak. `X-Override-Notification` mengarahkan webhook ke lingkungan
 * ini tanpa bergantung pada satu setelan dashboard.
 */
export async function createSnapTransaction(input: CreateSnapInput): Promise<SnapTransaction> {
  const config = readConfig()
  const auth = Buffer.from(`${config.serverKey}:`).toString('base64')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Basic ${auth}`,
  }
  if (input.notificationUrl) {
    headers['X-Override-Notification'] = input.notificationUrl
  }

  const body = {
    transaction_details: {
      order_id: input.orderId,
      gross_amount: input.grossAmount,
    },
    item_details: [input.item],
    customer_details: {
      first_name: input.customer.firstName,
      email: input.customer.email,
    },
    callbacks: {
      finish: input.finishUrl,
    },
    ...(input.enabledPayments ? { enabled_payments: input.enabledPayments } : {}),
  }

  const response = await fetch(snapBaseUrl(config.isProduction), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = (await response.json()) as {
    token?: string
    redirect_url?: string
    error_messages?: string[]
  }

  if (!response.ok || !data.token || !data.redirect_url) {
    const detail = data.error_messages?.join('; ') ?? `HTTP ${response.status}`
    throw new Error(`Midtrans menolak transaksi: ${detail}`)
  }

  return { token: data.token, redirectUrl: data.redirect_url }
}

/** Metode yang ditawarkan di halaman Snap. QRIS dan Virtual Account bank. */
export const ENABLED_PAYMENTS = [
  'other_qris',
  'bca_va',
  'bni_va',
  'bri_va',
  'permata_va',
  'other_va',
]
