import { db } from '@/lib/db'
import { teamMembers, projects } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { ForbiddenError } from '@/lib/errors/app-error'

import { hasRolePermission } from '@/lib/authz/permissions'
import type { Permission } from '@/lib/authz/permissions'

export * from '@/lib/authz/permissions'

export async function checkPermission(
  projectId: string,
  userId: string,
  permission: Permission
): Promise<boolean> {
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project) return false
  if (project.userId === userId) return true

  const [member] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.projectId, projectId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, 'active')
      )
    )
    .limit(1)

  if (!member) return false
  return hasRolePermission(member.role, permission)
}

export async function requirePermission(
  projectId: string,
  userId: string,
  permission: Permission
): Promise<void> {
  const ok = await checkPermission(projectId, userId, permission)
  if (!ok) throw new ForbiddenError('Anda tidak memiliki izin untuk melakukan tindakan ini.')
}
