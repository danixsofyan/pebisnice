import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branches, teamMembers, users } from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { requireBranchAccess, requirePermission } from '@/lib/rbac'
import type { TeamRole } from '@/lib/authz/permissions'
import { ValidationError, NotFoundError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

/** Roles assignable via the UI; 'owner' and legacy 'operator' are excluded. */
export const ASSIGNABLE_ROLES: TeamRole[] = ['admin', 'manager', 'finance', 'cashier', 'production']

export type MemberStatus = 'active' | 'invited' | 'disabled'

export interface TeamContext {
  userId: string
  ip: string
  userAgent: string
}

export interface AddMemberRequest {
  projectId: string
  email: string
  role: TeamRole
  branchId: string | null
}

export class TeamService {
  async list(projectId: string, userId: string) {
    await requirePermission(projectId, userId, 'team:manage')

    return withTenant(projectId, (tx) =>
      tx
        .select({
          id: teamMembers.id,
          email: teamMembers.email,
          name: users.name,
          role: teamMembers.role,
          status: teamMembers.status,
          branchId: teamMembers.branchId,
          branchName: branches.name,
          linked: teamMembers.userId,
        })
        .from(teamMembers)
        .leftJoin(users, eq(users.id, teamMembers.userId))
        .leftJoin(branches, eq(branches.id, teamMembers.branchId))
        .where(and(eq(teamMembers.projectId, projectId), isNull(teamMembers.deletedAt)))
        .orderBy(teamMembers.invitedAt)
    )
  }

  // Add a member by email. If the account exists it links and activates at once; otherwise a pending invite that auto-links on their first sign-in (see linkPendingInvites).
  async addMember(request: AddMemberRequest, context: TeamContext) {
    await requirePermission(request.projectId, context.userId, 'team:manage')
    if (request.branchId) {
      await requireBranchAccess(request.projectId, context.userId, request.branchId)
    }
    if (request.role === 'owner') {
      throw new ValidationError('Peran owner tidak bisa diberikan')
    }

    const email = request.email.trim().toLowerCase()

    const existingMember = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.projectId, request.projectId),
          eq(teamMembers.email, email),
          isNull(teamMembers.deletedAt)
        )
      )
      .limit(1)
    if (existingMember.length > 0) {
      throw new ValidationError('Email ini sudah menjadi anggota')
    }

    const account = (
      await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    )[0]

    const [member] = await db
      .insert(teamMembers)
      .values({
        projectId: request.projectId,
        email,
        role: request.role,
        branchId: request.branchId,
        userId: account?.id ?? null,
        status: account ? 'active' : 'invited',
        acceptedAt: account ? new Date() : null,
        createdBy: context.userId,
        updatedBy: context.userId,
      })
      .returning()

    await auditRepository.log({
      action: 'invite',
      resource: 'team_member',
      resourceId: member!.id,
      userId: context.userId,
      projectId: request.projectId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      metadata: { email, role: request.role },
    })
    logger.info(
      { projectId: request.projectId, email, linked: Boolean(account) },
      'team member added'
    )

    return member!
  }

  async updateMember(
    projectId: string,
    memberId: string,
    fields: { role: TeamRole; branchId: string | null },
    context: TeamContext
  ): Promise<void> {
    await requirePermission(projectId, context.userId, 'team:manage')
    if (fields.role === 'owner') throw new ValidationError('Peran owner tidak bisa diberikan')
    if (fields.branchId) await requireBranchAccess(projectId, context.userId, fields.branchId)

    const rows = await db
      .update(teamMembers)
      .set({ role: fields.role, branchId: fields.branchId, updatedBy: context.userId })
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.projectId, projectId),
          isNull(teamMembers.deletedAt)
        )
      )
      .returning({ id: teamMembers.id })
    if (rows.length === 0) throw new NotFoundError('Anggota tidak ditemukan')
    logger.info({ projectId, memberId, role: fields.role }, 'team member updated')
  }

  async setStatus(
    projectId: string,
    memberId: string,
    status: 'active' | 'disabled',
    context: TeamContext
  ): Promise<void> {
    await requirePermission(projectId, context.userId, 'team:manage')

    const rows = await db
      .update(teamMembers)
      .set({ status, updatedBy: context.userId })
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.projectId, projectId),
          isNull(teamMembers.deletedAt)
        )
      )
      .returning({ id: teamMembers.id })
    if (rows.length === 0) throw new NotFoundError('Anggota tidak ditemukan')
    logger.info({ projectId, memberId, status }, 'team member status changed')
  }

  async remove(projectId: string, memberId: string, context: TeamContext): Promise<void> {
    await requirePermission(projectId, context.userId, 'team:manage')

    const rows = await db
      .update(teamMembers)
      .set({ deletedAt: new Date(), isActive: false, updatedBy: context.userId })
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.projectId, projectId),
          isNull(teamMembers.deletedAt)
        )
      )
      .returning({ id: teamMembers.id })
    if (rows.length === 0) throw new NotFoundError('Anggota tidak ditemukan')
    logger.info({ projectId, memberId }, 'team member removed')
  }

  // Link pending invites to a just-signed-in account by email. Called from the sign-in event so email invites activate on first login.
  async linkPendingInvites(userId: string, email: string): Promise<void> {
    await db
      .update(teamMembers)
      .set({ userId, status: 'active', acceptedAt: new Date() })
      .where(
        and(
          eq(teamMembers.email, email.trim().toLowerCase()),
          isNull(teamMembers.userId),
          isNull(teamMembers.deletedAt)
        )
      )
  }
}

export const teamService = new TeamService()
