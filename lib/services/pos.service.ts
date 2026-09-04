import { posRepository, type PaymentMethod } from '@/lib/repositories/pos.repository'
import { cashSessionRepository } from '@/lib/repositories/cash-session.repository'
import { inventoryRepository } from '@/lib/repositories/inventory.repository'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { productRepository } from '@/lib/repositories/product.repository'
import { branchRepository } from '@/lib/repositories/branch.repository'
import { withTenant } from '@/lib/db/tenant'
import { fromDecimalString, type Money } from '@/lib/domain/money'
import { calculateChange, priceCart, type CartDiscount } from '@/lib/domain/pos/cart'
import { planStockMovement } from '@/lib/domain/inventory/stock-movement'
import { requireBranchAccess, requirePermission } from '@/lib/rbac'
import { NotFoundError, ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

export interface PosLineRequest {
  productVariantId: string
  qty: number
  /** Harga jual satuan. HPP tidak pernah datang dari client. */
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
  /**
   * Membuat transaksi kasir.
   *
   * Seluruh langkah berada dalam satu transaksi database: penulisan header,
   * baris, dan pengurangan stok tiap varian. Bila stok satu varian tidak
   * mencukupi, seluruh penjualan batal — tidak ada penjualan setengah jadi.
   *
   * HPP diambil server dari database, bukan dari request, sehingga kasir tidak
   * bisa memengaruhi angka COGS.
   */
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

  /**
   * Membatalkan transaksi kasir dan mengembalikan stoknya. Alasan wajib —
   * ditegakkan di sini dan lagi oleh CHECK constraint di database.
   */
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

  /** Riwayat penjualan kasir, terbaru dulu. Terikat cakupan cabang pemanggil. */
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

  /** Data struk satu transaksi kasir untuk dicetak. */
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
