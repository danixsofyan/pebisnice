'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { catalogService } from '@/lib/services/catalog.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { fromDecimalString } from '@/lib/domain/money'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

const createProductSchema = z.object({
  branchId: z.string().uuid('Cabang tidak valid'),
  name: z.string().trim().min(1, 'Nama produk wajib diisi').max(150),
  type: z.enum(['finished', 'material']),
  sku: z.string().trim().max(60).optional(),
  variantName: z.string().trim().max(100).optional(),
  hpp: z.string().regex(/^\d+(\.\d{1,2})?$/, 'HPP harus angka'),
  initialStock: z.number().int().min(0, 'Stok awal tidak boleh negatif'),
})

export async function createProductAction(raw: unknown) {
  return withRequestScope('createProductAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const parsed = createProductSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }

      const headersList = await headers()
      const result = await catalogService.createProduct(
        {
          projectId: context.projectId,
          branchId: parsed.data.branchId,
          name: parsed.data.name,
          type: parsed.data.type,
          sku: parsed.data.sku ?? null,
          variantName: parsed.data.variantName ?? null,
          hpp: fromDecimalString(parsed.data.hpp),
          initialStock: parsed.data.initialStock,
        },
        {
          userId: context.userId,
          ip: headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
          userAgent: headersList.get('user-agent') ?? 'unknown',
        }
      )

      revalidatePath('/products')
      revalidatePath('/pos')

      return { success: true as const, data: { productId: result.product.id } }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
