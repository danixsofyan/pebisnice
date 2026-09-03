import { boolean, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { actorColumns, tenantColumn } from './columns'
import { platformEnum } from './enums'
import { lifecycleColumns, money, tz } from './primitives'

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    platformProductId: text('platform_product_id'),
    platform: platformEnum('platform'),
    sku: text('sku'),
    name: text('name').notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('products_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('products_created_by_idx').on(t.createdBy),
    index('products_updated_by_idx').on(t.updatedBy),
    uniqueIndex('products_project_sku_unique')
      .on(t.projectId, t.sku)
      .where(sql`${t.deletedAt} is null and ${t.sku} is not null`),
  ]
)

/** HPP disimpan di level varian. Aksesnya dibatasi permission `cost:view`. */
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
