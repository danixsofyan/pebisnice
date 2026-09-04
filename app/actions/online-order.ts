'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { onlineOrderService } from '@/lib/services/online-order.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { readRequestMeta } from '@/lib/observability/server-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

const placeSchema = z.object({
  projectId: z.string().uuid(),
  branchId: z.string().uuid(),
  customerName: z.string().trim().min(1, 'Nama wajib diisi').max(120),
  customerPhone: z.string().trim().max(30).optional(),
  note: z.string().trim().max(300).optional(),
  items: z
    .array(z.object({ variantId: z.string().uuid(), qty: z.number().int().min(1).max(1000) }))
    .min(1, 'Keranjang kosong')
    .max(50),
})

// Public: no session. Creates a pending order that staff later accept into a POS sale.
export async function placeOrderAction(raw: unknown) {
  return withRequestScope('placeOrderAction', async () => {
    try {
      const parsed = placeSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }
      const result = await onlineOrderService.placeOrder(
        parsed.data.projectId,
        parsed.data.branchId,
        {
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone || null,
          note: parsed.data.note || null,
          items: parsed.data.items,
        }
      )
      return { success: true as const, data: { orderId: result.id } }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

async function staffCtx() {
  const context = await getSessionContext()
  tagRequestActor(context.userId, context.projectId)
  const meta = await readRequestMeta()
  return { projectId: context.projectId, actor: { userId: context.userId, ...meta } }
}

export async function acceptOnlineOrderAction(orderId: string) {
  return withRequestScope('acceptOnlineOrderAction', async () => {
    try {
      if (!z.string().uuid().safeParse(orderId).success)
        throw new ValidationError('Pesanan tidak valid')
      const { projectId, actor } = await staffCtx()
      await onlineOrderService.accept(projectId, orderId, actor)
      revalidatePath('/orders')
      revalidatePath('/transactions')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

export async function rejectOnlineOrderAction(orderId: string) {
  return withRequestScope('rejectOnlineOrderAction', async () => {
    try {
      if (!z.string().uuid().safeParse(orderId).success)
        throw new ValidationError('Pesanan tidak valid')
      const { projectId, actor } = await staffCtx()
      await onlineOrderService.reject(projectId, orderId, actor)
      revalidatePath('/orders')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
