import { productionRepository } from '@/lib/repositories/production.repository'
import { productRepository } from '@/lib/repositories/product.repository'
import { inventoryRepository } from '@/lib/repositories/inventory.repository'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { withTenant } from '@/lib/db/tenant'
import { fromDecimalString } from '@/lib/domain/money'
import { planProduction } from '@/lib/domain/production/production-plan'
import { planStockMovement } from '@/lib/domain/inventory/stock-movement'
import { checkPermission, requireBranchAccess, requirePermission } from '@/lib/rbac'
import { COST_PERMISSION } from '@/lib/authz/permissions'
import { NotFoundError, ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

export interface MaterialUsageRequest {
  productVariantId: string
  qty: number
}

export interface RecordProductionRequest {
  projectId: string
  branchId: string
  /** The finished variant produced. */
  productVariantId: string
  quantity: number
  productionDate: string
  note: string | null
  materials: MaterialUsageRequest[]
}

export interface ProductionContext {
  userId: string
  ip: string
  userAgent: string
}

export class ProductionService {
  // Record one production run in a single transaction: material stock down, finished stock up, log and cost snapshot saved; if any material is short the whole run aborts. The production role lacks cost:view, so money is computed server-side and not returned to it.
  async recordProduction(request: RecordProductionRequest, context: ProductionContext) {
    await requirePermission(request.projectId, context.userId, 'production:manage')
    await requireBranchAccess(request.projectId, context.userId, request.branchId)

    if (
      request.materials.some((material) => material.productVariantId === request.productVariantId)
    ) {
      throw new ValidationError('Produk jadi tidak boleh menjadi bahannya sendiri', {
        materials: ['Tidak boleh sama dengan produk jadi'],
      })
    }

    const canViewCost = await checkPermission(request.projectId, context.userId, COST_PERMISSION)

    const result = await withTenant(request.projectId, async (tx) => {
      const finished = await productRepository.findVariantWithCost(
        request.projectId,
        request.productVariantId
      )
      if (!finished) throw new NotFoundError('Varian produk jadi tidak ditemukan')

      const usages = []
      for (const requested of request.materials) {
        const variant = await productRepository.findVariantWithCost(
          request.projectId,
          requested.productVariantId
        )
        if (!variant) {
          throw new NotFoundError(`Varian bahan ${requested.productVariantId} tidak ditemukan`)
        }

        usages.push({
          productVariantId: variant.id,
          qty: requested.qty,
          hppAtTime: fromDecimalString(variant.hpp),
        })
      }

      const plan = planProduction(request.quantity, usages)

      const log = await productionRepository.insertLog(tx, {
        projectId: request.projectId,
        branchId: request.branchId,
        productVariantId: request.productVariantId,
        productionDate: request.productionDate,
        note: request.note,
        plan,
        actorId: context.userId,
      })

      for (const material of plan.materials) {
        const location = {
          projectId: request.projectId,
          branchId: request.branchId,
          productVariantId: material.productVariantId,
        }

        const currentQty = await inventoryRepository.lockBalance(tx, location)
        const movement = planStockMovement(
          { type: 'sale', qty: material.qty, referenceId: log.id },
          currentQty
        )

        await inventoryRepository.setBalance(tx, location, movement.quantityAfter, context.userId)
        await inventoryRepository.appendMovement(tx, location, movement, context.userId)
      }

      const finishedLocation = {
        projectId: request.projectId,
        branchId: request.branchId,
        productVariantId: request.productVariantId,
      }

      const finishedQty = await inventoryRepository.lockBalance(tx, finishedLocation)
      const finishedMovement = planStockMovement(
        { type: 'return', qty: plan.quantity, referenceId: log.id },
        finishedQty
      )

      await inventoryRepository.setBalance(
        tx,
        finishedLocation,
        finishedMovement.quantityAfter,
        context.userId
      )
      await inventoryRepository.appendMovement(
        tx,
        finishedLocation,
        finishedMovement,
        context.userId
      )

      return { log, plan }
    })

    await auditRepository.log({
      action: 'create',
      resource: 'production_log',
      resourceId: result.log.id,
      userId: context.userId,
      projectId: request.projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: {
        branchId: request.branchId,
        quantity: request.quantity,
        materialCount: request.materials.length,
      },
    })

    logger.info(
      { projectId: request.projectId, productionLogId: result.log.id },
      'Production recorded'
    )

    // Cost figures are returned only to roles entitled to see them.
    if (!canViewCost) {
      return { log: { id: result.log.id, quantity: result.log.quantity } }
    }

    return result
  }

  async listByBranch(projectId: string, branchId: string, userId: string) {
    await requirePermission(projectId, userId, 'project:view')
    await requireBranchAccess(projectId, userId, branchId)

    const canViewCost = await checkPermission(projectId, userId, COST_PERMISSION)

    return withTenant(projectId, (tx) =>
      productionRepository.listByBranch(tx, projectId, branchId, canViewCost)
    )
  }
}

export const productionService = new ProductionService()
