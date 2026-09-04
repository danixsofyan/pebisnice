'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { projectService } from '@/lib/services/project.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { getUserFromSession } from '@/lib/auth-utils'
import { sanitizeText } from '@/lib/security/sanitizer'
import { readRequestMeta } from '@/lib/observability/server-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

const settingsSchema = z.object({
  name: z.string().trim().min(1, 'Nama bisnis wajib diisi').max(100),
  description: z.string().trim().max(500).optional(),
  defaultCalcMethod: z.enum(['income_based', 'order_based']),
})

export async function updateProjectSettingsAction(raw: unknown) {
  return withRequestScope('updateProjectSettingsAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const parsed = settingsSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }

      const meta = await readRequestMeta()
      await projectService.update(
        context.projectId,
        context.userId,
        {
          name: parsed.data.name,
          description: parsed.data.description ?? '',
          defaultCalcMethod: parsed.data.defaultCalcMethod,
        },
        { ip: meta.ip, userAgent: meta.userAgent }
      )

      revalidatePath('/settings')
      revalidatePath('/', 'layout')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100),
})

export async function updateProfileAction(raw: unknown) {
  return withRequestScope('updateProfileAction', async () => {
    try {
      const user = await getUserFromSession()
      tagRequestActor(user.id)

      const parsed = profileSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }

      await db
        .update(users)
        .set({ name: sanitizeText(parsed.data.name) })
        .where(eq(users.id, user.id))

      revalidatePath('/profile')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
