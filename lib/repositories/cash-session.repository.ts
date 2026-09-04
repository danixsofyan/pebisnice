import { and, eq, isNull, sql } from 'drizzle-orm'
import { cashSessions, transactions } from '@/lib/db/schema'
import type { Transaction } from '@/lib/db/tenant'
import { execRows } from '@/lib/db/rows'
import { fromDecimalString, toDecimalString, type Money } from '@/lib/domain/money'
import type { InferSelectModel } from 'drizzle-orm'

export type CashSession = InferSelectModel<typeof cashSessions>

export interface OpenSessionInput {
  projectId: string
  branchId: string
  openedBy: string
  openingBalance: Money
}

export interface CloseSessionInput {
  sessionId: string
  closedBy: string
  expectedBalance: Money
  countedBalance: Money
  difference: Money
  note: string | null
}

export class CashSessionRepository {
  async findOpenByBranch(tx: Transaction, branchId: string): Promise<CashSession | null> {
    const rows = await tx
      .select()
      .from(cashSessions)
      .where(
        and(
          eq(cashSessions.branchId, branchId),
          eq(cashSessions.status, 'open'),
          isNull(cashSessions.deletedAt)
        )
      )
      .limit(1)

    return rows[0] ?? null
  }

  async open(tx: Transaction, input: OpenSessionInput): Promise<CashSession> {
    const [session] = await tx
      .insert(cashSessions)
      .values({
        projectId: input.projectId,
        branchId: input.branchId,
        openedBy: input.openedBy,
        openingBalance: toDecimalString(input.openingBalance),
        createdBy: input.openedBy,
        updatedBy: input.openedBy,
      })
      .returning()

    return session!
  }

  async close(tx: Transaction, input: CloseSessionInput): Promise<CashSession | null> {
    const [session] = await tx
      .update(cashSessions)
      .set({
        status: 'closed',
        closedBy: input.closedBy,
        closedAt: new Date(),
        expectedBalance: toDecimalString(input.expectedBalance),
        countedBalance: toDecimalString(input.countedBalance),
        difference: toDecimalString(input.difference),
        note: input.note,
        updatedBy: input.closedBy,
      })
      .where(
        and(
          eq(cashSessions.id, input.sessionId),
          eq(cashSessions.status, 'open'),
          isNull(cashSessions.deletedAt)
        )
      )
      .returning()

    return session ?? null
  }

  // Sum the session's cash sales, ignoring voided transactions; computed in the database to avoid loading every row into memory.
  async sumCashSales(tx: Transaction, sessionId: string): Promise<Money> {
    const result = await tx.execute<{ total: string }>(sql`
      SELECT COALESCE(SUM(net_amount), 0)::text AS total
      FROM transactions
      WHERE cash_session_id = ${sessionId}
        AND payment_method = 'cash'
        AND voided_at IS NULL
        AND deleted_at IS NULL
    `)

    const rows = execRows<{ total: string }>(result)
    return fromDecimalString(rows[0]?.total ?? '0')
  }

  async countOpenTransactions(tx: Transaction, sessionId: string): Promise<number> {
    const rows = await tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.cashSessionId, sessionId), isNull(transactions.deletedAt)))

    return rows.length
  }
}

export const cashSessionRepository = new CashSessionRepository()
