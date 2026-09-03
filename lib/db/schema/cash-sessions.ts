import { index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './auth'
import { branches } from './branches'
import { actorColumns, tenantColumn } from './columns'
import { cashSessionStatusEnum } from './enums'
import { lifecycleColumns, money, tz } from './primitives'

/**
 * Shift kasir. Satu cabang hanya boleh punya satu sesi terbuka pada satu
 * waktu — ditegakkan partial unique index, bukan hanya oleh kode.
 */
export const cashSessions = pgTable(
  'cash_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    branchId: uuid('branch_id')
      .references(() => branches.id, { onDelete: 'restrict' })
      .notNull(),
    status: cashSessionStatusEnum('status').default('open').notNull(),
    openedBy: text('opened_by')
      .references(() => users.id, { onDelete: 'set null' })
      .notNull(),
    openedAt: tz('opened_at').defaultNow().notNull(),
    openingBalance: money('opening_balance').default('0').notNull(),
    closedBy: text('closed_by').references(() => users.id, { onDelete: 'set null' }),
    closedAt: tz('closed_at'),
    expectedBalance: money('expected_balance'),
    countedBalance: money('counted_balance'),
    difference: money('difference'),
    note: text('note'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('cash_sessions_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('cash_sessions_branch_id_idx')
      .on(t.branchId)
      .where(sql`${t.deletedAt} is null`),
    index('cash_sessions_opened_by_idx').on(t.openedBy),
    index('cash_sessions_closed_by_idx').on(t.closedBy),
    index('cash_sessions_created_by_idx').on(t.createdBy),
    index('cash_sessions_updated_by_idx').on(t.updatedBy),
    uniqueIndex('cash_sessions_one_open_per_branch')
      .on(t.branchId)
      .where(sql`${t.status} = 'open' and ${t.deletedAt} is null`),
  ]
)
