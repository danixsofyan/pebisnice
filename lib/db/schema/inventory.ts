import { index, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { productVariants } from './catalog'
import { actorColumns, tenantColumn } from './columns'
import { movementTypeEnum } from './enums'
import { lifecycleColumns, tz } from './primitives'

/** Saldo cepat. Kebenarannya tetap `inventory_movements`. */
export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    productVariantId: uuid('product_variant_id')
      .references(() => productVariants.id, { onDelete: 'cascade' })
      .notNull(),
    stockQty: integer('stock_qty').default(0).notNull(),
    lastOpnameDate: tz('last_opname_date'),
    lastOpnameQty: integer('last_opname_qty'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('inventory_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('inventory_created_by_idx').on(t.createdBy),
    index('inventory_updated_by_idx').on(t.updatedBy),
    uniqueIndex('inventory_variant_unique')
      .on(t.productVariantId)
      .where(sql`${t.deletedAt} is null`),
  ]
)

/** Append-only. Trigger `fn_prevent_mutation()` menolak UPDATE dan DELETE. */
export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    productVariantId: uuid('product_variant_id')
      .references(() => productVariants.id, { onDelete: 'cascade' })
      .notNull(),
    movementType: movementTypeEnum('movement_type').notNull(),
    qty: integer('qty').notNull(),
    quantityAfter: integer('quantity_after').notNull(),
    referenceId: text('reference_id'),
    note: text('note'),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('movements_variant_id_idx').on(t.productVariantId),
    index('movements_project_id_idx').on(t.projectId),
    index('movements_created_by_idx').on(t.createdBy),
    index('movements_created_at_idx').on(t.createdAt.desc()),
  ]
)
