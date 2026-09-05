import { boolean, index, integer, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { calcMethodEnum } from './enums'
import { lifecycleColumns } from './primitives'

// Tenant. Deliberately not RLS-protected because it must be read before the active tenant is known.
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    currency: varchar('currency', { length: 3 }).default('IDR').notNull(),
    timezone: text('timezone').default('Asia/Jakarta').notNull(),
    // PPN rate in basis points (1100 = 11%); 0 disables tax. taxInclusive means listed prices already include it.
    taxRateBasisPoints: integer('tax_rate_basis_points').default(0).notNull(),
    taxInclusive: boolean('tax_inclusive').default(false).notNull(),
    // Loyalty program. earn_rate = rupiah of net sale per 1 point earned (0 disables earning);
    // redeem_value = rupiah discount per 1 point spent (0 disables redemption).
    loyaltyEnabled: boolean('loyalty_enabled').default(false).notNull(),
    loyaltyEarnRate: integer('loyalty_earn_rate').default(0).notNull(),
    loyaltyRedeemValue: integer('loyalty_redeem_value').default(0).notNull(),
    // Merchant WhatsApp number (E.164 digits, e.g. 628123…) for the public order link hand-off.
    waNumber: text('wa_number'),
    defaultCalcMethod: calcMethodEnum('default_calc_method').default('income_based').notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...lifecycleColumns,
  },
  (t) => [
    index('projects_user_id_idx')
      .on(t.userId)
      .where(sql`${t.deletedAt} is null`),
    index('projects_created_by_idx').on(t.createdBy),
    index('projects_updated_by_idx').on(t.updatedBy),
  ]
)
