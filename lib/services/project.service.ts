import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { projectRepository } from '@/lib/repositories/project.repository'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { requirePermission } from '@/lib/rbac'
import { AppError, ForbiddenError, NotFoundError } from '@/lib/errors/app-error'
import { sanitizeText } from '@/lib/security/sanitizer'
import { logger } from '@/lib/logging/logger'
import { revalidatePath } from 'next/cache'

import type { CreateProjectInput, UpdateProjectInput } from '@/lib/domain/validators/project.schema'

export type { CreateProjectInput, UpdateProjectInput }

export class ProjectService {
  async getAll(userId: string) {
    return projectRepository.findAllByUser(userId)
  }

  async getByIdOrThrow(projectId: string, userId: string) {
    const project = await projectRepository.findByIdAndUser(projectId, userId)
    if (!project) throw new NotFoundError('Project tidak ditemukan')
    return project
  }

  // Project detail for settings; permission-based (not owner-only) so a non-owner admin can read it.
  async getSettings(projectId: string, userId: string) {
    await requirePermission(projectId, userId, 'project:view')
    const [row] = await db
      .select({
        name: projects.name,
        description: projects.description,
        defaultCalcMethod: projects.defaultCalcMethod,
        currency: projects.currency,
        timezone: projects.timezone,
        taxRateBasisPoints: projects.taxRateBasisPoints,
        taxInclusive: projects.taxInclusive,
        waNumber: projects.waNumber,
        loyaltyEnabled: projects.loyaltyEnabled,
        loyaltyEarnRate: projects.loyaltyEarnRate,
        loyaltyRedeemValue: projects.loyaltyRedeemValue,
      })
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1)
    if (!row) throw new NotFoundError('Project tidak ditemukan')
    return row
  }

  async create(
    userId: string,
    input: CreateProjectInput,
    requestMeta: { ip: string; userAgent: string }
  ) {
    const sanitized = {
      userId,
      name: sanitizeText(input.name),
      description: input.description ? sanitizeText(input.description) : undefined,
      defaultCalcMethod: input.defaultCalcMethod,
    }

    const project = await projectRepository.createWithDefaultBranch(sanitized)

    await auditRepository.log({
      action: 'create',
      resource: 'project',
      resourceId: project.id,
      userId,
      projectId: project.id,
      ipAddress: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      metadata: { name: project.name },
    })

    logger.info({ userId, projectId: project.id }, 'Project created')

    revalidatePath('/dashboard/projects')
    return project
  }

  async update(
    projectId: string,
    userId: string,
    input: UpdateProjectInput,
    requestMeta: { ip: string; userAgent: string }
  ) {
    await requirePermission(projectId, userId, 'project:edit')

    const sanitized: UpdateProjectInput = {}
    if (input.name !== undefined) sanitized.name = sanitizeText(input.name)
    if (input.description !== undefined) sanitized.description = sanitizeText(input.description)
    if (input.defaultCalcMethod !== undefined) sanitized.defaultCalcMethod = input.defaultCalcMethod
    if (input.taxRateBasisPoints !== undefined)
      sanitized.taxRateBasisPoints = input.taxRateBasisPoints
    if (input.taxInclusive !== undefined) sanitized.taxInclusive = input.taxInclusive
    if (input.waNumber !== undefined)
      sanitized.waNumber = input.waNumber ? input.waNumber.replace(/[^\d]/g, '') : null
    if (input.loyaltyEnabled !== undefined) sanitized.loyaltyEnabled = input.loyaltyEnabled
    if (input.loyaltyEarnRate !== undefined) sanitized.loyaltyEarnRate = input.loyaltyEarnRate
    if (input.loyaltyRedeemValue !== undefined)
      sanitized.loyaltyRedeemValue = input.loyaltyRedeemValue

    const updated = await projectRepository.update(projectId, sanitized)
    if (!updated) throw new NotFoundError('Project tidak ditemukan')

    await auditRepository.log({
      action: 'update',
      resource: 'project',
      resourceId: projectId,
      userId,
      projectId,
      ipAddress: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      metadata: { changes: Object.keys(sanitized) },
    })

    logger.info({ userId, projectId }, 'Project updated')
    revalidatePath(`/dashboard/projects/${projectId}`)
    return updated
  }

  async archive(projectId: string, userId: string, requestMeta: { ip: string; userAgent: string }) {
    const project = await projectRepository.findByIdAndUser(projectId, userId)
    if (!project) throw new NotFoundError('Project tidak ditemukan')
    if (project.userId !== userId)
      throw new ForbiddenError('Hanya owner yang dapat mengarsipkan project')

    const success = await projectRepository.archive(projectId)
    if (!success) throw new AppError('Gagal mengarsipkan project')

    await auditRepository.log({
      action: 'delete',
      resource: 'project',
      resourceId: projectId,
      userId,
      projectId,
      ipAddress: requestMeta.ip,
      userAgent: requestMeta.userAgent,
    })

    revalidatePath('/dashboard/projects')
  }
}

export const projectService = new ProjectService()
