import { db } from '@/lib/db'
import { teamMembers, projects } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { ForbiddenError } from '@/lib/errors/app-error'

export type Permission =
  | 'project:view'
  | 'project:edit'
  | 'project:delete'
  | 'store:manage'
  | 'product:manage'
  | 'report:view'
  | 'team:manage'
  | 'data:upload'

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: [
    'project:view',
    'project:edit',
    'project:delete',
    'store:manage',
    'product:manage',
    'report:view',
    'team:manage',
    'data:upload',
  ],
  admin: [
    'project:view',
    'project:edit',
    'store:manage',
    'product:manage',
    'report:view',
    'team:manage',
    'data:upload',
  ],
  finance: ['project:view', 'report:view'],
  operator: ['project:view', 'data:upload'],
}

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
  return ROLE_PERMISSIONS[member.role]?.includes(permission) ?? false
}

export async function requirePermission(
  projectId: string,
  userId: string,
  permission: Permission
): Promise<void> {
  const ok = await checkPermission(projectId, userId, permission)
  if (!ok) throw new ForbiddenError('Anda tidak memiliki izin untuk melakukan tindakan ini.')
}
