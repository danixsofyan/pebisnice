import { index, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { branches } from './branches'
import { productVariants } from './catalog'
import { tenantColumn } from './columns'
import { projects } from './projects'
import { onlineOrderStatusEnum } from './enums'
import { lifecycleColumns, money, tz } from './primitives'
import { transactions } from './sales'

// Short public slug -> project/branch for the order link. Resolved before any tenant is known,
// so it is granted app_full_access (not tenant RLS), like the account/discovery tables. Holds
// only opaque ids, no business data.
export const orderLinks = pgTable(
  'order_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    branchId: uuid('branch_id')
      .references(() => branches.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('order_links_slug_idx').on(t.slug),
    uniqueIndex('order_links_branch_idx').on(t.branchId),
  ]
)

// A self-service order placed via the public WhatsApp order link (no login). It holds no stock
// until staff accept it, which converts it to a POS sale. Customer phone is encrypted (UU PDP).
export const onlineOrders = pgTable(
  'online_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    branchId: uuid('branch_id')
      .references(() => branches.id, { onDelete: 'restrict' })
      .notNull(),
    customerName: text('customer_name').notNull(),
    customerPhoneEnc: text('customer_phone_enc'),
    status: onlineOrderStatusEnum('status').default('pending').notNull(),
    totalAmount: money('total_amount').default('0').notNull(),
    note: text('note'),
    // Set when accepted: the POS transaction this order became.
    transactionId: uuid('transaction_id').references(() => transactions.id, {
      onDelete: 'set null',
    }),
    ...lifecycleColumns,
  },
  (t) => [
    index('online_orders_project_status_idx')
      .on(t.projectId, t.status)
      .where(sql`${t.deletedAt} is null`),
    index('online_orders_branch_idx').on(t.branchId),
  ]
)

export const onlineOrderItems = pgTable(
  'online_order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    orderId: uuid('order_id')
      .references(() => onlineOrders.id, { onDelete: 'cascade' })
      .notNull(),
    productVariantId: uuid('product_variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),
    productName: text('product_name').notNull(),
    qty: integer('qty').notNull(),
    unitPrice: money('unit_price').notNull(),
  },
  (t) => [
    index('online_order_items_order_idx').on(t.orderId),
    index('online_order_items_project_idx').on(t.projectId),
  ]
)
