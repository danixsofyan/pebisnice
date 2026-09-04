import { boolean, numeric, timestamp } from 'drizzle-orm/pg-core'

/** Money is always NUMERIC(18,2), never float (docs/db-standards.md section 2). */
export const money = (name: string) => numeric(name, { precision: 18, scale: 2 })

/** Time is always TIMESTAMPTZ, stored UTC (docs/db-standards.md section 2). */
export const tz = (name: string) => timestamp(name, { withTimezone: true })

// Lifecycle columns required on business tables (docs/db-standards.md section 3); immutable ledgers intentionally omit them.
export const lifecycleColumns = {
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: tz('created_at').defaultNow().notNull(),
  updatedAt: tz('updated_at').defaultNow().notNull(),
  deletedAt: tz('deleted_at'),
}
