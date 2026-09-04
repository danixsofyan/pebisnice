import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { branches, projects, teamMembers } from '@/lib/db/schema'
import { canRoleViewCost, type TeamRole } from '@/lib/authz/permissions'
import { AuthError } from '@/lib/errors/app-error'

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
 * Tiga keadaan yang mungkin dialami pengunjung.
 *
 * Sengaja berupa union, bukan `SessionContext | null`: bentuk nullable membuat
 * "belum login" dan "belum punya project" tidak bisa dibedakan, dan pemanggil
 * jadi mengarahkan ke tempat yang salah — atau seperti sebelumnya, melempar
 * error dan berujung layar 500.
 */
export type SessionState =
  | { status: 'unauthenticated' }
  | { status: 'no-project'; userId: string }
  | { status: 'ready'; context: SessionContext }

/** Tidak pernah melempar. Halaman yang memutuskan ke mana mengarahkan. */
export async function resolveSessionState(): Promise<SessionState> {
  const session = await auth()
  const user = session?.user

  if (!user?.id) return { status: 'unauthenticated' }

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
  if (!row) return { status: 'no-project', userId: user.id }

  const isOwner = row.ownerId === user.id
  const role: TeamRole = isOwner ? 'owner' : ((row.memberRole ?? 'cashier') as TeamRole)

  return {
    status: 'ready',
    context: {
      userId: user.id,
      projectId: row.projectId,
      projectName: row.projectName,
      role,
      branchId: isOwner ? null : row.memberBranchId,
      canViewCost: canRoleViewCost(role),
    },
  }
}

/**
 * Menuntut project aktif. Dipakai server action, di mana melempar memang
 * perilaku yang benar — `handleActionError` mengubahnya jadi pesan yang rapi.
 * Halaman sebaiknya memakai `resolveSessionState()`.
 */
export async function getSessionContext(): Promise<SessionContext> {
  const state = await resolveSessionState()

  if (state.status === 'unauthenticated') {
    throw new AuthError()
  }
  if (state.status === 'no-project') {
    throw new AuthError('Anda belum tergabung dalam project manapun.')
  }

  return state.context
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
