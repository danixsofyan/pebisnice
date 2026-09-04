'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { productionService } from '@/lib/services/production.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { readRequestMeta } from '@/lib/observability/server-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

const recordProductionSchema = z.object({
  branchId: z.string().uuid('Cabang tidak valid'),
  productVariantId: z.string().uuid('Produk jadi tidak valid'),
  quantity: z.number().int().min(1, 'Jumlah minimal 1'),
  productionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid'),
  note: z.string().trim().max(300).optional(),
  materials: z
    .array(
      z.object({
        productVariantId: z.string().uuid('Bahan tidak valid'),
        qty: z.number().int().min(1, 'Jumlah bahan minimal 1'),
      })
    )
    .min(1, 'Minimal satu bahan'),
})

export async function recordProductionAction(raw: unknown) {
  return withRequestScope('recordProductionAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const parsed = recordProductionSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }

      const meta = await readRequestMeta()
      await productionService.recordProduction(
        {
          projectId: context.projectId,
          branchId: parsed.data.branchId,
          productVariantId: parsed.data.productVariantId,
          quantity: parsed.data.quantity,
          productionDate: parsed.data.productionDate,
          note: parsed.data.note ?? null,
          materials: parsed.data.materials,
        },
        { userId: context.userId, ip: meta.ip, userAgent: meta.userAgent }
      )

      revalidatePath('/production')
      revalidatePath('/inventory')
      revalidatePath('/products')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
