'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { expenseService } from '@/lib/services/expense.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { fromDecimalString } from '@/lib/domain/money'
import { readRequestMeta } from '@/lib/observability/server-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

const recordExpenseSchema = z.object({
  branchId: z.string().uuid().nullable().optional(),
  category: z.enum([
    'rent',
    'salary',
    'utility',
    'marketing',
    'shipping',
    'supply',
    'tax',
    'other',
  ]),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Nominal harus angka'),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid'),
  note: z.string().trim().max(300).optional(),
})

export async function recordExpenseAction(raw: unknown) {
  return withRequestScope('recordExpenseAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const parsed = recordExpenseSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }

      const meta = await readRequestMeta()
      await expenseService.record(
        {
          projectId: context.projectId,
          branchId: parsed.data.branchId ?? null,
          category: parsed.data.category,
          amount: fromDecimalString(parsed.data.amount),
          expenseDate: parsed.data.expenseDate,
          note: parsed.data.note ?? null,
        },
        { userId: context.userId, ip: meta.ip, userAgent: meta.userAgent }
      )

      revalidatePath('/expenses')
      revalidatePath('/reports')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

export async function removeExpenseAction(expenseId: string) {
  return withRequestScope('removeExpenseAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const meta = await readRequestMeta()
      await expenseService.remove(context.projectId, expenseId, {
        userId: context.userId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      })

      revalidatePath('/expenses')
      revalidatePath('/reports')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
