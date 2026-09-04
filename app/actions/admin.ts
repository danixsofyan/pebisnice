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

const priceField = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Harga harus angka')
const trialDaysField = z.number().int().min(1).max(365).nullable()

const updatePlanSchema = z.object({
  planId: z.string().uuid(),
  name: z.string().trim().min(1, 'Nama wajib').max(100),
  description: z.string().trim().max(300).nullable(),
  price: priceField,
  trialDays: trialDaysField,
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
})

export async function updatePlanAction(raw: unknown) {
  return withRequestScope('updatePlanAction', async () => {
    try {
      const adminId = await requirePlatformAdmin()
      const parsed = updatePlanSchema.safeParse(raw)
      if (!parsed.success) throw new ValidationError('Masukan tidak valid')

      const { planId, ...fields } = parsed.data
      await adminService.updatePlan(planId, fields, adminId)
      revalidatePath('/admin/plans')
      revalidatePath('/billing/plans')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

const createPlanSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]+$/, 'Kode hanya huruf kecil, angka, - dan _')
    .max(40),
  name: z.string().trim().min(1, 'Nama wajib').max(100),
  description: z.string().trim().max(300).nullable(),
  interval: z.enum(['trial', 'monthly', 'yearly']),
  price: priceField,
  trialDays: trialDaysField,
  sortOrder: z.number().int().min(0).max(999),
})

export async function createPlanAction(raw: unknown) {
  return withRequestScope('createPlanAction', async () => {
    try {
      const adminId = await requirePlatformAdmin()
      const parsed = createPlanSchema.safeParse(raw)
      if (!parsed.success) throw new ValidationError('Masukan tidak valid')

      await adminService.createPlan(parsed.data, adminId)
      revalidatePath('/admin/plans')
      revalidatePath('/billing/plans')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
