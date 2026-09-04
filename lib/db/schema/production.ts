import { date, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { branches } from './branches'
import { productVariants } from './catalog'
import { actorColumns, tenantColumn } from './columns'
import { lifecycleColumns, money } from './primitives'

// One run assembling a finished good from materials. totalMaterialCost and unitCost are server-computed from the material HPP snapshot at production time, not current HPP, so historical cost doesn't shift when material HPP updates.
export const productionLogs = pgTable(
  'production_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    branchId: uuid('branch_id')
      .references(() => branches.id, { onDelete: 'restrict' })
      .notNull(),
    productVariantId: uuid('product_variant_id')
      .references(() => productVariants.id, { onDelete: 'restrict' })
      .notNull(),
    quantity: integer('quantity').notNull(),
    productionDate: date('production_date').notNull(),
    totalMaterialCost: money('total_material_cost').default('0').notNull(),
    unitCost: money('unit_cost').default('0').notNull(),
    note: text('note'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('production_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('production_branch_id_idx')
      .on(t.branchId)
      .where(sql`${t.deletedAt} is null`),
    index('production_variant_id_idx').on(t.productVariantId),
    index('production_date_idx').on(t.productionDate.desc()),
    index('production_created_by_idx').on(t.createdBy),
    index('production_updated_by_idx').on(t.updatedBy),
  ]
)

/** Materials consumed, with their HPP snapshot. */
export const productionMaterials = pgTable(
  'production_materials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    productionLogId: uuid('production_log_id')
      .references(() => productionLogs.id, { onDelete: 'cascade' })
      .notNull(),
    productVariantId: uuid('product_variant_id')
      .references(() => productVariants.id, { onDelete: 'restrict' })
      .notNull(),
    quantity: integer('quantity').notNull(),
    costAmount: money('cost_amount').default('0').notNull(),
    createdAt: lifecycleColumns.createdAt,
  },
  (t) => [
    index('production_materials_log_id_idx').on(t.productionLogId),
    index('production_materials_project_id_idx').on(t.projectId),
    index('production_materials_variant_id_idx').on(t.productVariantId),
  ]
)
