import { index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { branches } from './branches'
import { cashSessions } from './cash-sessions'
import { productVariants } from './catalog'
import { customers } from './customers'
import { stores } from './channels'
import { actorColumns, tenantColumn } from './columns'
import { feeTypeEnum, orderStatusEnum, paymentMethodEnum, salesChannelEnum } from './enums'
import { lifecycleColumns, money, tz } from './primitives'

// One table for two sales channels. marketplace fills store_id; pos fills branch_id and cash_session_id. A migration CHECK enforces the right pairing so half-formed rows can't be stored.
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    channel: salesChannelEnum('channel').default('marketplace').notNull(),
    storeId: uuid('store_id').references(() => stores.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'restrict' }),
    cashSessionId: uuid('cash_session_id').references(() => cashSessions.id, {
      onDelete: 'restrict',
    }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    paymentMethod: paymentMethodEnum('payment_method'),
    orderId: text('order_id').notNull(),
    orderDate: tz('order_date').notNull(),
    settlementDate: tz('settlement_date'),
    status: orderStatusEnum('status').notNull(),
    grossAmount: money('gross_amount').notNull(),
    discountAmount: money('discount_amount').default('0').notNull(),
    netAmount: money('net_amount').notNull(),
    totalFees: money('total_fees').default('0').notNull(),
    paidAmount: money('paid_amount'),
    changeAmount: money('change_amount'),
    voidedAt: tz('voided_at'),
    voidedBy: text('voided_by').references(() => users.id, { onDelete: 'set null' }),
    voidReason: text('void_reason'),
    rawData: jsonb('raw_data'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('tx_store_id_idx')
      .on(t.storeId)
      .where(sql`${t.deletedAt} is null`),
    index('tx_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('tx_order_date_idx').on(t.orderDate.desc()),
    index('tx_settlement_date_idx').on(t.settlementDate.desc()),
    index('tx_channel_idx')
      .on(t.projectId, t.channel)
      .where(sql`${t.deletedAt} is null`),
    index('tx_branch_id_idx')
      .on(t.branchId)
      .where(sql`${t.deletedAt} is null`),
    index('tx_cash_session_id_idx').on(t.cashSessionId),
    index('tx_voided_by_idx').on(t.voidedBy),
    index('tx_created_by_idx').on(t.createdBy),
    index('tx_updated_by_idx').on(t.updatedBy),
    uniqueIndex('tx_store_order_unique')
      .on(t.storeId, t.orderId)
      .where(sql`${t.deletedAt} is null and ${t.storeId} is not null`),
    uniqueIndex('tx_project_order_unique')
      .on(t.projectId, t.orderId)
      .where(sql`${t.deletedAt} is null and ${t.channel} = 'pos'`),
  ]
)

export const transactionFees = pgTable(
  'transaction_fees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    transactionId: uuid('transaction_id')
      .references(() => transactions.id, { onDelete: 'cascade' })
      .notNull(),
    feeType: feeTypeEnum('fee_type').notNull(),
    label: text('label').notNull(),
    amount: money('amount').notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [index('fees_tx_id_idx').on(t.transactionId), index('fees_project_id_idx').on(t.projectId)]
)

/** hppAtTime is the HPP snapshot at transaction time, the basis for historical COGS. */
export const transactionItems = pgTable(
  'transaction_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    transactionId: uuid('transaction_id')
      .references(() => transactions.id, { onDelete: 'cascade' })
      .notNull(),
    productVariantId: uuid('product_variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),
    productName: text('product_name').notNull(),
    variantName: text('variant_name'),
    sku: text('sku'),
    qty: integer('qty').notNull(),
    unitPrice: money('unit_price').notNull(),
    hppAtTime: money('hpp_at_time').default('0').notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('items_tx_id_idx').on(t.transactionId),
    index('items_project_id_idx').on(t.projectId),
    index('items_variant_id_idx').on(t.productVariantId),
  ]
)
