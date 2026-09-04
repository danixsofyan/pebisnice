import crypto from 'crypto'
import { and, eq, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subscriptionPayments } from '@/lib/db/schema'
import { subscriptionService } from '@/lib/services/subscription.service'
import { buildOrderId, toMidtransAmount } from '@/lib/domain/billing/order'
import { mapMidtransStatus } from '@/lib/domain/billing/midtrans-status'
import { verifyMidtransSignature } from '@/lib/security/midtrans-signature'
import { createSnapTransaction, ENABLED_PAYMENTS } from '@/lib/payments/midtrans'
import { ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

export interface CheckoutInput {
  userId: string
  planId: string
  customer: { firstName?: string; email?: string }
  finishUrl: string
  notificationUrl: string
}

export interface CheckoutResult {
  orderId: string
  redirectUrl: string
}

export type NotificationOutcome =
  { ok: true; status: string } | { ok: false; reason: 'signature' | 'unknown_order' | 'amount' }

interface RawNotification {
  order_id?: string
  status_code?: string
  gross_amount?: string
  signature_key?: string
  transaction_status?: string
  fraud_status?: string
  payment_type?: string
  transaction_id?: string
}

export class SubscriptionPaymentService {
  /**
   * Membuat transaksi Snap untuk paket berbayar dan mengembalikan URL redirect.
   * Baris pembayaran disimpan hanya setelah Snap memberi token, sehingga tidak
   * ada baris pending yatim bila Midtrans menolak.
   */
  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const plan = await subscriptionService.getPlan(input.planId)
    if (!plan) throw new ValidationError('Paket tidak ditemukan')
    if (plan.interval === 'trial') {
      throw new ValidationError('Paket trial tidak lewat pembayaran')
    }

    const amount = toMidtransAmount(plan.price)
    const orderId = buildOrderId(input.userId, Date.now(), crypto.randomUUID())

    const snap = await createSnapTransaction({
      orderId,
      grossAmount: amount,
      item: { id: plan.code, price: amount, quantity: 1, name: plan.name },
      customer: input.customer,
      finishUrl: input.finishUrl,
      notificationUrl: input.notificationUrl,
      enabledPayments: ENABLED_PAYMENTS,
    })

    await db.insert(subscriptionPayments).values({
      userId: input.userId,
      planId: plan.id,
      orderId,
      grossAmount: plan.price,
      status: 'pending',
      snapToken: snap.token,
      snapRedirectUrl: snap.redirectUrl,
    })

    logger.info({ userId: input.userId, orderId, planId: plan.id }, 'checkout created')
    return { orderId, redirectUrl: snap.redirectUrl }
  }

  /**
   * Memproses notifikasi Midtrans. Sumber kebenaran status pembayaran.
   *
   * Tanda tangan diverifikasi lebih dulu; jumlah dicocokkan dengan yang kami
   * simpan agar notifikasi yang jumlahnya diubah ditolak. Transisi ke "lunas"
   * dibuat atomik lewat update bersyarat, sehingga notifikasi ganda tidak
   * mengaktifkan langganan dua kali.
   */
  async handleNotification(payload: RawNotification): Promise<NotificationOutcome> {
    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY belum diisi')

    const orderId = payload.order_id ?? ''
    const valid = verifyMidtransSignature({
      orderId,
      statusCode: payload.status_code ?? '',
      grossAmount: payload.gross_amount ?? '',
      serverKey,
      signatureKey: payload.signature_key ?? '',
    })
    if (!valid) {
      logger.warn({ orderId }, 'midtrans signature invalid')
      return { ok: false, reason: 'signature' }
    }

    const rows = await db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.orderId, orderId))
      .limit(1)
    const payment = rows[0]
    if (!payment) return { ok: false, reason: 'unknown_order' }

    if (toMidtransAmount(payment.grossAmount) !== toMidtransAmount(payload.gross_amount ?? '0')) {
      logger.warn({ orderId }, 'midtrans amount mismatch')
      return { ok: false, reason: 'amount' }
    }

    const status = mapMidtransStatus({
      transaction_status: payload.transaction_status ?? '',
      ...(payload.fraud_status ? { fraud_status: payload.fraud_status } : {}),
    })

    const common = {
      paymentType: payload.payment_type ?? null,
      midtransTransactionId: payload.transaction_id ?? null,
      fraudStatus: payload.fraud_status ?? null,
      raw: payload as Record<string, unknown>,
    }

    if (status === 'paid') {
      // Menang transisi hanya bila sebelumnya belum lunas — jaga idempotensi.
      const won = await db
        .update(subscriptionPayments)
        .set({ ...common, status: 'paid', paidAt: new Date() })
        .where(
          and(eq(subscriptionPayments.id, payment.id), ne(subscriptionPayments.status, 'paid'))
        )
        .returning({ id: subscriptionPayments.id })

      if (won[0]) {
        const activated = await subscriptionService.activatePaidPlan(payment.userId, payment.planId)
        await db
          .update(subscriptionPayments)
          .set({ subscriptionId: activated.subscription.id })
          .where(eq(subscriptionPayments.id, payment.id))
        logger.info({ orderId, userId: payment.userId }, 'payment settled, subscription active')
      }
      return { ok: true, status }
    }

    // Status bukan-lunas tidak boleh menimpa pembayaran yang sudah lunas.
    await db
      .update(subscriptionPayments)
      .set({ ...common, status })
      .where(and(eq(subscriptionPayments.id, payment.id), ne(subscriptionPayments.status, 'paid')))

    logger.info({ orderId, status }, 'payment notification recorded')
    return { ok: true, status }
  }

  /** Ada pembayaran yang masih menunggu konfirmasi untuk pengguna ini? */
  async hasPendingPayment(userId: string): Promise<boolean> {
    const rows = await db
      .select({ id: subscriptionPayments.id })
      .from(subscriptionPayments)
      .where(
        and(eq(subscriptionPayments.userId, userId), eq(subscriptionPayments.status, 'pending'))
      )
      .limit(1)
    return rows.length > 0
  }
}

export const subscriptionPaymentService = new SubscriptionPaymentService()
