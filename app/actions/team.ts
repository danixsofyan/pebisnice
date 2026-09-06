'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { teamService } from '@/lib/services/team.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { getRequestOrigin } from '@/lib/http/origin'
import { readRequestMeta } from '@/lib/observability/server-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

const ROLES = ['admin', 'manager', 'finance', 'cashier', 'production'] as const

const addSchema = z.object({
  email: z.string().trim().email('Email tidak valid'),
  role: z.enum(ROLES),
  branchId: z.string().uuid().nullable().optional(),
})

const updateSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(ROLES),
  branchId: z.string().uuid().nullable().optional(),
})

const statusSchema = z.object({
  memberId: z.string().uuid(),
  status: z.enum(['active', 'disabled']),
})

async function ctx() {
  const context = await getSessionContext()
  tagRequestActor(context.userId, context.projectId)
  const meta = await readRequestMeta()
  return { context, meta }
}

export async function addMemberAction(raw: unknown) {
  return withRequestScope('addMemberAction', async () => {
    try {
      const { context, meta } = await ctx()
      const parsed = addSchema.safeParse(raw)
      if (!parsed.success)
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)

      const origin = await getRequestOrigin()
      await teamService.addMember(
        {
          projectId: context.projectId,
          email: parsed.data.email,
          role: parsed.data.role,
          branchId: parsed.data.branchId ?? null,
        },
        { userId: context.userId, ip: meta.ip, userAgent: meta.userAgent, origin }
      )
      revalidatePath('/employees')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

export async function updateMemberAction(raw: unknown) {
  return withRequestScope('updateMemberAction', async () => {
    try {
      const { context, meta } = await ctx()
      const parsed = updateSchema.safeParse(raw)
      if (!parsed.success) throw new ValidationError('Validasi gagal')

      await teamService.updateMember(
        context.projectId,
        parsed.data.memberId,
        { role: parsed.data.role, branchId: parsed.data.branchId ?? null },
        { userId: context.userId, ip: meta.ip, userAgent: meta.userAgent }
      )
      revalidatePath('/employees')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

export async function setMemberStatusAction(raw: unknown) {
  return withRequestScope('setMemberStatusAction', async () => {
    try {
      const { context, meta } = await ctx()
      const parsed = statusSchema.safeParse(raw)
      if (!parsed.success) throw new ValidationError('Validasi gagal')

      await teamService.setStatus(context.projectId, parsed.data.memberId, parsed.data.status, {
        userId: context.userId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
      revalidatePath('/employees')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

export async function removeMemberAction(memberId: string) {
  return withRequestScope('removeMemberAction', async () => {
    try {
      const { context, meta } = await ctx()
      await teamService.remove(context.projectId, memberId, {
        userId: context.userId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      })
      revalidatePath('/employees')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
