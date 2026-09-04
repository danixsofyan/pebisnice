import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { withTenant } from '@/lib/db/tenant'
import { branches, projects, teamMembers } from '@/lib/db/schema'
import { canRoleViewCost, type TeamRole } from '@/lib/authz/permissions'
import { AuthError } from '@/lib/errors/app-error'

export interface SessionContext {
  userId: string
  projectId: string
  projectName: string
  role: TeamRole
  /** NULL means access to all branches. */
  branchId: string | null
  canViewCost: boolean
}

// The three states a visitor can be in. A union, not SessionContext | null: the nullable shape couldn't tell 'not logged in' from 'no project', so callers redirected wrong or threw into a 500.
export type SessionState =
  | { status: 'unauthenticated' }
  | { status: 'no-project'; userId: string }
  | { status: 'ready'; context: SessionContext }

/** Never throws; the page decides where to redirect. */
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

// Requires an active project. For server actions, where throwing is correct; handleActionError turns it into a clean message. Pages should use resolveSessionState().
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

// Branches a user may access. A member bound to one branch sees only theirs.
export async function getAccessibleBranches(context: SessionContext) {
  const all = await withTenant(context.projectId, (tx) =>
    tx
      .select({ id: branches.id, name: branches.name, code: branches.code })
      .from(branches)
      .where(and(eq(branches.projectId, context.projectId), isNull(branches.deletedAt)))
      .orderBy(branches.name)
  )

  if (context.branchId === null) return all
  return all.filter((branch) => branch.id === context.branchId)
}
