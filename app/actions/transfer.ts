'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { transferService } from '@/lib/services/transfer.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { readRequestMeta } from '@/lib/observability/server-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

const transferSchema = z.object({
  fromBranchId: z.string().uuid('Cabang asal tidak valid'),
  toBranchId: z.string().uuid('Cabang tujuan tidak valid'),
  note: z.string().trim().max(300).optional(),
  items: z
    .array(
      z.object({
        productVariantId: z.string().uuid('Barang tidak valid'),
        qty: z.number().int().min(1, 'Qty minimal 1'),
      })
    )
    .min(1, 'Pilih minimal satu barang'),
})

export async function createTransferAction(raw: unknown) {
  return withRequestScope('createTransferAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const parsed = transferSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }

      const meta = await readRequestMeta()
      await transferService.createTransfer(
        context.projectId,
        {
          fromBranchId: parsed.data.fromBranchId,
          toBranchId: parsed.data.toBranchId,
          note: parsed.data.note ?? null,
          items: parsed.data.items,
        },
        { userId: context.userId, ip: meta.ip, userAgent: meta.userAgent }
      )

      revalidatePath('/transfers')
      revalidatePath('/inventory')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
