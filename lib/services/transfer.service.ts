import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { branches, stockTransferItems, stockTransfers, users } from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'
import { inventoryRepository } from '@/lib/repositories/inventory.repository'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { planStockMovement } from '@/lib/domain/inventory/stock-movement'
import { requireBranchAccess, requirePermission } from '@/lib/rbac'
import { ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

export interface TransferContext {
  userId: string
  ip: string
  userAgent: string
}

export interface TransferRow {
  id: string
  fromBranch: string | null
  toBranch: string | null
  itemCount: number
  totalQty: number
  note: string | null
  createdByEmail: string | null
  createdAt: Date
}

export class TransferService {
  // Move stock between two branches: source down, destination up, in one transaction.
  async createTransfer(
    projectId: string,
    request: {
      fromBranchId: string
      toBranchId: string
      note: string | null
      items: Array<{ productVariantId: string; qty: number }>
    },
    context: TransferContext
  ): Promise<{ id: string }> {
    await requirePermission(projectId, context.userId, 'inventory:adjust')
    if (request.fromBranchId === request.toBranchId) {
      throw new ValidationError('Cabang asal dan tujuan harus berbeda')
    }
    if (request.items.length === 0) throw new ValidationError('Pilih minimal satu barang')
    await requireBranchAccess(projectId, context.userId, request.fromBranchId)
    await requireBranchAccess(projectId, context.userId, request.toBranchId)

    const created = await withTenant(projectId, async (tx) => {
      const [header] = await tx
        .insert(stockTransfers)
        .values({
          projectId,
          fromBranchId: request.fromBranchId,
          toBranchId: request.toBranchId,
          note: request.note,
          createdBy: context.userId,
          updatedBy: context.userId,
        })
        .returning({ id: stockTransfers.id })

      await tx.insert(stockTransferItems).values(
        request.items.map((i) => ({
          projectId,
          transferId: header!.id,
          productVariantId: i.productVariantId,
          qty: i.qty,
        }))
      )

      for (const item of request.items) {
        const source = {
          projectId,
          branchId: request.fromBranchId,
          productVariantId: item.productVariantId,
        }
        const sourceQty = await inventoryRepository.lockBalance(tx, source)
        const outPlan = planStockMovement(
          { type: 'transfer_out', qty: item.qty, referenceId: header!.id },
          sourceQty
        )
        await inventoryRepository.setBalance(tx, source, outPlan.quantityAfter, context.userId)
        await inventoryRepository.appendMovement(tx, source, outPlan, context.userId)

        const dest = {
          projectId,
          branchId: request.toBranchId,
          productVariantId: item.productVariantId,
        }
        const destQty = await inventoryRepository.lockBalance(tx, dest)
        const inPlan = planStockMovement(
          { type: 'transfer_in', qty: item.qty, referenceId: header!.id },
          destQty
        )
        await inventoryRepository.setBalance(tx, dest, inPlan.quantityAfter, context.userId)
        await inventoryRepository.appendMovement(tx, dest, inPlan, context.userId)
      }

      return header!
    })

    await auditRepository.log({
      action: 'update',
      resource: 'stock_transfer',
      resourceId: created.id,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: {
        fromBranchId: request.fromBranchId,
        toBranchId: request.toBranchId,
        itemCount: request.items.length,
      },
    })
    logger.info({ projectId, transferId: created.id }, 'stock transfer created')
    return created
  }

  async list(projectId: string, userId: string): Promise<TransferRow[]> {
    await requirePermission(projectId, userId, 'inventory:adjust')
    const fromBranch = alias(branches, 'from_branch')
    const toBranch = alias(branches, 'to_branch')

    return withTenant(projectId, async (tx) => {
      const rows = await tx
        .select({
          id: stockTransfers.id,
          fromBranch: fromBranch.name,
          toBranch: toBranch.name,
          note: stockTransfers.note,
          createdByEmail: users.email,
          createdAt: stockTransfers.createdAt,
        })
        .from(stockTransfers)
        .leftJoin(fromBranch, eq(fromBranch.id, stockTransfers.fromBranchId))
        .leftJoin(toBranch, eq(toBranch.id, stockTransfers.toBranchId))
        .leftJoin(users, eq(users.id, stockTransfers.createdBy))
        .where(and(eq(stockTransfers.projectId, projectId), isNull(stockTransfers.deletedAt)))
        .orderBy(desc(stockTransfers.createdAt))
        .limit(200)

      if (rows.length === 0) return []

      const totals = await tx
        .select({
          transferId: stockTransferItems.transferId,
          itemCount: sql<number>`count(*)::int`,
          totalQty: sql<number>`coalesce(sum(${stockTransferItems.qty}), 0)::int`,
        })
        .from(stockTransferItems)
        .where(
          inArray(
            stockTransferItems.transferId,
            rows.map((r) => r.id)
          )
        )
        .groupBy(stockTransferItems.transferId)
      const byId = new Map(totals.map((t) => [t.transferId, t]))

      return rows.map((r) => ({
        id: r.id,
        fromBranch: r.fromBranch,
        toBranch: r.toBranch,
        itemCount: byId.get(r.id)?.itemCount ?? 0,
        totalQty: byId.get(r.id)?.totalQty ?? 0,
        note: r.note,
        createdByEmail: r.createdByEmail,
        createdAt: r.createdAt,
      }))
    })
  }
}

export const transferService = new TransferService()
