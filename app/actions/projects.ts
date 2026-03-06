'use server'

import { projectService } from '@/lib/services/project.service'
import { createProjectSchema, updateProjectSchema } from '@/lib/domain/validators/project.schema'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'
import { getUserFromSession } from '@/lib/auth-utils'
import { headers } from 'next/headers'

export async function createProjectAction(formData: FormData) {
  try {
    const user = await getUserFromSession()

    const rawData = {
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      defaultCalcMethod: formData.get('defaultCalcMethod'),
    }

    const parseResult = createProjectSchema.safeParse(rawData)
    if (!parseResult.success) {
      throw new ValidationError('Validasi gagal', parseResult.error.flatten().fieldErrors)
    }

    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    const project = await projectService.create(user.id, parseResult.data as any, { ip, userAgent })

    return { success: true as const, data: project }
  } catch (error) {
    return handleActionError(error)
  }
}

export async function updateProjectAction(projectId: string, formData: FormData) {
  try {
    const user = await getUserFromSession()

    const rawData = {
      name: formData.get('name') || undefined,
      description: formData.has('description') ? formData.get('description') : undefined,
      defaultCalcMethod: formData.get('defaultCalcMethod') || undefined,
    }

    const parseResult = updateProjectSchema.safeParse(rawData)
    if (!parseResult.success) {
      throw new ValidationError('Validasi gagal', parseResult.error.flatten().fieldErrors)
    }

    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    const project = await projectService.update(projectId, user.id, parseResult.data as any, {
      ip,
      userAgent,
    })

    return { success: true as const, data: project }
  } catch (error) {
    return handleActionError(error)
  }
}

export async function archiveProjectAction(projectId: string) {
  try {
    const user = await getUserFromSession()

    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    await projectService.archive(projectId, user.id, { ip, userAgent })

    return { success: true as const }
  } catch (error) {
    return handleActionError(error)
  }
}
