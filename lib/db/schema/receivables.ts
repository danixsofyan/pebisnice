import { date, index, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { branches } from './branches'
import { customers } from './customers'
import { users } from './auth'
import { actorColumns, tenantColumn } from './columns'
import { paymentMethodEnum } from './enums'
import { lifecycleColumns, money, tz } from './primitives'
import { transactions } from './sales'

// Customer receivable (piutang): an amount owed, optionally tied to a sale, paid off over one or
// more installments. Outstanding = amount - sum(payments); settled_at is set when fully paid.
export const receivables = pgTable(
  'receivables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    transactionId: uuid('transaction_id').references(() => transactions.id, {
      onDelete: 'set null',
    }),
    amount: money('amount').notNull(),
    description: text('description'),
    dueDate: date('due_date'),
    settledAt: tz('settled_at'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('receivables_project_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('receivables_customer_idx').on(t.customerId),
    index('receivables_open_idx')
      .on(t.projectId, t.settledAt)
      .where(sql`${t.deletedAt} is null`),
    index('receivables_created_by_idx').on(t.createdBy),
    index('receivables_updated_by_idx').on(t.updatedBy),
  ]
)

export const receivablePayments = pgTable(
  'receivable_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    receivableId: uuid('receivable_id')
      .references(() => receivables.id, { onDelete: 'cascade' })
      .notNull(),
    amount: money('amount').notNull(),
    method: paymentMethodEnum('method'),
    note: text('note'),
    paidAt: tz('paid_at').defaultNow().notNull(),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('receivable_payments_receivable_idx').on(t.receivableId),
    index('receivable_payments_project_idx').on(t.projectId),
  ]
)
