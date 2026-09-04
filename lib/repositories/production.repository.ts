import { and, desc, eq, isNull } from 'drizzle-orm'
import { productionLogs, productionMaterials } from '@/lib/db/schema'
import type { Transaction } from '@/lib/db/tenant'
import { toDecimalString } from '@/lib/domain/money'
import type { ProductionPlan } from '@/lib/domain/production/production-plan'
import type { InferSelectModel } from 'drizzle-orm'

export type ProductionLog = InferSelectModel<typeof productionLogs>

export interface RecordProductionInput {
  projectId: string
  branchId: string
  productVariantId: string
  productionDate: string
  note: string | null
  plan: ProductionPlan
  actorId: string
}

/** Cost-free summary shape, for roles without cost:view. */
const LOG_COLUMNS_WITHOUT_COST = {
  id: productionLogs.id,
  projectId: productionLogs.projectId,
  branchId: productionLogs.branchId,
  productVariantId: productionLogs.productVariantId,
  quantity: productionLogs.quantity,
  productionDate: productionLogs.productionDate,
  note: productionLogs.note,
  createdAt: productionLogs.createdAt,
} as const

const LOG_COLUMNS_WITH_COST = {
  ...LOG_COLUMNS_WITHOUT_COST,
  totalMaterialCost: productionLogs.totalMaterialCost,
  unitCost: productionLogs.unitCost,
} as const

export class ProductionRepository {
  async insertLog(tx: Transaction, input: RecordProductionInput): Promise<ProductionLog> {
    const [log] = await tx
      .insert(productionLogs)
      .values({
        projectId: input.projectId,
        branchId: input.branchId,
        productVariantId: input.productVariantId,
        quantity: input.plan.quantity,
        productionDate: input.productionDate,
        totalMaterialCost: toDecimalString(input.plan.totalMaterialCost),
        unitCost: toDecimalString(input.plan.unitCost),
        note: input.note,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      })
      .returning()

    const created = log!

    await tx.insert(productionMaterials).values(
      input.plan.materials.map((material) => ({
        projectId: input.projectId,
        productionLogId: created.id,
        productVariantId: material.productVariantId,
        quantity: material.qty,
        costAmount: toDecimalString(material.costAmount),
      }))
    )

    return created
  }

  // includeCost is decided by the service from permission, not an outside caller, mirroring the product catalog.
  async listByBranch(tx: Transaction, projectId: string, branchId: string, includeCost: boolean) {
    const where = and(
      eq(productionLogs.projectId, projectId),
      eq(productionLogs.branchId, branchId),
      isNull(productionLogs.deletedAt)
    )

    if (includeCost) {
      return tx
        .select(LOG_COLUMNS_WITH_COST)
        .from(productionLogs)
        .where(where)
        .orderBy(desc(productionLogs.productionDate))
    }

    return tx
      .select(LOG_COLUMNS_WITHOUT_COST)
      .from(productionLogs)
      .where(where)
      .orderBy(desc(productionLogs.productionDate))
  }
}

export const productionRepository = new ProductionRepository()
