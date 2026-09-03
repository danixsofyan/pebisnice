import { and, eq, isNull, sql } from 'drizzle-orm'
import { transactionItems, transactions } from '@/lib/db/schema'
import type { Transaction } from '@/lib/db/tenant'
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
  /**
   * Menulis header dan seluruh barisnya. Dipanggil di dalam transaksi database
   * milik service, bukan membuka transaksinya sendiri — supaya pengurangan
   * stok ikut batal bila salah satu langkah gagal.
   */
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

  /** Nomor urut struk per cabang per hari, dikunci di database. */
  async nextOrderCode(tx: Transaction, branchCode: string, today: string): Promise<string> {
    const result = await tx.execute<{ sequence: number }>(sql`
      SELECT COUNT(*) + 1 AS sequence
      FROM transactions
      WHERE channel = 'pos'
        AND order_id LIKE ${`${branchCode}-${today}-%`}
    `)

    const rows = (result as unknown as { rows?: Array<{ sequence: number }> }).rows ?? []
    const sequence = Number(rows[0]?.sequence ?? 1)

    return `${branchCode}-${today}-${String(sequence).padStart(4, '0')}`
  }
}

export const posRepository = new PosRepository()
