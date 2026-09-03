import { index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { actorColumns, tenantColumn } from './columns'
import { lifecycleColumns } from './primitives'

/**
 * Cabang fisik. Setiap project wajib punya minimal satu; project lama
 * mendapat cabang "Pusat" saat migrasi.
 */
export const branches = pgTable(
  'branches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    name: text('name').notNull(),
    code: text('code').notNull(),
    address: text('address'),
    phone: text('phone'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('branches_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('branches_created_by_idx').on(t.createdBy),
    index('branches_updated_by_idx').on(t.updatedBy),
    uniqueIndex('branches_project_code_unique')
      .on(t.projectId, t.code)
      .where(sql`${t.deletedAt} is null`),
  ]
)
