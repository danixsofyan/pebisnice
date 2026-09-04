import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm'
import { productionLogs, productionMaterials, teamMembers, users } from '@/lib/db/schema'
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
  producedBy: string | null
  wageAmount: string
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
        producedBy: input.producedBy,
        wageAmount: input.wageAmount,
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

  async workerReport(tx: Transaction, projectId: string, startDate: string, endDate: string) {
    return tx
      .select({
        memberId: teamMembers.id,
        name: users.name,
        email: teamMembers.email,
        totalQty: sql<number>`coalesce(sum(${productionLogs.quantity}), 0)::int`,
        productVariety: sql<number>`count(distinct ${productionLogs.productVariantId})::int`,
        daysWorked: sql<number>`count(distinct ${productionLogs.productionDate})::int`,
        totalWage: sql<string>`coalesce(sum(${productionLogs.wageAmount}), 0)`,
      })
      .from(productionLogs)
      .innerJoin(teamMembers, eq(teamMembers.id, productionLogs.producedBy))
      .leftJoin(users, eq(users.id, teamMembers.userId))
      .where(
        and(
          eq(productionLogs.projectId, projectId),
          isNull(productionLogs.deletedAt),
          gte(productionLogs.productionDate, startDate),
          lte(productionLogs.productionDate, endDate)
        )
      )
      .groupBy(teamMembers.id, users.name, teamMembers.email)
      .orderBy(desc(sql`sum(${productionLogs.quantity})`))
  }
}

export const productionRepository = new ProductionRepository()
