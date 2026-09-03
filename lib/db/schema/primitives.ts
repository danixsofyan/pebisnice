import { boolean, numeric, timestamp } from 'drizzle-orm/pg-core'

/** Uang selalu NUMERIC(18,2) — tidak pernah float (docs/db-standards.md §2). */
export const money = (name: string) => numeric(name, { precision: 18, scale: 2 })

/** Waktu selalu TIMESTAMPTZ, disimpan UTC (docs/db-standards.md §2). */
export const tz = (name: string) => timestamp(name, { withTimezone: true })

/**
 * Kolom siklus hidup wajib untuk tabel bisnis (docs/db-standards.md §3).
 * Tabel ledger yang immutable sengaja tidak memakainya.
 */
export const lifecycleColumns = {
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: tz('created_at').defaultNow().notNull(),
  updatedAt: tz('updated_at').defaultNow().notNull(),
  deletedAt: tz('deleted_at'),
}
