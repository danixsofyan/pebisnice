import { and, eq, isNull } from 'drizzle-orm'
import { branches } from '@/lib/db/schema'
import { withTenant, type Transaction } from '@/lib/db/tenant'
import type { InferSelectModel } from 'drizzle-orm'

export type Branch = InferSelectModel<typeof branches>

export class BranchRepository {
  async findById(tx: Transaction, branchId: string): Promise<Branch | null> {
    const rows = await tx
      .select()
      .from(branches)
      .where(and(eq(branches.id, branchId), isNull(branches.deletedAt)))
      .limit(1)

    return rows[0] ?? null
  }

  async listByProject(projectId: string): Promise<Branch[]> {
    return withTenant(projectId, (tx) =>
      tx
        .select()
        .from(branches)
        .where(and(eq(branches.projectId, projectId), isNull(branches.deletedAt)))
        .orderBy(branches.name)
    )
  }
}

export const branchRepository = new BranchRepository()
