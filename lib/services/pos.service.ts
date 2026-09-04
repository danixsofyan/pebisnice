import { eq, sql } from 'drizzle-orm'
import { saleReturnItems, saleReturns, transactionItems, transactions } from '@/lib/db/schema'
import { posRepository, type PaymentMethod } from '@/lib/repositories/pos.repository'
import { cashSessionRepository } from '@/lib/repositories/cash-session.repository'
import { inventoryRepository } from '@/lib/repositories/inventory.repository'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { productRepository } from '@/lib/repositories/product.repository'
import { branchRepository } from '@/lib/repositories/branch.repository'
import { withTenant } from '@/lib/db/tenant'
import { fromDecimalString, toDecimalString, type Money } from '@/lib/domain/money'
import { calculateChange, priceCart, type CartDiscount } from '@/lib/domain/pos/cart'
import { planStockMovement } from '@/lib/domain/inventory/stock-movement'
import { requireBranchAccess, requirePermission } from '@/lib/rbac'
import { NotFoundError, ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

export interface PosLineRequest {
  productVariantId: string
  qty: number
  /** Unit sale price; HPP never comes from the client. */
  unitPrice: Money
}

export interface CreateSaleRequest {
  projectId: string
  branchId: string
  lines: PosLineRequest[]
  discount: CartDiscount
  paymentMethod: PaymentMethod
  paidAmount: Money
}

export interface PosContext {
  userId: string
  ip: string
  userAgent: string
}

function todayStamp(now: Date): string {
  return now.toISOString().slice(0, 10).replace(/-/g, '')
}

export class PosService {
  // Create a cashier sale. Header, lines, and per-variant stock decrements all run in one transaction; if any variant is short the whole sale aborts. HPP is read server-side, so the cashier can't influence COGS.
  async createSale(request: CreateSaleRequest, context: PosContext) {
    await requirePermission(request.projectId, context.userId, 'pos:operate')
    await requireBranchAccess(request.projectId, context.userId, request.branchId)

    if (request.lines.length === 0) {
      throw new ValidationError('Keranjang tidak boleh kosong', { lines: ['Minimal satu item'] })
    }

    const result = await withTenant(request.projectId, async (tx) => {
      const session = await cashSessionRepository.findOpenByBranch(tx, request.branchId)
      if (!session) {
        throw new ValidationError('Belum ada sesi kasir yang dibuka untuk cabang ini', {
          cashSessionId: ['Buka shift terlebih dahulu'],
        })
      }

      const branch = await branchRepository.findById(tx, request.branchId)
      if (!branch) throw new NotFoundError('Cabang tidak ditemukan')

      const pricedLines = []
      for (const requested of request.lines) {
        const variant = await productRepository.findVariantWithCost(
          request.projectId,
          requested.productVariantId
        )
        if (!variant) {
          throw new NotFoundError(`Varian ${requested.productVariantId} tidak ditemukan`)
        }

        pricedLines.push({
          productVariantId: variant.id,
          productName: variant.variantName ?? 'Produk',
          variantName: variant.variantName,
          sku: variant.skuVariant,
          qty: requested.qty,
          unitPrice: requested.unitPrice,
          hppAtTime: fromDecimalString(variant.hpp),
        })
      }

      const cart = priceCart(pricedLines, request.discount)
      const changeAmount = calculateChange(cart.total, request.paidAmount)

      const orderCode = await posRepository.nextOrderCode(tx, branch.code, todayStamp(new Date()))

      const header = await posRepository.insertTransaction(tx, {
        projectId: request.projectId,
        branchId: request.branchId,
        cashSessionId: session.id,
        orderCode,
        paymentMethod: request.paymentMethod,
        cart,
        paidAmount: request.paidAmount,
        changeAmount,
        actorId: context.userId,
      })

      for (const line of cart.lines) {
        const location = {
          projectId: request.projectId,
          branchId: request.branchId,
          productVariantId: line.productVariantId,
        }

        const currentQty = await inventoryRepository.lockBalance(tx, location)
        const plan = planStockMovement(
          { type: 'sale', qty: line.qty, referenceId: header.id },
          currentQty
        )

        await inventoryRepository.setBalance(tx, location, plan.quantityAfter, context.userId)
        await inventoryRepository.appendMovement(tx, location, plan, context.userId)
      }

      return { header, cart, changeAmount }
    })

    await auditRepository.log({
      action: 'create',
      resource: 'pos_transaction',
      resourceId: result.header.id,
      userId: context.userId,
      projectId: request.projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: {
        orderCode: result.header.orderId,
        branchId: request.branchId,
        paymentMethod: request.paymentMethod,
        lineCount: result.cart.lines.length,
      },
    })

    logger.info(
      { projectId: request.projectId, transactionId: result.header.id },
      'POS sale created'
    )

    return result
  }

  // Void a cashier sale and return its stock. A reason is required, enforced here and by a database CHECK.
  async voidSale(
    projectId: string,
    transactionId: string,
    reason: string,
    context: PosContext
  ): Promise<void> {
    await requirePermission(projectId, context.userId, 'pos:void')

    if (reason.trim().length === 0) {
      throw new ValidationError('Alasan pembatalan wajib diisi', {
        reason: ['Alasan wajib diisi'],
      })
    }

    await withTenant(projectId, async (tx) => {
      const header = await posRepository.findPosTransaction(tx, projectId, transactionId)
      if (!header) throw new NotFoundError('Transaksi tidak ditemukan')
      if (header.voidedAt) {
        throw new ValidationError('Transaksi sudah dibatalkan', {
          transactionId: ['Sudah dibatalkan'],
        })
      }

      const voided = await posRepository.markVoided(
        tx,
        transactionId,
        context.userId,
        reason.trim()
      )
      if (!voided) throw new ValidationError('Transaksi sudah dibatalkan oleh pengguna lain')

      const items = await posRepository.listItems(tx, transactionId)

      for (const item of items) {
        if (!item.productVariantId) continue

        const location = {
          projectId,
          branchId: header.branchId!,
          productVariantId: item.productVariantId,
        }

        const currentQty = await inventoryRepository.lockBalance(tx, location)
        const plan = planStockMovement(
          { type: 'cancellation', qty: item.qty, referenceId: transactionId },
          currentQty
        )

        await inventoryRepository.setBalance(tx, location, plan.quantityAfter, context.userId)
        await inventoryRepository.appendMovement(tx, location, plan, context.userId)
      }
    })

    await auditRepository.log({
      action: 'delete',
      resource: 'pos_transaction',
      resourceId: transactionId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { reason: reason.trim() },
    })

    logger.info({ projectId, transactionId }, 'POS sale voided')
  }

  // Return items from a completed sale: restock the returned quantity, record the refund,
  // and mark the sale 'returned' once every line is fully returned. Each line is capped at
  // sold minus already-returned, so a sale can be returned in several partial steps.
  async returnSale(
    projectId: string,
    request: {
      transactionId: string
      reason: string
      items: Array<{ productVariantId: string; qty: number }>
    },
    context: PosContext
  ): Promise<{ refundAmount: string }> {
    await requirePermission(projectId, context.userId, 'pos:void')
    if (request.items.length === 0)
      throw new ValidationError('Pilih minimal satu barang untuk diretur')

    const result = await withTenant(projectId, async (tx) => {
      const header = await posRepository.findPosTransaction(tx, projectId, request.transactionId)
      if (!header) throw new NotFoundError('Transaksi tidak ditemukan')
      if (header.voidedAt || header.status === 'cancelled') {
        throw new ValidationError('Transaksi sudah dibatalkan')
      }
      if (header.status === 'returned') throw new ValidationError('Transaksi sudah diretur penuh')

      const sold = await tx
        .select({
          productVariantId: transactionItems.productVariantId,
          productName: transactionItems.productName,
          qty: transactionItems.qty,
          unitPrice: transactionItems.unitPrice,
        })
        .from(transactionItems)
        .where(eq(transactionItems.transactionId, request.transactionId))

      const soldByVariant = new Map(
        sold.filter((s) => s.productVariantId).map((s) => [s.productVariantId!, s])
      )

      const returnedRows = await tx
        .select({
          productVariantId: saleReturnItems.productVariantId,
          qty: sql<number>`coalesce(sum(${saleReturnItems.qty}), 0)::int`,
        })
        .from(saleReturnItems)
        .innerJoin(saleReturns, eq(saleReturns.id, saleReturnItems.returnId))
        .where(eq(saleReturns.transactionId, request.transactionId))
        .groupBy(saleReturnItems.productVariantId)
      const alreadyReturned = new Map(returnedRows.map((r) => [r.productVariantId, r.qty]))

      let refund = 0n
      const lines: Array<{
        productVariantId: string
        productName: string
        qty: number
        unitPrice: string
      }> = []
      for (const item of request.items) {
        const original = soldByVariant.get(item.productVariantId)
        if (!original) throw new ValidationError('Barang tidak ada di transaksi ini')
        const remaining = original.qty - (alreadyReturned.get(item.productVariantId) ?? 0)
        if (item.qty <= 0 || item.qty > remaining) {
          throw new ValidationError(
            `Qty retur "${original.productName}" melebihi sisa (${remaining})`
          )
        }
        refund += fromDecimalString(original.unitPrice) * BigInt(item.qty)
        lines.push({
          productVariantId: item.productVariantId,
          productName: original.productName,
          qty: item.qty,
          unitPrice: original.unitPrice,
        })
      }

      const [ret] = await tx
        .insert(saleReturns)
        .values({
          projectId,
          transactionId: request.transactionId,
          branchId: header.branchId!,
          refundAmount: toDecimalString(refund),
          reason: request.reason.trim() || null,
          createdBy: context.userId,
          updatedBy: context.userId,
        })
        .returning({ id: saleReturns.id })

      await tx.insert(saleReturnItems).values(
        lines.map((l) => ({
          projectId,
          returnId: ret!.id,
          productVariantId: l.productVariantId,
          productName: l.productName,
          qty: l.qty,
          unitPrice: l.unitPrice,
        }))
      )

      for (const line of lines) {
        const location = {
          projectId,
          branchId: header.branchId!,
          productVariantId: line.productVariantId,
        }
        const currentQty = await inventoryRepository.lockBalance(tx, location)
        const plan = planStockMovement(
          { type: 'return', qty: line.qty, referenceId: ret!.id },
          currentQty
        )
        await inventoryRepository.setBalance(tx, location, plan.quantityAfter, context.userId)
        await inventoryRepository.appendMovement(tx, location, plan, context.userId)
      }

      // Fully returned across all lines? Flag the sale so reports exclude it.
      const fullyReturned = sold.every((s) => {
        if (!s.productVariantId) return true
        const justReturned = lines.find((l) => l.productVariantId === s.productVariantId)?.qty ?? 0
        return (alreadyReturned.get(s.productVariantId) ?? 0) + justReturned >= s.qty
      })
      if (fullyReturned) {
        await tx
          .update(transactions)
          .set({ status: 'returned', updatedBy: context.userId })
          .where(eq(transactions.id, request.transactionId))
      }

      return { refund: toDecimalString(refund), fullyReturned }
    })

    await auditRepository.log({
      action: 'update',
      resource: 'pos_transaction',
      resourceId: request.transactionId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { type: 'return', refund: result.refund, fullyReturned: result.fullyReturned },
    })

    logger.info({ projectId, transactionId: request.transactionId }, 'POS sale returned')
    return { refundAmount: result.refund }
  }

  // Items of a sale with how many of each are still returnable (sold minus already returned).
  async listReturnableItems(
    projectId: string,
    userId: string,
    transactionId: string
  ): Promise<
    Array<{ productVariantId: string; productName: string; remaining: number; unitPrice: string }>
  > {
    await requirePermission(projectId, userId, 'pos:void')

    return withTenant(projectId, async (tx) => {
      const sold = await tx
        .select({
          productVariantId: transactionItems.productVariantId,
          productName: transactionItems.productName,
          qty: transactionItems.qty,
          unitPrice: transactionItems.unitPrice,
        })
        .from(transactionItems)
        .where(eq(transactionItems.transactionId, transactionId))

      const returnedRows = await tx
        .select({
          productVariantId: saleReturnItems.productVariantId,
          qty: sql<number>`coalesce(sum(${saleReturnItems.qty}), 0)::int`,
        })
        .from(saleReturnItems)
        .innerJoin(saleReturns, eq(saleReturns.id, saleReturnItems.returnId))
        .where(eq(saleReturns.transactionId, transactionId))
        .groupBy(saleReturnItems.productVariantId)
      const returned = new Map(returnedRows.map((r) => [r.productVariantId, r.qty]))

      return sold
        .filter((s) => s.productVariantId)
        .map((s) => ({
          productVariantId: s.productVariantId!,
          productName: s.productName,
          remaining: s.qty - (returned.get(s.productVariantId!) ?? 0),
          unitPrice: s.unitPrice,
        }))
        .filter((s) => s.remaining > 0)
    })
  }

  /** Cashier sales history, newest first; bound to the caller's branch scope. */
  async listSales(
    projectId: string,
    userId: string,
    options: { branchId: string | null; limit?: number }
  ) {
    await requirePermission(projectId, userId, 'project:view')
    if (options.branchId) {
      await requireBranchAccess(projectId, userId, options.branchId)
    }

    return withTenant(projectId, (tx) =>
      posRepository.listSales(tx, projectId, {
        branchId: options.branchId,
        limit: Math.min(options.limit ?? 50, 200),
      })
    )
  }

  /** Receipt data for one cashier sale, for printing. */
  async getReceipt(projectId: string, userId: string, transactionId: string) {
    await requirePermission(projectId, userId, 'project:view')

    return withTenant(projectId, async (tx) => {
      const header = await posRepository.findPosTransaction(tx, projectId, transactionId)
      if (!header) throw new NotFoundError('Transaksi tidak ditemukan')
      const items = await posRepository.listReceiptItems(tx, transactionId)
      return { header, items }
    })
  }
}

export const posService = new PosService()
