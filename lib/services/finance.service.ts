import { createHash } from 'node:crypto'
import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { financialMutations, users } from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { requirePermission } from '@/lib/rbac'
import { NotFoundError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'
import type { ParsedMutation } from '@/lib/import/bca-mutation'

const MANAGE: Parameters<typeof requirePermission>[2] = 'expense:manage'

export interface FinanceContext {
  userId: string
  ip: string
  userAgent: string
}

export interface MutationFilter {
  direction?: 'in' | 'out'
  reconciled?: boolean
  startDate?: string
  endDate?: string
  limit?: number
}

export interface MutationRow {
  id: string
  bank: string
  direction: 'in' | 'out'
  amount: string
  balanceAfter: string | null
  mutationDate: string
  description: string
  reconciled: boolean
  note: string | null
  createdByEmail: string | null
}

function dedupHash(bank: string, m: ParsedMutation): string {
  const key = [
    bank,
    m.mutationDate,
    m.amount,
    m.direction,
    m.description,
    m.balanceAfter ?? '',
  ].join('|')
  return createHash('sha256').update(key).digest('hex')
}

export class FinanceService {
  // Import parsed statement rows. Duplicate rows (same natural key) are skipped both
  // within the file and against what's already stored, so re-importing is safe.
  async importMutations(
    request: { projectId: string; bank: string; rows: ParsedMutation[] },
    context: FinanceContext
  ): Promise<{ imported: number; skipped: number }> {
    await requirePermission(request.projectId, context.userId, MANAGE)

    const unique = new Map<string, ParsedMutation & { hash: string }>()
    for (const row of request.rows) {
      const hash = dedupHash(request.bank, row)
      if (!unique.has(hash)) unique.set(hash, { ...row, hash })
    }

    const values = [...unique.values()].map((m) => ({
      projectId: request.projectId,
      bank: request.bank,
      source: 'import' as const,
      direction: m.direction,
      amount: m.amount,
      balanceAfter: m.balanceAfter,
      mutationDate: m.mutationDate,
      description: m.description,
      dedupHash: m.hash,
      createdBy: context.userId,
      updatedBy: context.userId,
    }))

    let imported = 0
    if (values.length > 0) {
      const inserted = await withTenant(request.projectId, (tx) =>
        tx
          .insert(financialMutations)
          .values(values)
          .onConflictDoNothing({
            target: [financialMutations.projectId, financialMutations.dedupHash],
          })
          .returning({ id: financialMutations.id })
      )
      imported = inserted.length
    }

    await auditRepository.log({
      action: 'create',
      resource: 'financial_mutation',
      resourceId: null,
      userId: context.userId,
      projectId: request.projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { bank: request.bank, imported, skipped: request.rows.length - imported },
    })

    logger.info(
      { projectId: request.projectId, bank: request.bank, imported },
      'financial mutations imported'
    )
    return { imported, skipped: request.rows.length - imported }
  }

  async list(
    projectId: string,
    userId: string,
    filter: MutationFilter = {}
  ): Promise<MutationRow[]> {
    await requirePermission(projectId, userId, MANAGE)

    return withTenant(projectId, (tx) => {
      const conditions = [eq(financialMutations.projectId, projectId)]
      if (filter.direction) conditions.push(eq(financialMutations.direction, filter.direction))
      if (filter.reconciled !== undefined)
        conditions.push(eq(financialMutations.reconciled, filter.reconciled))
      if (filter.startDate) conditions.push(gte(financialMutations.mutationDate, filter.startDate))
      if (filter.endDate) conditions.push(lte(financialMutations.mutationDate, filter.endDate))

      return tx
        .select({
          id: financialMutations.id,
          bank: financialMutations.bank,
          direction: financialMutations.direction,
          amount: financialMutations.amount,
          balanceAfter: financialMutations.balanceAfter,
          mutationDate: financialMutations.mutationDate,
          description: financialMutations.description,
          reconciled: financialMutations.reconciled,
          note: financialMutations.note,
          createdByEmail: users.email,
        })
        .from(financialMutations)
        .leftJoin(users, eq(users.id, financialMutations.createdBy))
        .where(and(...conditions))
        .orderBy(desc(financialMutations.mutationDate), desc(financialMutations.createdAt))
        .limit(Math.min(filter.limit ?? 200, 500))
    })
  }

  async summary(
    projectId: string,
    userId: string,
    range: { startDate?: string; endDate?: string } = {}
  ): Promise<{ totalIn: string; totalOut: string; unreconciled: number }> {
    await requirePermission(projectId, userId, MANAGE)

    return withTenant(projectId, async (tx) => {
      const conditions = [eq(financialMutations.projectId, projectId)]
      if (range.startDate) conditions.push(gte(financialMutations.mutationDate, range.startDate))
      if (range.endDate) conditions.push(lte(financialMutations.mutationDate, range.endDate))

      const [totals] = await tx
        .select({
          totalIn: sql<string>`coalesce(sum(${financialMutations.amount}) filter (where ${financialMutations.direction} = 'in'), 0)`,
          totalOut: sql<string>`coalesce(sum(${financialMutations.amount}) filter (where ${financialMutations.direction} = 'out'), 0)`,
        })
        .from(financialMutations)
        .where(and(...conditions))

      const [unmatched] = await tx
        .select({ n: count() })
        .from(financialMutations)
        .where(and(...conditions, eq(financialMutations.reconciled, false)))

      return {
        totalIn: totals?.totalIn ?? '0',
        totalOut: totals?.totalOut ?? '0',
        unreconciled: unmatched?.n ?? 0,
      }
    })
  }

  // Mark a mutation reconciled (or not) and optionally attach a note. Kept simple: linking
  // to a specific expense/income record can layer matched_type/matched_id on top later.
  async setReconciled(
    projectId: string,
    mutationId: string,
    reconciled: boolean,
    note: string | null,
    context: FinanceContext
  ): Promise<void> {
    await requirePermission(projectId, context.userId, MANAGE)

    const updated = await withTenant(projectId, (tx) =>
      tx
        .update(financialMutations)
        .set({ reconciled, note, updatedBy: context.userId })
        .where(
          and(eq(financialMutations.id, mutationId), eq(financialMutations.projectId, projectId))
        )
        .returning({ id: financialMutations.id })
    )
    if (updated.length === 0) throw new NotFoundError('Mutasi tidak ditemukan')

    await auditRepository.log({
      action: 'update',
      resource: 'financial_mutation',
      resourceId: mutationId,
      userId: context.userId,
      projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { reconciled },
    })
  }
}

export const financeService = new FinanceService()
