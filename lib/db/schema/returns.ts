import { index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { branches } from './branches'
import { productVariants } from './catalog'
import { actorColumns, tenantColumn } from './columns'
import { lifecycleColumns, money } from './primitives'
import { transactions } from './sales'

// A return against a completed POS sale: restocks the returned items and records the refund.
// Partial returns are allowed; sale_return_items caps each line at what's left to return.
export const saleReturns = pgTable(
  'sale_returns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    transactionId: uuid('transaction_id')
      .references(() => transactions.id, { onDelete: 'restrict' })
      .notNull(),
    branchId: uuid('branch_id')
      .references(() => branches.id, { onDelete: 'restrict' })
      .notNull(),
    refundAmount: money('refund_amount').notNull(),
    reason: text('reason'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('returns_transaction_idx').on(t.transactionId),
    index('returns_project_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('returns_created_by_idx').on(t.createdBy),
    index('returns_updated_by_idx').on(t.updatedBy),
  ]
)

export const saleReturnItems = pgTable(
  'sale_return_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    returnId: uuid('return_id')
      .references(() => saleReturns.id, { onDelete: 'cascade' })
      .notNull(),
    productVariantId: uuid('product_variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),
    productName: text('product_name').notNull(),
    qty: integer('qty').notNull(),
    unitPrice: money('unit_price').notNull(),
  },
  (t) => [
    index('return_items_return_idx').on(t.returnId),
    index('return_items_project_idx').on(t.projectId),
    index('return_items_variant_idx').on(t.productVariantId),
  ]
)
