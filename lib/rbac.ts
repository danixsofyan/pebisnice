import { db } from '@/lib/db'
import { withTenant } from '@/lib/db/tenant'
import { teamMembers, projects } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { ForbiddenError } from '@/lib/errors/app-error'

import { hasRolePermission, isBranchAllowed } from '@/lib/authz/permissions'
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
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1)

  if (!project) return false
  if (project.userId === userId) return true

  const [member] = await withTenant(projectId, (tx) =>
    tx
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.projectId, projectId),
          eq(teamMembers.userId, userId),
          eq(teamMembers.status, 'active'),
          isNull(teamMembers.deletedAt)
        )
      )
      .limit(1)
  )

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

/**
 * Memastikan pengguna boleh menyentuh cabang tertentu. Pemilik project selalu
 * boleh; anggota tim hanya boleh bila `branch_id`-nya NULL (seluruh cabang)
 * atau cocok dengan cabang yang dituju.
 */
export async function requireBranchAccess(
  projectId: string,
  userId: string,
  branchId: string
): Promise<void> {
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1)

  if (project?.userId === userId) return

  const [member] = await withTenant(projectId, (tx) =>
    tx
      .select({ branchId: teamMembers.branchId })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.projectId, projectId),
          eq(teamMembers.userId, userId),
          eq(teamMembers.status, 'active'),
          isNull(teamMembers.deletedAt)
        )
      )
      .limit(1)
  )

  if (!member || !isBranchAllowed(member.branchId, branchId)) {
    throw new ForbiddenError('Anda tidak memiliki akses ke cabang ini.')
  }
}
