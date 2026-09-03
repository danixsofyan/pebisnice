import { date, index, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { branches } from './branches'
import { actorColumns, tenantColumn } from './columns'
import { expenseCategoryEnum } from './enums'
import { lifecycleColumns, money } from './primitives'

/**
 * Pengeluaran operasional (OpEx) — komponen terakhir P&L setelah laba kotor
 * dan biaya platform. `branchId` boleh NULL untuk biaya tingkat perusahaan
 * yang tidak dibebankan ke cabang tertentu.
 */
export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumn,
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'restrict' }),
    category: expenseCategoryEnum('category').default('other').notNull(),
    amount: money('amount').notNull(),
    expenseDate: date('expense_date').notNull(),
    note: text('note'),
    ...actorColumns,
    ...lifecycleColumns,
  },
  (t) => [
    index('expenses_project_id_idx')
      .on(t.projectId)
      .where(sql`${t.deletedAt} is null`),
    index('expenses_branch_id_idx')
      .on(t.branchId)
      .where(sql`${t.deletedAt} is null`),
    index('expenses_date_idx')
      .on(t.projectId, t.expenseDate.desc())
      .where(sql`${t.deletedAt} is null`),
    index('expenses_category_idx').on(t.projectId, t.category),
    index('expenses_created_by_idx').on(t.createdBy),
    index('expenses_updated_by_idx').on(t.updatedBy),
  ]
)
