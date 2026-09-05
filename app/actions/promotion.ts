'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { promoService } from '@/lib/services/promo.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { readRequestMeta } from '@/lib/observability/server-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

async function ctx() {
  const context = await getSessionContext()
  tagRequestActor(context.userId, context.projectId)
  const meta = await readRequestMeta()
  return { projectId: context.projectId, actor: { userId: context.userId, ...meta } }
}

const MONEY = /^\d+(\.\d{1,2})?$/

const createSchema = z
  .object({
    code: z.string().trim().min(1, 'Kode wajib diisi').max(64),
    name: z.string().trim().max(120).optional(),
    discountType: z.enum(['percent', 'nominal']),
    percent: z.number().min(0).max(100).optional(),
    amount: z.string().regex(MONEY, 'Nominal tidak valid').optional(),
    minSpend: z.string().regex(MONEY, 'Nominal tidak valid').optional(),
    maxDiscount: z.string().regex(MONEY, 'Nominal tidak valid').optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    usageLimit: z.number().int().positive().optional(),
  })
  .refine((v) => (v.discountType === 'percent' ? v.percent !== undefined : v.amount !== undefined), {
    message: 'Isi nilai diskon sesuai jenisnya',
    path: ['amount'],
  })

// Percent (0–100) is stored as basis points (0–10000) to match the money domain's percentOf.
function percentToBasisPoints(percent: number): number {
  return Math.round(percent * 100)
}

export async function createPromotionAction(raw: unknown) {
  return withRequestScope('createPromotionAction', async () => {
    try {
      const parsed = createSchema.safeParse(raw)
      if (!parsed.success)
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      const { projectId, actor } = await ctx()
      const d = parsed.data
      await promoService.create(
        projectId,
        {
          code: d.code,
          name: d.name ?? d.code,
          discountType: d.discountType,
          percentBasisPoints: d.percent !== undefined ? percentToBasisPoints(d.percent) : 0,
          amount: d.amount ?? '0',
          minSpend: d.minSpend ?? '0',
          maxDiscount: d.maxDiscount ?? null,
          startsAt: d.startsAt || null,
          endsAt: d.endsAt || null,
          usageLimit: d.usageLimit ?? null,
        },
        actor
      )
      revalidatePath('/promotions')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

const toggleSchema = z.object({
  id: z.string().uuid('Voucher tidak valid'),
  isActive: z.boolean(),
})

export async function setPromotionActiveAction(raw: unknown) {
  return withRequestScope('setPromotionActiveAction', async () => {
    try {
      const parsed = toggleSchema.safeParse(raw)
      if (!parsed.success)
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      const { projectId, actor } = await ctx()
      await promoService.setActive(projectId, parsed.data.id, parsed.data.isActive, actor)
      revalidatePath('/promotions')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
