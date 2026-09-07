import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branches, projects, teamMembers, users } from '@/lib/db/schema'
import { withTenant } from '@/lib/db/tenant'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { requireBranchAccess, requirePermission } from '@/lib/rbac'
import type { TeamRole } from '@/lib/authz/permissions'
import { ValidationError, NotFoundError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'
import { sendEmail } from '@/lib/email/mailer'
import { teamInviteEmail } from '@/lib/email/templates'
import { generateTempPassword, hashPassword } from '@/lib/auth/password'

/** Roles assignable via the UI; 'owner' and legacy 'operator' are excluded. */
export const ASSIGNABLE_ROLES: TeamRole[] = ['admin', 'manager', 'finance', 'cashier', 'production']

export type MemberStatus = 'active' | 'invited' | 'disabled'

export interface TeamContext {
  userId: string
  ip: string
  userAgent: string
  /** Request origin (scheme + host of the app), used to build the invite link. */
  origin?: string
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

  // Add a member by email. If the email already has an account it is linked and activated at once.
  // Otherwise a new password-login account is created with a temporary password (emailed to them,
  // must be changed on first login) so an invited employee can sign in without a Google account.
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

    const existingAccount = (
      await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    )[0]

    // Create a password-login account for a brand-new invitee.
    let userId = existingAccount?.id ?? null
    let tempPassword: string | null = null
    if (!existingAccount) {
      tempPassword = generateTempPassword()
      const [created] = await db
        .insert(users)
        .values({
          email,
          name: email.split('@')[0]?.split('+')[0] ?? null,
          passwordHash: await hashPassword(tempPassword),
          mustChangePassword: true,
        })
        .returning({ id: users.id })
      userId = created!.id
    }

    const [member] = await db
      .insert(teamMembers)
      .values({
        projectId: request.projectId,
        email,
        role: request.role,
        branchId: request.branchId,
        userId,
        status: 'active',
        acceptedAt: new Date(),
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
      metadata: { email, role: request.role, newAccount: Boolean(tempPassword) },
    })
    logger.info(
      { projectId: request.projectId, email, newAccount: Boolean(tempPassword) },
      'team member added'
    )

    // Email the temporary credentials only to a newly created account. Failure must not fail the
    // invite, which is already committed above.
    if (tempPassword && context.origin) {
      try {
        const [proj] = await db
          .select({ name: projects.name })
          .from(projects)
          .where(eq(projects.id, request.projectId))
          .limit(1)
        await sendEmail(
          teamInviteEmail({
            to: email,
            projectName: proj?.name ?? 'Pebisnice',
            role: request.role,
            loginUrl: `${context.origin}/login`,
            tempPassword,
          })
        )
      } catch (error) {
        logger.error({ err: error, projectId: request.projectId, email }, 'invite email failed')
      }
    }

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
