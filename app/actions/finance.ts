'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { financeService } from '@/lib/services/finance.service'
import { getSessionContext } from '@/lib/auth/session-context'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'
import { parseCsvRecords } from '@/lib/import/csv-parse'
import { parseBcaMutations } from '@/lib/import/bca-mutation'

const MAX_IMPORT_BYTES = 2 * 1024 * 1024
const MAX_IMPORT_ROWS = 5000

async function actorMeta() {
  const h = await headers()
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
    userAgent: h.get('user-agent') ?? 'unknown',
  }
}

// Import a BCA statement CSV. Parsing is pure; duplicate rows are skipped by the service.
export async function importMutationsAction(formData: FormData) {
  return withRequestScope('importMutationsAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const bank = String(formData.get('bank') ?? 'bca').toLowerCase()
      const yearRaw = Number(formData.get('year'))
      const year = Number.isInteger(yearRaw) && yearRaw > 2000 ? yearRaw : new Date().getFullYear()
      const file = formData.get('file')
      if (!(file instanceof File)) throw new ValidationError('Berkas CSV tidak ditemukan')
      if (file.size > MAX_IMPORT_BYTES)
        throw new ValidationError('Berkas terlalu besar (maks 2 MB)')

      const { rows, errors } = parseBcaMutations(parseCsvRecords(await file.text()), year)
      if (rows.length === 0) {
        throw new ValidationError(errors[0]?.message ?? 'Tidak ada mutasi yang bisa diimpor')
      }
      if (rows.length > MAX_IMPORT_ROWS) {
        throw new ValidationError(`Maksimum ${MAX_IMPORT_ROWS} baris per impor`)
      }

      const meta = await actorMeta()
      const result = await financeService.importMutations(
        { projectId: context.projectId, bank, rows },
        { userId: context.userId, ...meta }
      )

      revalidatePath('/finance')
      return {
        success: true as const,
        data: { imported: result.imported, skipped: result.skipped, parseErrors: errors },
      }
    } catch (error) {
      return handleActionError(error)
    }
  })
}

const reconcileSchema = z.object({
  mutationId: z.string().uuid('Mutasi tidak valid'),
  reconciled: z.boolean(),
  note: z.string().trim().max(500).optional(),
})

export async function setMutationReconciledAction(raw: unknown) {
  return withRequestScope('setMutationReconciledAction', async () => {
    try {
      const context = await getSessionContext()
      tagRequestActor(context.userId, context.projectId)

      const parsed = reconcileSchema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }

      const meta = await actorMeta()
      await financeService.setReconciled(
        context.projectId,
        parsed.data.mutationId,
        parsed.data.reconciled,
        parsed.data.note ?? null,
        { userId: context.userId, ...meta }
      )

      revalidatePath('/finance')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
