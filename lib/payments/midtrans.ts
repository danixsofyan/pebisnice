// Midtrans Snap client, redirect mode. We don't load snap.js on the client: the server creates the transaction and the browser is sent to Midtrans, avoiding CSP complexity (third-party script and iframe) and keeping the webhook the single source of truth. Config is read lazily so one missing env fails only the payment flow, with a clear message, not the whole build.

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
  /** Told to Midtrans as this transaction's notification URL. */
  notificationUrl?: string
  enabledPayments?: string[]
}

export interface SnapTransaction {
  token: string
  redirectUrl: string
}

// Create a Snap transaction and return the redirect URL. gross_amount must equal item price times quantity or Midtrans rejects it. X-Override-Notification points the webhook at this environment without depending on one dashboard setting.
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

/** Methods offered on the Snap page: QRIS and bank Virtual Account. */
export const ENABLED_PAYMENTS = [
  'other_qris',
  'bca_va',
  'bni_va',
  'bri_va',
  'permata_va',
  'other_va',
]
