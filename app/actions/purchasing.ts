'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { purchasingService } from '@/lib/services/purchasing.service'
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

const supplierSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Nama wajib diisi').max(150),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(150).optional(),
  address: z.string().trim().max(300).optional(),
  note: z.string().trim().max(300).optional(),
})

export async function saveSupplierAction(raw: unknown) {
  return withRequestScope('saveSupplierAction', async () => {
    try {
      const parsed = supplierSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }
      const { projectId, actor } = await ctx()
      await purchasingService.saveSupplier(
        projectId,
        parsed.data.id ?? null,
        {
          name: parsed.data.name,
          phone: parsed.data.phone || null,
          email: parsed.data.email || null,
          address: parsed.data.address || null,
          note: parsed.data.note || null,
        },
        actor
      )
      revalidatePath('/suppliers')
      revalidatePath('/purchases')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

const orderSchema = z.object({
  supplierId: z.string().uuid('Supplier tidak valid'),
  branchId: z.string().uuid('Cabang tidak valid'),
  note: z.string().trim().max(300).optional(),
  items: z
    .array(
      z.object({
        productVariantId: z.string().uuid('Barang tidak valid'),
        qty: z.number().int().min(1, 'Qty minimal 1'),
        unitCost: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Harga tidak valid'),
      })
    )
    .min(1, 'Pilih minimal satu barang'),
})

export async function createOrderAction(raw: unknown) {
  return withRequestScope('createOrderAction', async () => {
    try {
      const parsed = orderSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }
      const { projectId, actor } = await ctx()
      await purchasingService.createOrder(
        projectId,
        {
          supplierId: parsed.data.supplierId,
          branchId: parsed.data.branchId,
          note: parsed.data.note ?? null,
          items: parsed.data.items,
        },
        actor
      )
      revalidatePath('/purchases')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

export async function getReceivableItemsAction(purchaseOrderId: string) {
  return withRequestScope('getReceivableItemsAction', async () => {
    try {
      if (!z.string().uuid().safeParse(purchaseOrderId).success) {
        throw new ValidationError('PO tidak valid')
      }
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      const items = await purchasingService.listReceivableItems(
        context.projectId,
        context.userId,
        purchaseOrderId
      )
      return { success: true as const, data: items }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

const receiveSchema = z.object({
  purchaseOrderId: z.string().uuid('PO tidak valid'),
  items: z
    .array(z.object({ itemId: z.string().uuid(), qty: z.number().int().min(1) }))
    .min(1, 'Isi jumlah diterima'),
})

export async function receiveOrderAction(raw: unknown) {
  return withRequestScope('receiveOrderAction', async () => {
    try {
      const parsed = receiveSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }
      const { projectId, actor } = await ctx()
      await purchasingService.receiveOrder(
        projectId,
        parsed.data.purchaseOrderId,
        parsed.data.items,
        actor
      )
      revalidatePath('/purchases')
      revalidatePath('/inventory')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
