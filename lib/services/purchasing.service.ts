import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import {
  branches,
  productCostHistory,
  products,
  productVariants,
  purchaseOrderItems,
  purchaseOrders,
  purchasePayments,
  purchaseReturnItems,
  purchaseReturns,
  suppliers,
  users,
} from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'
import { inventoryRepository } from '@/lib/repositories/inventory.repository'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { planStockMovement } from '@/lib/domain/inventory/stock-movement'
import { decryptToken, encryptToken } from '@/lib/encryption'
import { fromDecimalString, toDecimalString } from '@/lib/domain/money'
import { requireBranchAccess, requirePermission } from '@/lib/rbac'
import { sanitizeText } from '@/lib/security/sanitizer'
import { NotFoundError, ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

const MANAGE: Parameters<typeof requirePermission>[2] = 'inventory:adjust'
const FINANCE: Parameters<typeof requirePermission>[2] = 'expense:manage'
type PayMethod = 'cash' | 'transfer' | 'qris' | 'card' | 'other'

export interface PayableRow {
  id: string
  supplier: string | null
  orderDate: Date
  status: string
  total: string
  paid: string
  outstanding: string
}

export interface PurchasingContext {
  userId: string
  ip: string
  userAgent: string
}

export interface SupplierInput {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  note: string | null
}

export class PurchasingService {
  async saveSupplier(
    projectId: string,
    supplierId: string | null,
    input: SupplierInput,
    context: PurchasingContext
  ): Promise<void> {
    await requirePermission(projectId, context.userId, MANAGE)
    if (!input.name.trim()) throw new ValidationError('Nama supplier wajib diisi')

    const enc = (v: string | null) => (v && v.trim() ? encryptToken(v.trim()) : null)
    const values = {
      name: sanitizeText(input.name),
      phoneEnc: enc(input.phone),
      emailEnc: enc(input.email),
      addressEnc: enc(input.address),
      note: input.note ? sanitizeText(input.note) : null,
      updatedBy: context.userId,
    }

    const result = await withTenant(projectId, (tx) => {
      if (supplierId) {
        return tx
          .update(suppliers)
          .set(values)
          .where(and(eq(suppliers.id, supplierId), eq(suppliers.projectId, projectId)))
          .returning({ id: suppliers.id })
      }
      return tx
        .insert(suppliers)
        .values({ projectId, ...values, createdBy: context.userId })
        .returning({ id: suppliers.id })
    })
    if (result.length === 0) throw new NotFoundError('Supplier tidak ditemukan')

    await auditRepository.log({
      action: supplierId ? 'update' : 'create',
      resource: 'supplier',
      resourceId: result[0]!.id,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { name: input.name },
    })
  }

  async listSuppliers(projectId: string, userId: string) {
    await requirePermission(projectId, userId, MANAGE)
    const rows = await withTenant(projectId, (tx) =>
      tx
        .select({
          id: suppliers.id,
          name: suppliers.name,
          phoneEnc: suppliers.phoneEnc,
          emailEnc: suppliers.emailEnc,
          note: suppliers.note,
        })
        .from(suppliers)
        .where(and(eq(suppliers.projectId, projectId), isNull(suppliers.deletedAt)))
        .orderBy(suppliers.name)
        .limit(500)
    )
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phoneEnc ? decryptToken(r.phoneEnc) : null,
      email: r.emailEnc ? decryptToken(r.emailEnc) : null,
      note: r.note,
    }))
  }

  // Create an ordered PO; no stock moves until it is received.
  async createOrder(
    projectId: string,
    request: {
      supplierId: string
      branchId: string
      note: string | null
      items: Array<{ productVariantId: string; qty: number; unitCost: string }>
    },
    context: PurchasingContext
  ): Promise<{ id: string }> {
    await requirePermission(projectId, context.userId, MANAGE)
    await requireBranchAccess(projectId, context.userId, request.branchId)
    if (request.items.length === 0) throw new ValidationError('Pilih minimal satu barang')

    let total = 0n
    for (const i of request.items) total += fromDecimalString(i.unitCost) * BigInt(i.qty)

    const created = await withTenant(projectId, async (tx) => {
      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          projectId,
          supplierId: request.supplierId,
          branchId: request.branchId,
          status: 'ordered',
          totalAmount: toDecimalString(total),
          note: request.note,
          createdBy: context.userId,
          updatedBy: context.userId,
        })
        .returning({ id: purchaseOrders.id })

      await tx.insert(purchaseOrderItems).values(
        request.items.map((i) => ({
          projectId,
          purchaseOrderId: po!.id,
          productVariantId: i.productVariantId,
          qty: i.qty,
          unitCost: i.unitCost,
        }))
      )
      return po!
    })

    await auditRepository.log({
      action: 'create',
      resource: 'purchase_order',
      resourceId: created.id,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { supplierId: request.supplierId, total: toDecimalString(total) },
    })
    logger.info({ projectId, purchaseOrderId: created.id }, 'purchase order created')
    return created
  }

  // Items of a PO still awaiting receipt (ordered minus already received).
  async listReceivableItems(
    projectId: string,
    userId: string,
    purchaseOrderId: string
  ): Promise<Array<{ itemId: string; productName: string; remaining: number }>> {
    await requirePermission(projectId, userId, MANAGE)
    return withTenant(projectId, (tx) =>
      tx
        .select({
          itemId: purchaseOrderItems.id,
          productName: products.name,
          variantName: productVariants.variantName,
          remaining: sql<number>`(${purchaseOrderItems.qty} - ${purchaseOrderItems.qtyReceived})::int`,
        })
        .from(purchaseOrderItems)
        .innerJoin(productVariants, eq(productVariants.id, purchaseOrderItems.productVariantId))
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(
          and(
            eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId),
            eq(purchaseOrderItems.projectId, projectId)
          )
        )
    ).then((rows) =>
      rows
        .filter((r) => r.remaining > 0)
        .map((r) => ({
          itemId: r.itemId,
          productName: r.variantName ? `${r.productName} · ${r.variantName}` : r.productName,
          remaining: r.remaining,
        }))
    )
  }

  // Receive an ordered PO, in full or partially: stock in the received qty per line, bump
  // qty_received, refresh each variant's cost from the purchase price (logged), and mark the
  // PO received once every line is fully received.
  async receiveOrder(
    projectId: string,
    purchaseOrderId: string,
    receipts: Array<{ itemId: string; qty: number }>,
    context: PurchasingContext
  ): Promise<void> {
    await requirePermission(projectId, context.userId, MANAGE)
    if (receipts.length === 0) throw new ValidationError('Isi jumlah yang diterima')

    await withTenant(projectId, async (tx) => {
      const [po] = await tx
        .select({
          id: purchaseOrders.id,
          branchId: purchaseOrders.branchId,
          status: purchaseOrders.status,
        })
        .from(purchaseOrders)
        .where(and(eq(purchaseOrders.id, purchaseOrderId), eq(purchaseOrders.projectId, projectId)))
        .limit(1)
      if (!po) throw new NotFoundError('PO tidak ditemukan')
      if (po.status !== 'ordered')
        throw new ValidationError('PO ini sudah diterima penuh atau dibatalkan')

      const items = await tx
        .select({
          id: purchaseOrderItems.id,
          productVariantId: purchaseOrderItems.productVariantId,
          qty: purchaseOrderItems.qty,
          qtyReceived: purchaseOrderItems.qtyReceived,
          unitCost: purchaseOrderItems.unitCost,
        })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId))
      const byId = new Map(items.map((i) => [i.id, i]))

      for (const receipt of receipts) {
        const item = byId.get(receipt.itemId)
        if (!item) throw new ValidationError('Barang bukan bagian dari PO ini')
        const remaining = item.qty - item.qtyReceived
        if (receipt.qty <= 0 || receipt.qty > remaining) {
          throw new ValidationError(`Jumlah terima melebihi sisa (${remaining})`)
        }

        const location = {
          projectId,
          branchId: po.branchId,
          productVariantId: item.productVariantId,
        }
        const currentQty = await inventoryRepository.lockBalance(tx, location)
        const plan = planStockMovement(
          { type: 'purchase', qty: receipt.qty, referenceId: purchaseOrderId },
          currentQty
        )
        await inventoryRepository.setBalance(tx, location, plan.quantityAfter, context.userId)
        await inventoryRepository.appendMovement(tx, location, plan, context.userId)

        await tx
          .update(purchaseOrderItems)
          .set({ qtyReceived: item.qtyReceived + receipt.qty })
          .where(eq(purchaseOrderItems.id, item.id))
        item.qtyReceived += receipt.qty

        const [variant] = await tx
          .select({ hpp: productVariants.hpp })
          .from(productVariants)
          .where(eq(productVariants.id, item.productVariantId))
          .limit(1)
        if (
          variant &&
          fromDecimalString(item.unitCost) > 0n &&
          fromDecimalString(variant.hpp) !== fromDecimalString(item.unitCost)
        ) {
          await tx
            .update(productVariants)
            .set({ hpp: item.unitCost, hppUpdatedAt: new Date(), updatedBy: context.userId })
            .where(eq(productVariants.id, item.productVariantId))
          await tx.insert(productCostHistory).values({
            projectId,
            productVariantId: item.productVariantId,
            cost: item.unitCost,
            previousCost: variant.hpp,
            changedBy: context.userId,
          })
        }
      }

      const fullyReceived = items.every((i) => i.qtyReceived >= i.qty)
      if (fullyReceived) {
        await tx
          .update(purchaseOrders)
          .set({ status: 'received', receivedAt: new Date(), updatedBy: context.userId })
          .where(eq(purchaseOrders.id, purchaseOrderId))
      }
    })

    await auditRepository.log({
      action: 'update',
      resource: 'purchase_order',
      resourceId: purchaseOrderId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { type: 'receive', lines: receipts.length },
    })
    logger.info({ projectId, purchaseOrderId }, 'purchase order received')
  }

  // Received PO lines still returnable to the supplier (received minus already returned).
  async listReturnableToSupplier(
    projectId: string,
    userId: string,
    purchaseOrderId: string
  ): Promise<Array<{ itemId: string; productName: string; returnable: number; unitCost: string }>> {
    await requirePermission(projectId, userId, MANAGE)
    return withTenant(projectId, (tx) =>
      tx
        .select({
          itemId: purchaseOrderItems.id,
          productName: products.name,
          variantName: productVariants.variantName,
          unitCost: purchaseOrderItems.unitCost,
          returnable: sql<number>`(${purchaseOrderItems.qtyReceived} - ${purchaseOrderItems.qtyReturned})::int`,
        })
        .from(purchaseOrderItems)
        .innerJoin(productVariants, eq(productVariants.id, purchaseOrderItems.productVariantId))
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(
          and(
            eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId),
            eq(purchaseOrderItems.projectId, projectId)
          )
        )
    ).then((rows) =>
      rows
        .filter((r) => r.returnable > 0)
        .map((r) => ({
          itemId: r.itemId,
          productName: r.variantName ? `${r.productName} · ${r.variantName}` : r.productName,
          returnable: r.returnable,
          unitCost: r.unitCost,
        }))
    )
  }

  // Return received goods to the supplier: stock out per line (capped at received-minus-returned),
  // bump qty_returned, and record the refund. All in one transaction. Gated inventory:adjust.
  async returnToSupplier(
    projectId: string,
    request: {
      purchaseOrderId: string
      reason: string
      items: Array<{ itemId: string; qty: number }>
    },
    context: PurchasingContext
  ): Promise<{ refundAmount: string }> {
    await requirePermission(projectId, context.userId, MANAGE)
    if (request.items.length === 0) throw new ValidationError('Pilih minimal satu barang')

    const refund = await withTenant(projectId, async (tx) => {
      const [po] = await tx
        .select({
          id: purchaseOrders.id,
          branchId: purchaseOrders.branchId,
          supplierId: purchaseOrders.supplierId,
        })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, request.purchaseOrderId),
            eq(purchaseOrders.projectId, projectId)
          )
        )
        .limit(1)
      if (!po) throw new NotFoundError('PO tidak ditemukan')

      const items = await tx
        .select({
          id: purchaseOrderItems.id,
          productVariantId: purchaseOrderItems.productVariantId,
          qtyReceived: purchaseOrderItems.qtyReceived,
          qtyReturned: purchaseOrderItems.qtyReturned,
          unitCost: purchaseOrderItems.unitCost,
        })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, request.purchaseOrderId))
      const byId = new Map(items.map((i) => [i.id, i]))

      let total = 0n
      const lines: Array<{ productVariantId: string; qty: number; unitCost: string }> = []
      for (const req of request.items) {
        const item = byId.get(req.itemId)
        if (!item) throw new ValidationError('Barang bukan bagian dari PO ini')
        const returnable = item.qtyReceived - item.qtyReturned
        if (req.qty <= 0 || req.qty > returnable) {
          throw new ValidationError(`Qty retur melebihi sisa diterima (${returnable})`)
        }
        total += fromDecimalString(item.unitCost) * BigInt(req.qty)
        lines.push({
          productVariantId: item.productVariantId,
          qty: req.qty,
          unitCost: item.unitCost,
        })

        const location = {
          projectId,
          branchId: po.branchId,
          productVariantId: item.productVariantId,
        }
        const currentQty = await inventoryRepository.lockBalance(tx, location)
        const plan = planStockMovement(
          { type: 'purchase_return', qty: req.qty, referenceId: request.purchaseOrderId },
          currentQty
        )
        await inventoryRepository.setBalance(tx, location, plan.quantityAfter, context.userId)
        await inventoryRepository.appendMovement(tx, location, plan, context.userId)

        await tx
          .update(purchaseOrderItems)
          .set({ qtyReturned: item.qtyReturned + req.qty })
          .where(eq(purchaseOrderItems.id, item.id))
      }

      const [ret] = await tx
        .insert(purchaseReturns)
        .values({
          projectId,
          purchaseOrderId: request.purchaseOrderId,
          branchId: po.branchId,
          refundAmount: toDecimalString(total),
          reason: request.reason.trim() || null,
          createdBy: context.userId,
          updatedBy: context.userId,
        })
        .returning({ id: purchaseReturns.id })
      await tx.insert(purchaseReturnItems).values(
        lines.map((l) => ({
          projectId,
          returnId: ret!.id,
          productVariantId: l.productVariantId,
          qty: l.qty,
          unitCost: l.unitCost,
        }))
      )
      return total
    })

    await auditRepository.log({
      action: 'update',
      resource: 'purchase_order',
      resourceId: request.purchaseOrderId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { type: 'return_to_supplier', refund: toDecimalString(refund) },
    })
    logger.info(
      { projectId, purchaseOrderId: request.purchaseOrderId },
      'purchase returned to supplier'
    )
    return { refundAmount: toDecimalString(refund) }
  }

  // Record a supplier payment against a PO (utang). Rejects overpayment. Gated expense:manage.
  async payPurchase(
    projectId: string,
    purchaseOrderId: string,
    input: { amount: string; method: PayMethod | null; note: string | null },
    context: PurchasingContext
  ): Promise<void> {
    await requirePermission(projectId, context.userId, FINANCE)
    const pay = fromDecimalString(input.amount)
    if (pay <= 0n) throw new ValidationError('Jumlah bayar harus lebih dari 0')

    await withTenant(projectId, async (tx) => {
      const [po] = await tx
        .select({ total: purchaseOrders.totalAmount, status: purchaseOrders.status })
        .from(purchaseOrders)
        .where(and(eq(purchaseOrders.id, purchaseOrderId), eq(purchaseOrders.projectId, projectId)))
        .limit(1)
      if (!po) throw new NotFoundError('PO tidak ditemukan')
      if (po.status === 'cancelled') throw new ValidationError('PO sudah dibatalkan')

      const [paidRow] = await tx
        .select({ paid: sql<string>`coalesce(sum(${purchasePayments.amount}), 0)` })
        .from(purchasePayments)
        .where(eq(purchasePayments.purchaseOrderId, purchaseOrderId))
      const outstanding = fromDecimalString(po.total) - fromDecimalString(paidRow?.paid ?? '0')
      if (pay > outstanding) {
        throw new ValidationError(`Melebihi sisa hutang (${toDecimalString(outstanding)})`)
      }

      await tx.insert(purchasePayments).values({
        projectId,
        purchaseOrderId,
        amount: input.amount,
        method: input.method,
        note: input.note ? sanitizeText(input.note) : null,
        createdBy: context.userId,
      })
    })

    await auditRepository.log({
      action: 'update',
      resource: 'purchase_order',
      resourceId: purchaseOrderId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { type: 'payment', amount: input.amount },
    })
  }

  // Payables: non-cancelled POs with total, paid, and outstanding. Gated expense:manage.
  async listPayables(projectId: string, userId: string): Promise<PayableRow[]> {
    await requirePermission(projectId, userId, FINANCE)
    return withTenant(projectId, async (tx) => {
      const rows = await tx
        .select({
          id: purchaseOrders.id,
          supplier: suppliers.name,
          orderDate: purchaseOrders.orderDate,
          status: purchaseOrders.status,
          total: purchaseOrders.totalAmount,
          paid: sql<string>`coalesce((select sum(pp.amount) from purchase_payments pp where pp.purchase_order_id = ${purchaseOrders.id}), 0)`,
        })
        .from(purchaseOrders)
        .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
        .where(
          and(
            eq(purchaseOrders.projectId, projectId),
            isNull(purchaseOrders.deletedAt),
            ne(purchaseOrders.status, 'cancelled')
          )
        )
        .orderBy(desc(purchaseOrders.orderDate))
        .limit(300)
      return rows.map((r) => ({
        id: r.id,
        supplier: r.supplier,
        orderDate: r.orderDate,
        status: r.status,
        total: r.total,
        paid: r.paid,
        outstanding: toDecimalString(fromDecimalString(r.total) - fromDecimalString(r.paid)),
      }))
    })
  }

  async payablesTotal(projectId: string, userId: string): Promise<string> {
    await requirePermission(projectId, userId, FINANCE)
    return withTenant(projectId, async (tx) => {
      const [row] = await tx
        .select({
          total: sql<string>`coalesce(sum(${purchaseOrders.totalAmount}), 0) - coalesce((select sum(pp.amount) from purchase_payments pp join purchase_orders o on o.id = pp.purchase_order_id where o.project_id = ${projectId} and o.deleted_at is null and o.status <> 'cancelled'), 0)`,
        })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.projectId, projectId),
            isNull(purchaseOrders.deletedAt),
            ne(purchaseOrders.status, 'cancelled')
          )
        )
      return row?.total ?? '0'
    })
  }

  async listOrders(projectId: string, userId: string) {
    await requirePermission(projectId, userId, MANAGE)
    const branch = alias(branches, 'po_branch')
    return withTenant(projectId, (tx) =>
      tx
        .select({
          id: purchaseOrders.id,
          supplier: suppliers.name,
          branch: branch.name,
          status: purchaseOrders.status,
          totalAmount: purchaseOrders.totalAmount,
          orderDate: purchaseOrders.orderDate,
          note: purchaseOrders.note,
          createdByEmail: users.email,
        })
        .from(purchaseOrders)
        .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
        .leftJoin(branch, eq(branch.id, purchaseOrders.branchId))
        .leftJoin(users, eq(users.id, purchaseOrders.createdBy))
        .where(and(eq(purchaseOrders.projectId, projectId), isNull(purchaseOrders.deletedAt)))
        .orderBy(desc(purchaseOrders.orderDate))
        .limit(200)
    )
  }
}

export const purchasingService = new PurchasingService()
