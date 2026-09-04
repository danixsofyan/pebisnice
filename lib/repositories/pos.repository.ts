import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { transactionItems, transactions } from '@/lib/db/schema'
import type { Transaction } from '@/lib/db/tenant'
import { execRows } from '@/lib/db/rows'
import { toDecimalString, type Money } from '@/lib/domain/money'
import type { PricedCart } from '@/lib/domain/pos/cart'
import type { InferSelectModel } from 'drizzle-orm'

export type PosTransaction = InferSelectModel<typeof transactions>

export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'card' | 'other'

export interface CreatePosTransactionInput {
  projectId: string
  branchId: string
  cashSessionId: string
  orderCode: string
  paymentMethod: PaymentMethod
  cart: PricedCart
  paidAmount: Money
  changeAmount: Money
  actorId: string
}

export class PosRepository {
  // Write the header and all its lines. Called inside the service's transaction, not opening its own, so the stock decrement rolls back too if any step fails.
  async insertTransaction(
    tx: Transaction,
    input: CreatePosTransactionInput
  ): Promise<PosTransaction> {
    const [header] = await tx
      .insert(transactions)
      .values({
        projectId: input.projectId,
        channel: 'pos',
        branchId: input.branchId,
        cashSessionId: input.cashSessionId,
        paymentMethod: input.paymentMethod,
        orderId: input.orderCode,
        orderDate: new Date(),
        settlementDate: new Date(),
        status: 'completed',
        grossAmount: toDecimalString(input.cart.subtotal),
        discountAmount: toDecimalString(input.cart.discountAmount),
        netAmount: toDecimalString(input.cart.total),
        paidAmount: toDecimalString(input.paidAmount),
        changeAmount: toDecimalString(input.changeAmount),
        createdBy: input.actorId,
        updatedBy: input.actorId,
      })
      .returning()

    const created = header!

    await tx.insert(transactionItems).values(
      input.cart.lines.map((line) => ({
        projectId: input.projectId,
        transactionId: created.id,
        productVariantId: line.productVariantId,
        productName: line.productName,
        variantName: line.variantName,
        sku: line.sku,
        qty: line.qty,
        unitPrice: toDecimalString(line.unitPrice),
        hppAtTime: toDecimalString(line.hppAtTime),
      }))
    )

    return created
  }

  async findPosTransaction(
    tx: Transaction,
    projectId: string,
    transactionId: string
  ): Promise<PosTransaction | null> {
    const rows = await tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.id, transactionId),
          eq(transactions.projectId, projectId),
          eq(transactions.channel, 'pos'),
          isNull(transactions.deletedAt)
        )
      )
      .limit(1)

    return rows[0] ?? null
  }

  async listItems(tx: Transaction, transactionId: string) {
    return tx
      .select({
        productVariantId: transactionItems.productVariantId,
        productName: transactionItems.productName,
        qty: transactionItems.qty,
      })
      .from(transactionItems)
      .where(eq(transactionItems.transactionId, transactionId))
  }

  async markVoided(
    tx: Transaction,
    transactionId: string,
    actorId: string,
    reason: string
  ): Promise<boolean> {
    const rows = await tx
      .update(transactions)
      .set({
        status: 'cancelled',
        voidedAt: new Date(),
        voidedBy: actorId,
        voidReason: reason,
        updatedBy: actorId,
      })
      .where(
        and(
          eq(transactions.id, transactionId),
          isNull(transactions.voidedAt),
          isNull(transactions.deletedAt)
        )
      )
      .returning({ id: transactions.id })

    return rows.length > 0
  }

  /** Per-branch per-day receipt sequence number, locked in the database. */
  async nextOrderCode(tx: Transaction, branchCode: string, today: string): Promise<string> {
    const result = await tx.execute<{ sequence: number }>(sql`
      SELECT COUNT(*) + 1 AS sequence
      FROM transactions
      WHERE channel = 'pos'
        AND order_id LIKE ${`${branchCode}-${today}-%`}
    `)

    const rows = execRows<{ sequence: number }>(result)
    const sequence = Number(rows[0]?.sequence ?? 1)

    return `${branchCode}-${today}-${String(sequence).padStart(4, '0')}`
  }

  async listSales(
    tx: Transaction,
    projectId: string,
    options: { branchId: string | null; limit: number }
  ) {
    return tx
      .select({
        id: transactions.id,
        orderId: transactions.orderId,
        branchId: transactions.branchId,
        orderDate: transactions.orderDate,
        netAmount: transactions.netAmount,
        paymentMethod: transactions.paymentMethod,
        status: transactions.status,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.projectId, projectId),
          eq(transactions.channel, 'pos'),
          isNull(transactions.deletedAt),
          ...(options.branchId ? [eq(transactions.branchId, options.branchId)] : [])
        )
      )
      .orderBy(desc(transactions.orderDate))
      .limit(options.limit)
  }

  async listReceiptItems(tx: Transaction, transactionId: string) {
    return tx
      .select({
        productName: transactionItems.productName,
        variantName: transactionItems.variantName,
        qty: transactionItems.qty,
        unitPrice: transactionItems.unitPrice,
      })
      .from(transactionItems)
      .where(eq(transactionItems.transactionId, transactionId))
  }
}

export const posRepository = new PosRepository()
