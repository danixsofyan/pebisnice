import { index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { branches } from './branches'
import { productVariants } from './catalog'
import { actorColumns, tenantColumn } from './columns'
import { purchaseStatusEnum } from './enums'
import { lifecycleColumns, money, tz } from './primitives'

// Supplier directory. Contact is business info, kept plaintext for lookup.
export const suppliers = pgTable(
  'suppliers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    name: text('name').notNull(),
    // PII encrypted at rest (UU PDP), like customers; name/note stay plaintext.
    phoneEnc: text('phone_enc'),
    emailEnc: text('email_enc'),
    addressEnc: text('address_enc'),
    note: text('note'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('suppliers_project_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('suppliers_name_idx').on(t.projectId, t.name),
    index('suppliers_created_by_idx').on(t.createdBy),
    index('suppliers_updated_by_idx').on(t.updatedBy),
  ]
)

// Purchase order: goods ordered from a supplier into one branch. Receiving increments stock
// and can refresh the variant cost from the purchase price.
export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    supplierId: uuid('supplier_id')
      .references(() => suppliers.id, { onDelete: 'restrict' })
      .notNull(),
    branchId: uuid('branch_id')
      .references(() => branches.id, { onDelete: 'restrict' })
      .notNull(),
    status: purchaseStatusEnum('status').default('ordered').notNull(),
    orderDate: tz('order_date').defaultNow().notNull(),
    receivedAt: tz('received_at'),
    totalAmount: money('total_amount').default('0').notNull(),
    note: text('note'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('po_project_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('po_supplier_idx').on(t.supplierId),
    index('po_status_idx').on(t.projectId, t.status),
    index('po_created_by_idx').on(t.createdBy),
    index('po_updated_by_idx').on(t.updatedBy),
  ]
)

export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    purchaseOrderId: uuid('purchase_order_id')
      .references(() => purchaseOrders.id, { onDelete: 'cascade' })
      .notNull(),
    productVariantId: uuid('product_variant_id')
      .references(() => productVariants.id, { onDelete: 'restrict' })
      .notNull(),
    qty: integer('qty').notNull(),
    qtyReceived: integer('qty_received').default(0).notNull(),
    unitCost: money('unit_cost').notNull(),
  },
  (t) => [
    index('po_items_po_idx').on(t.purchaseOrderId),
    index('po_items_project_idx').on(t.projectId),
    index('po_items_variant_idx').on(t.productVariantId),
  ]
)
