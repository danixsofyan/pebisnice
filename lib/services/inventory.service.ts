import { inventoryRepository, type StockLocation } from '@/lib/repositories/inventory.repository'
import {
  planStockMovement,
  type PlannedStockMovement,
  type StockMovementCommand,
} from '@/lib/domain/inventory/stock-movement'
import { withTenant, type Transaction } from '@/lib/db/tenant'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { requireBranchAccess, requirePermission } from '@/lib/rbac'
import { ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

export interface OpnameResultRow {
  productVariantId: string
  before: number
  counted: number
  after: number
  delta: number
}

export interface StockMovementContext {
  userId: string
  ip: string
  userAgent: string
}

export class InventoryService {
  // The only stock-mutation path. Effects are computed in the domain layer, then applied in one transaction with the balance row locked, so two concurrent sales can't oversell.
  async applyStockMovement(
    location: StockLocation,
    command: StockMovementCommand,
    context: StockMovementContext
  ): Promise<PlannedStockMovement> {
    await requirePermission(location.projectId, context.userId, 'product:manage')
    await requireBranchAccess(location.projectId, context.userId, location.branchId)

    const plan = await withTenant(location.projectId, async (tx) => {
      const currentQty = await inventoryRepository.lockBalance(tx, location)
      const planned = planStockMovement(command, currentQty)

      await inventoryRepository.setBalance(tx, location, planned.quantityAfter, context.userId)
      await inventoryRepository.appendMovement(tx, location, planned, context.userId)

      return planned
    })

    await auditRepository.log({
      action: 'update',
      resource: 'inventory',
      resourceId: location.productVariantId,
      userId: context.userId,
      projectId: location.projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: {
        branchId: location.branchId,
        movementType: plan.movementType,
        delta: plan.delta,
        quantityAfter: plan.quantityAfter,
      },
    })

    logger.info(
      {
        projectId: location.projectId,
        branchId: location.branchId,
        productVariantId: location.productVariantId,
        movementType: plan.movementType,
        delta: plan.delta,
      },
      'Stock movement applied'
    )

    return plan
  }

  // Physical stock count (opname): set each variant's balance to the counted quantity in one
  // transaction, recording the difference as an 'opname' movement. Items whose count already
  // matches are skipped (no noise movement). Gated inventory:adjust.
  async recordOpname(
    projectId: string,
    request: {
      branchId: string
      reason: string
      counts: Array<{ productVariantId: string; countedQty: number }>
    },
    context: StockMovementContext
  ): Promise<OpnameResultRow[]> {
    await requirePermission(projectId, context.userId, 'inventory:adjust')
    await requireBranchAccess(projectId, context.userId, request.branchId)
    if (request.counts.length === 0) throw new ValidationError('Isi minimal satu hitungan')
    const reason = request.reason.trim() || 'Stok opname'

    const results = await withTenant(projectId, async (tx) => {
      const out: OpnameResultRow[] = []
      for (const c of request.counts) {
        const location = {
          projectId,
          branchId: request.branchId,
          productVariantId: c.productVariantId,
        }
        const currentQty = await inventoryRepository.lockBalance(tx, location)
        if (c.countedQty === currentQty) continue // no change, no movement
        const planned = planStockMovement(
          { type: 'opname', countedQty: c.countedQty, reason },
          currentQty
        )
        await inventoryRepository.setBalance(tx, location, planned.quantityAfter, context.userId)
        await inventoryRepository.appendMovement(tx, location, planned, context.userId)
        out.push({
          productVariantId: c.productVariantId,
          before: currentQty,
          counted: c.countedQty,
          after: planned.quantityAfter,
          delta: planned.delta,
        })
      }
      return out
    })

    await auditRepository.log({
      action: 'update',
      resource: 'inventory',
      resourceId: request.branchId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { type: 'opname', branchId: request.branchId, adjusted: results.length, reason },
    })
    logger.info({ projectId, branchId: request.branchId, adjusted: results.length }, 'stock opname')
    return results
  }

  // Compare the fast balance with the ledger sum; a mismatch means a movement bypassed applyStockMovement().
  async verifyBalance(
    location: StockLocation
  ): Promise<{ balance: number; ledger: number; consistent: boolean }> {
    return withTenant(location.projectId, async (tx: Transaction) => {
      const balance = await inventoryRepository.lockBalance(tx, location)
      const ledger = await inventoryRepository.sumMovements(tx, location)

      return { balance, ledger, consistent: balance === ledger }
    })
  }
}

export const inventoryService = new InventoryService()
