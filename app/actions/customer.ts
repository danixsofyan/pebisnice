'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { customerService } from '@/lib/services/customer.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { readRequestMeta } from '@/lib/observability/server-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

const customerSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(150),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(150).optional(),
  address: z.string().trim().max(300).optional(),
  note: z.string().trim().max(300).optional(),
})

function toInput(data: z.infer<typeof customerSchema>) {
  return {
    name: data.name,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    note: data.note || null,
  }
}

export async function saveCustomerAction(raw: unknown) {
  return withRequestScope('saveCustomerAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const parsed = z
        .object({ id: z.string().uuid().optional() })
        .and(customerSchema)
        .safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }

      const meta = await readRequestMeta()
      const ctx = { userId: context.userId, ip: meta.ip, userAgent: meta.userAgent }
      const input = toInput(parsed.data)

      if (parsed.data.id) {
        await customerService.update(context.projectId, parsed.data.id, input, ctx)
      } else {
        await customerService.create(context.projectId, input, ctx)
      }

      revalidatePath('/customers')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

export async function deleteCustomerAction(customerId: string) {
  return withRequestScope('deleteCustomerAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)
      if (!z.string().uuid().safeParse(customerId).success) {
        throw new ValidationError('Pelanggan tidak valid')
      }

      const meta = await readRequestMeta()
      await customerService.remove(context.projectId, customerId, {
        userId: context.userId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      })

      revalidatePath('/customers')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
