import { boolean, index, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core'
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
