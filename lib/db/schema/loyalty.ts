import { index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { customers } from './customers'
import { tenantColumn } from './columns'
import { loyaltyLedgerTypeEnum } from './enums'
import { tz } from './primitives'

// Append-only history of every loyalty point movement. points is signed (+earn, -redeem);
// balance_after is the customer's running balance right after this entry. A DB immutability
// trigger blocks UPDATE/DELETE, so the ledger and customers.loyalty_points can't silently drift.
export const loyaltyLedger = pgTable(
  'loyalty_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    customerId: uuid('customer_id')
      .references(() => customers.id, { onDelete: 'cascade' })
      .notNull(),
    // The sale this entry came from, when applicable. No FK: transactions may be pruned/archived
    // independently and the ledger must survive as an audit record.
    transactionId: uuid('transaction_id'),
    type: loyaltyLedgerTypeEnum('type').notNull(),
    points: integer('points').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    note: text('note'),
    createdBy: text('created_by'),
    createdAt: tz('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('loyalty_ledger_customer_idx').on(t.customerId),
    index('loyalty_ledger_project_idx').on(t.projectId),
    index('loyalty_ledger_tx_idx').on(t.transactionId),
  ]
)

export type LoyaltyLedgerEntry = typeof loyaltyLedger.$inferSelect
