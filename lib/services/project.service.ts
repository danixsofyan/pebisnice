import { projectRepository } from '@/lib/repositories/project.repository'
import { auditRepository } from '@/lib/repositories/audit.repository'
import { requirePermission } from '@/lib/rbac'
import { AppError, ForbiddenError, NotFoundError } from '@/lib/errors/app-error'
import { sanitizeText } from '@/lib/security/sanitizer'
import { logger } from '@/lib/logging/logger'
import { revalidatePath } from 'next/cache'

export interface CreateProjectInput {
  name: string
  description?: string
  defaultCalcMethod: 'income_based' | 'order_based'
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  defaultCalcMethod?: 'income_based' | 'order_based'
}

export class ProjectService {
  async getAll(userId: string) {
    return projectRepository.findAllByUser(userId)
  }

  async getByIdOrThrow(projectId: string, userId: string) {
    const project = await projectRepository.findByIdAndUser(projectId, userId)
    if (!project) throw new NotFoundError('Project tidak ditemukan')
    return project
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

    const project = await projectRepository.create(sanitized)

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

    const updated = await projectRepository.update(projectId, userId, sanitized)
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

    const success = await projectRepository.archive(projectId, userId)
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
