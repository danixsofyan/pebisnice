import { boolean, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { actorColumns, tenantColumn } from './columns'
import { users } from './auth'
import { platformEnum, productTypeEnum } from './enums'
import { lifecycleColumns, money, tz } from './primitives'

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    type: productTypeEnum('type').default('finished').notNull(),
    platformProductId: text('platform_product_id'),
    platform: platformEnum('platform'),
    sku: text('sku'),
    name: text('name').notNull(),
    // Photo object key in the private bucket, <projectId>/products/<id>.<ext>. Not a URL: files are read only via the tenant-scoped proxy.
    imageKey: text('image_key'),
    isArchived: boolean('is_archived').default(false).notNull(),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('products_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('products_type_idx')
      .on(t.projectId, t.type)
      .where(sql`${t.deletedAt} is null`),
    index('products_created_by_idx').on(t.createdBy),
    index('products_updated_by_idx').on(t.updatedBy),
    uniqueIndex('products_project_sku_unique')
      .on(t.projectId, t.sku)
      .where(sql`${t.deletedAt} is null and ${t.sku} is not null`),
  ]
)

/** HPP is stored at variant level; access is gated by cost:view. */
export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    productId: uuid('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    platformVariantId: text('platform_variant_id'),
    skuVariant: text('sku_variant'),
    variantName: text('variant_name'),
    hpp: money('hpp').default('0').notNull(),
    hppUpdatedAt: tz('hpp_updated_at').defaultNow(),
    // Default sell price, shown on the public order link and used as the POS default.
    price: money('price').default('0').notNull(),
    // Piece-rate wage paid to the production worker per unit made (upah borongan).
    productionWage: money('production_wage').default('0').notNull(),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('variants_product_id_idx')
      .on(t.productId)
      .where(sql`${t.deletedAt} is null`),
    index('variants_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('variants_created_by_idx').on(t.createdBy),
    index('variants_updated_by_idx').on(t.updatedBy),
  ]
)

// Append-only log of every HPP (cost) change, so past values and their effective dates are auditable. Reports read hpp_at_time on the sale line, not this; this is the change history and analytics source.
export const productCostHistory = pgTable(
  'product_cost_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    productVariantId: uuid('product_variant_id')
      .references(() => productVariants.id, { onDelete: 'cascade' })
      .notNull(),
    cost: money('cost').notNull(),
    previousCost: money('previous_cost'),
    effectiveFrom: tz('effective_from').defaultNow().notNull(),
    changedBy: text('changed_by').references(() => users.id, { onDelete: 'set null' }),
    note: text('note'),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('cost_history_variant_idx').on(t.productVariantId, t.effectiveFrom),
    index('cost_history_project_idx').on(t.projectId),
    index('cost_history_changed_by_idx').on(t.changedBy),
  ]
)
