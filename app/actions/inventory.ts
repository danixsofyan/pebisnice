'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { inventoryService } from '@/lib/services/inventory.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { readRequestMeta } from '@/lib/observability/server-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'
import type { StockMovementCommand } from '@/lib/domain/inventory/stock-movement'

const adjustSchema = z
  .object({
    branchId: z.string().uuid('Cabang tidak valid'),
    productVariantId: z.string().uuid('Produk tidak valid'),
    mode: z.enum(['adjustment', 'opname']),
    value: z.number().int(),
    reason: z.string().trim().min(1, 'Alasan wajib diisi').max(200),
  })
  .refine((data) => data.mode !== 'adjustment' || data.value !== 0, {
    message: 'Perubahan tidak boleh nol',
    path: ['value'],
  })
  .refine((data) => data.mode !== 'opname' || data.value >= 0, {
    message: 'Jumlah hasil hitung tidak boleh negatif',
    path: ['value'],
  })

export async function adjustStockAction(raw: unknown) {
  return withRequestScope('adjustStockAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const parsed = adjustSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }

      const command: StockMovementCommand =
        parsed.data.mode === 'adjustment'
          ? { type: 'adjustment', delta: parsed.data.value, reason: parsed.data.reason }
          : { type: 'opname', countedQty: parsed.data.value, reason: parsed.data.reason }

      const meta = await readRequestMeta()
      const plan = await inventoryService.applyStockMovement(
        {
          projectId: context.projectId,
          branchId: parsed.data.branchId,
          productVariantId: parsed.data.productVariantId,
        },
        command,
        { userId: context.userId, ip: meta.ip, userAgent: meta.userAgent }
      )

      revalidatePath('/inventory')
      revalidatePath('/products')
      revalidatePath('/pos')

      return { success: true as const, data: { quantityAfter: plan.quantityAfter } }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
