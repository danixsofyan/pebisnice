import { and, desc, eq, isNull } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import {
  branches,
  productCostHistory,
  productVariants,
  purchaseOrderItems,
  purchaseOrders,
  suppliers,
  users,
} from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'
import { inventoryRepository } from '@/lib/repositories/inventory.repository'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { planStockMovement } from '@/lib/domain/inventory/stock-movement'
import { fromDecimalString, toDecimalString } from '@/lib/domain/money'
import { requireBranchAccess, requirePermission } from '@/lib/rbac'
import { sanitizeText } from '@/lib/security/sanitizer'
import { NotFoundError, ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

const MANAGE: Parameters<typeof requirePermission>[2] = 'inventory:adjust'

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

    const values = {
      name: sanitizeText(input.name),
      phone: input.phone ? sanitizeText(input.phone) : null,
      email: input.email ? sanitizeText(input.email) : null,
      address: input.address ? sanitizeText(input.address) : null,
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
    return withTenant(projectId, (tx) =>
      tx
        .select({
          id: suppliers.id,
          name: suppliers.name,
          phone: suppliers.phone,
          email: suppliers.email,
          note: suppliers.note,
        })
        .from(suppliers)
        .where(and(eq(suppliers.projectId, projectId), isNull(suppliers.deletedAt)))
        .orderBy(suppliers.name)
        .limit(500)
    )
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

  // Receive an ordered PO: stock in per item and refresh each variant's cost from the
  // purchase price (logged to the cost history), then mark the PO received.
  async receiveOrder(
    projectId: string,
    purchaseOrderId: string,
    context: PurchasingContext
  ): Promise<void> {
    await requirePermission(projectId, context.userId, MANAGE)

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
        throw new ValidationError('PO ini sudah diterima atau dibatalkan')

      const items = await tx
        .select({
          productVariantId: purchaseOrderItems.productVariantId,
          qty: purchaseOrderItems.qty,
          unitCost: purchaseOrderItems.unitCost,
        })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId))

      for (const item of items) {
        const location = {
          projectId,
          branchId: po.branchId,
          productVariantId: item.productVariantId,
        }
        const currentQty = await inventoryRepository.lockBalance(tx, location)
        const plan = planStockMovement(
          { type: 'purchase', qty: item.qty, referenceId: purchaseOrderId },
          currentQty
        )
        await inventoryRepository.setBalance(tx, location, plan.quantityAfter, context.userId)
        await inventoryRepository.appendMovement(tx, location, plan, context.userId)

        // Refresh standard cost from the purchase price when it changed.
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

      await tx
        .update(purchaseOrders)
        .set({ status: 'received', receivedAt: new Date(), updatedBy: context.userId })
        .where(eq(purchaseOrders.id, purchaseOrderId))
    })

    await auditRepository.log({
      action: 'update',
      resource: 'purchase_order',
      resourceId: purchaseOrderId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { type: 'receive' },
    })
    logger.info({ projectId, purchaseOrderId }, 'purchase order received')
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
