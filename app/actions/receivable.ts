'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { receivableService } from '@/lib/services/receivable.service'
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

const createSchema = z.object({
  customerId: z.string().uuid().optional(),
  amount: z.string().regex(MONEY, 'Jumlah tidak valid'),
  description: z.string().trim().max(200).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export async function createReceivableAction(raw: unknown) {
  return withRequestScope('createReceivableAction', async () => {
    try {
      const parsed = createSchema.safeParse(raw)
      if (!parsed.success)
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      const { projectId, actor } = await ctx()
      await receivableService.create(
        projectId,
        {
          customerId: parsed.data.customerId ?? null,
          amount: parsed.data.amount,
          description: parsed.data.description ?? null,
          dueDate: parsed.data.dueDate ?? null,
        },
        actor
      )
      revalidatePath('/receivables')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

const paySchema = z.object({
  receivableId: z.string().uuid('Piutang tidak valid'),
  amount: z.string().regex(MONEY, 'Jumlah tidak valid'),
  method: z.enum(['cash', 'transfer', 'qris', 'card', 'other']).optional(),
  note: z.string().trim().max(200).optional(),
})

export async function payReceivableAction(raw: unknown) {
  return withRequestScope('payReceivableAction', async () => {
    try {
      const parsed = paySchema.safeParse(raw)
      if (!parsed.success)
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      const { projectId, actor } = await ctx()
      await receivableService.addPayment(
        projectId,
        parsed.data.receivableId,
        {
          amount: parsed.data.amount,
          method: parsed.data.method ?? null,
          note: parsed.data.note ?? null,
        },
        actor
      )
      revalidatePath('/receivables')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
