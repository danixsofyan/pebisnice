'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminService } from '@/lib/services/admin.service'
import { requirePlatformAdmin } from '@/lib/auth/admin'
import { withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

const grantSchema = z.object({
  userId: z.string().min(1),
  days: z.number().int().min(1).max(365),
})

export async function grantAccessDaysAction(raw: unknown) {
  return withRequestScope('grantAccessDaysAction', async () => {
    try {
      const adminId = await requirePlatformAdmin()
      const parsed = grantSchema.safeParse(raw)
      if (!parsed.success) throw new ValidationError('Masukan tidak valid')

      await adminService.grantAccessDays(parsed.data.userId, parsed.data.days, adminId)
      revalidatePath('/admin/subscribers')
      revalidatePath('/admin')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

const statusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(['trialing', 'active', 'past_due', 'expired', 'canceled']),
})

export async function setSubscriptionStatusAction(raw: unknown) {
  return withRequestScope('setSubscriptionStatusAction', async () => {
    try {
      const adminId = await requirePlatformAdmin()
      const parsed = statusSchema.safeParse(raw)
      if (!parsed.success) throw new ValidationError('Masukan tidak valid')

      await adminService.setStatus(parsed.data.userId, parsed.data.status, adminId)
      revalidatePath('/admin/subscribers')
      revalidatePath('/admin')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
