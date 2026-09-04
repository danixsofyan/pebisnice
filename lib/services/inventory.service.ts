import { inventoryRepository, type StockLocation } from '@/lib/repositories/inventory.repository'
import {
  planStockMovement,
  type PlannedStockMovement,
  type StockMovementCommand,
} from '@/lib/domain/inventory/stock-movement'
import { withTenant, type Transaction } from '@/lib/db/tenant'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { requireBranchAccess, requirePermission } from '@/lib/rbac'
import { logger } from '@/lib/logging/logger'

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
