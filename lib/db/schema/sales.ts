import { index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { productVariants } from './catalog'
import { stores } from './channels'
import { actorColumns, tenantColumn } from './columns'
import { feeTypeEnum, orderStatusEnum } from './enums'
import { lifecycleColumns, money, tz } from './primitives'

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    storeId: uuid('store_id')
      .references(() => stores.id, { onDelete: 'cascade' })
      .notNull(),
    orderId: text('order_id').notNull(),
    orderDate: tz('order_date').notNull(),
    settlementDate: tz('settlement_date'),
    status: orderStatusEnum('status').notNull(),
    grossAmount: money('gross_amount').notNull(),
    discountAmount: money('discount_amount').default('0').notNull(),
    netAmount: money('net_amount').notNull(),
    totalFees: money('total_fees').default('0').notNull(),
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
    index('tx_created_by_idx').on(t.createdBy),
    index('tx_updated_by_idx').on(t.updatedBy),
    uniqueIndex('tx_store_order_unique')
      .on(t.storeId, t.orderId)
      .where(sql`${t.deletedAt} is null`),
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

/** `hppAtTime` adalah snapshot HPP saat transaksi terjadi — dasar COGS historis. */
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
