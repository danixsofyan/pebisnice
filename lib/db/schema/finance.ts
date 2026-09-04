import { boolean, date, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { actorColumns, tenantColumn } from './columns'
import { branches } from './branches'
import { mutationDirectionEnum, mutationSourceEnum } from './enums'
import { lifecycleColumns, money } from './primitives'

// Bank account mutations, imported from a statement (BCA first) or later an aggregator
// webhook (Moota). One row per real transaction; dedup_hash makes re-importing the same
// statement idempotent. Reconciliation links a mutation to an expense/income record.
export const financialMutations = pgTable(
  'financial_mutations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    bank: text('bank').notNull(),
    source: mutationSourceEnum('source').default('import').notNull(),
    // Bank reference or webhook id, for aggregator idempotency; null for plain imports.
    externalId: text('external_id'),
    direction: mutationDirectionEnum('direction').notNull(),
    amount: money('amount').notNull(),
    balanceAfter: money('balance_after'),
    mutationDate: date('mutation_date').notNull(),
    description: text('description').notNull(),
    reference: text('reference'),
    // Hash of the natural key (date+amount+direction+description+balance) to skip duplicate imports.
    dedupHash: text('dedup_hash').notNull(),
    reconciled: boolean('reconciled').default(false).notNull(),
    matchedType: text('matched_type'),
    matchedId: uuid('matched_id'),
    note: text('note'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    uniqueIndex('mutations_dedup_idx').on(t.projectId, t.dedupHash),
    uniqueIndex('mutations_external_idx')
      .on(t.projectId, t.source, t.externalId)
      .where(sql`${t.externalId} is not null`),
    index('mutations_date_idx')
      .on(t.projectId, t.mutationDate.desc())
      .where(sql`${t.deletedAt} is null`),
    index('mutations_reconciled_idx')
      .on(t.projectId, t.reconciled)
      .where(sql`${t.deletedAt} is null`),
    index('mutations_created_by_idx').on(t.createdBy),
    index('mutations_updated_by_idx').on(t.updatedBy),
  ]
)
