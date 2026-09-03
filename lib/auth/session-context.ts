import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branches, projects, teamMembers } from '@/lib/db/schema'
import { getUserFromSession } from '@/lib/auth-utils'
import { canRoleViewCost, type TeamRole } from '@/lib/authz/permissions'
import { NotFoundError } from '@/lib/errors/app-error'

export interface SessionContext {
  userId: string
  projectId: string
  projectName: string
  role: TeamRole
  /** NULL berarti akses seluruh cabang. */
  branchId: string | null
  canViewCost: boolean
}

/**
 * Menentukan project dan peran aktif pengguna.
 *
 * Pemilik project mendapat peran `owner`; selain itu perannya diambil dari
 * keanggotaan tim. Dipanggil di setiap server action supaya tidak ada halaman
 * yang perlu mengoper `projectId` dari client — nilai dari client tidak bisa
 * dipercaya untuk menentukan tenant.
 */
export async function getSessionContext(): Promise<SessionContext> {
  const user = await getUserFromSession()

  const rows = await db
    .select({
      projectId: projects.id,
      projectName: projects.name,
      ownerId: projects.userId,
      memberRole: teamMembers.role,
      memberBranchId: teamMembers.branchId,
    })
    .from(projects)
    .leftJoin(
      teamMembers,
      and(
        eq(teamMembers.projectId, projects.id),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.status, 'active'),
        isNull(teamMembers.deletedAt)
      )
    )
    .where(
      and(
        eq(projects.isArchived, false),
        isNull(projects.deletedAt),
        or(eq(projects.userId, user.id), sql`${teamMembers.id} IS NOT NULL`)
      )
    )
    .orderBy(projects.createdAt)
    .limit(1)

  const row = rows[0]
  if (!row) throw new NotFoundError('Anda belum tergabung dalam project manapun.')

  const isOwner = row.ownerId === user.id
  const role: TeamRole = isOwner ? 'owner' : ((row.memberRole ?? 'cashier') as TeamRole)

  return {
    userId: user.id,
    projectId: row.projectId,
    projectName: row.projectName,
    role,
    branchId: isOwner ? null : row.memberBranchId,
    canViewCost: canRoleViewCost(role),
  }
}

/**
 * Cabang yang boleh diakses pengguna. Anggota yang terikat satu cabang hanya
 * melihat cabangnya sendiri.
 */
export async function getAccessibleBranches(context: SessionContext) {
  const all = await db
    .select({ id: branches.id, name: branches.name, code: branches.code })
    .from(branches)
    .where(and(eq(branches.projectId, context.projectId), isNull(branches.deletedAt)))
    .orderBy(branches.name)

  if (context.branchId === null) return all
  return all.filter((branch) => branch.id === context.branchId)
}
