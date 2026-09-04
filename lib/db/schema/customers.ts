import { index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { actorColumns, tenantColumn } from './columns'
import { lifecycleColumns } from './primitives'

// Customer directory. PII (phone, email, address) is stored encrypted at rest (UU PDP);
// name stays plaintext for display and search. phone_hash is a keyed blind index so we can
// dedup and look up by phone without storing or querying the plaintext.
export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    name: text('name').notNull(),
    phoneEnc: text('phone_enc'),
    phoneHash: text('phone_hash'),
    emailEnc: text('email_enc'),
    addressEnc: text('address_enc'),
    note: text('note'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    uniqueIndex('customers_phone_hash_idx')
      .on(t.projectId, t.phoneHash)
      .where(sql`${t.phoneHash} is not null and ${t.deletedAt} is null`),
    index('customers_project_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('customers_name_idx').on(t.projectId, t.name),
    index('customers_created_by_idx').on(t.createdBy),
    index('customers_updated_by_idx').on(t.updatedBy),
  ]
)
