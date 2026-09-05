'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { purchasingService } from '@/lib/services/purchasing.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { readRequestMeta } from '@/lib/observability/server-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

const paySchema = z.object({
  purchaseOrderId: z.string().uuid('PO tidak valid'),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Jumlah tidak valid'),
  method: z.enum(['cash', 'transfer', 'qris', 'card', 'other']).optional(),
  note: z.string().trim().max(200).optional(),
})

export async function payPurchaseAction(raw: unknown) {
  return withRequestScope('payPurchaseAction', async () => {
    try {
      const parsed = paySchema.safeParse(raw)
      if (!parsed.success)
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      const meta = await readRequestMeta()
      await purchasingService.payPurchase(
        context.projectId,
        parsed.data.purchaseOrderId,
        {
          amount: parsed.data.amount,
          method: parsed.data.method ?? null,
          note: parsed.data.note ?? null,
        },
        { userId: context.userId, ip: meta.ip, userAgent: meta.userAgent }
      )
      revalidatePath('/payables')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
