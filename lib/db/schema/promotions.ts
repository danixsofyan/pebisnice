import { index, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { actorColumns, tenantColumn } from './columns'
import { promoTypeEnum } from './enums'
import { lifecycleColumns, money, tz } from './primitives'

// A voucher code applied at POS. percent uses percent_basis_points (capped by max_discount);
// nominal uses amount. used_count is bumped atomically on redemption, bounded by usage_limit.
export const promotions = pgTable(
  'promotions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    code: text('code').notNull(),
    name: text('name').notNull(),
    discountType: promoTypeEnum('discount_type').notNull(),
    percentBasisPoints: integer('percent_basis_points').default(0).notNull(),
    amount: money('amount').default('0').notNull(),
    minSpend: money('min_spend').default('0').notNull(),
    maxDiscount: money('max_discount'),
    startsAt: tz('starts_at'),
    endsAt: tz('ends_at'),
    usageLimit: integer('usage_limit'),
    usedCount: integer('used_count').default(0).notNull(),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    uniqueIndex('promotions_code_idx')
      .on(t.projectId, t.code)
      .where(sql`${t.deletedAt} is null`),
    index('promotions_project_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('promotions_created_by_idx').on(t.createdBy),
    index('promotions_updated_by_idx').on(t.updatedBy),
  ]
)

export type Promotion = typeof promotions.$inferSelect
