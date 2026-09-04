import { index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { branches } from './branches'
import { productVariants } from './catalog'
import { actorColumns, tenantColumn } from './columns'
import { lifecycleColumns } from './primitives'

// A stock move between two branches of the same project: each item decrements the source
// branch (transfer_out) and increments the destination (transfer_in) in one transaction.
export const stockTransfers = pgTable(
  'stock_transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    fromBranchId: uuid('from_branch_id')
      .references(() => branches.id, { onDelete: 'restrict' })
      .notNull(),
    toBranchId: uuid('to_branch_id')
      .references(() => branches.id, { onDelete: 'restrict' })
      .notNull(),
    note: text('note'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('transfers_project_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('transfers_from_idx').on(t.fromBranchId),
    index('transfers_to_idx').on(t.toBranchId),
    index('transfers_created_by_idx').on(t.createdBy),
    index('transfers_updated_by_idx').on(t.updatedBy),
  ]
)

export const stockTransferItems = pgTable(
  'stock_transfer_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    transferId: uuid('transfer_id')
      .references(() => stockTransfers.id, { onDelete: 'cascade' })
      .notNull(),
    productVariantId: uuid('product_variant_id')
      .references(() => productVariants.id, { onDelete: 'restrict' })
      .notNull(),
    qty: integer('qty').notNull(),
  },
  (t) => [
    index('transfer_items_transfer_idx').on(t.transferId),
    index('transfer_items_project_idx').on(t.projectId),
    index('transfer_items_variant_idx').on(t.productVariantId),
  ]
)
