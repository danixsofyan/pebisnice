import { index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { planIntervalEnum, paymentStatusEnum, subscriptionStatusEnum } from './enums'
import { lifecycleColumns, money, tz } from './primitives'

/**
 * Paket langganan. Harga, jenis, dan lama trial semuanya baris data — supaya
 * bisa diubah tanpa deploy. Sengaja tidak dilindungi RLS: dibaca sebelum tenant
 * ditentukan, sama seperti `projects`.
 */
export const plans = pgTable(
  'plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    interval: planIntervalEnum('interval').notNull(),
    /** Harga sekali tagih untuk satu periode. 0 untuk trial. */
    price: money('price').default('0').notNull(),
    /** Hanya untuk paket trial: lama masa coba dalam hari. */
    trialDays: integer('trial_days'),
    sortOrder: integer('sort_order').default(0).notNull(),
    ...lifecycleColumns,
  },
  (t) => [
    uniqueIndex('plans_code_unique')
      .on(t.code)
      .where(sql`${t.deletedAt} is null`),
    index('plans_active_idx')
      .on(t.isActive, t.sortOrder)
      .where(sql`${t.deletedAt} is null`),
  ]
)

/**
 * Langganan level akun — satu baris per user, merekam keadaan terkini.
 * Riwayat transaksi ada di `subscription_payments`.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    planId: uuid('plan_id')
      .references(() => plans.id, { onDelete: 'restrict' })
      .notNull(),
    status: subscriptionStatusEnum('status').notNull(),
    currentPeriodStart: tz('current_period_start').notNull(),
    currentPeriodEnd: tz('current_period_end').notNull(),
    canceledAt: tz('canceled_at'),
    ...lifecycleColumns,
  },
  (t) => [
    uniqueIndex('subscriptions_user_unique')
      .on(t.userId)
      .where(sql`${t.deletedAt} is null`),
    index('subscriptions_status_idx').on(t.status),
    index('subscriptions_period_end_idx').on(t.currentPeriodEnd),
  ]
)

/**
 * Satu upaya bayar lewat Midtrans. `order_id` yang kita bangkitkan jadi jangkar
 * idempotensi webhook, dan `raw` menyimpan payload notifikasi terakhir untuk
 * audit bila terjadi sengketa.
 */
export const subscriptionPayments = pgTable(
  'subscription_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, {
      onDelete: 'set null',
    }),
    planId: uuid('plan_id')
      .references(() => plans.id, { onDelete: 'restrict' })
      .notNull(),
    orderId: text('order_id').notNull(),
    grossAmount: money('gross_amount').notNull(),
    status: paymentStatusEnum('status').default('pending').notNull(),
    paymentType: text('payment_type'),
    snapToken: text('snap_token'),
    snapRedirectUrl: text('snap_redirect_url'),
    midtransTransactionId: text('midtrans_transaction_id'),
    fraudStatus: text('fraud_status'),
    raw: jsonb('raw'),
    paidAt: tz('paid_at'),
    ...lifecycleColumns,
  },
  (t) => [
    uniqueIndex('subscription_payments_order_id_unique').on(t.orderId),
    index('subscription_payments_user_idx')
      .on(t.userId)
      .where(sql`${t.deletedAt} is null`),
    index('subscription_payments_status_idx').on(t.status),
  ]
)
