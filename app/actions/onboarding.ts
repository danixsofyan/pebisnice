'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { projectService } from '@/lib/services/project.service'
import { findSessionContext } from '@/lib/auth/session-context'
import { getUserFromSession } from '@/lib/auth-utils'
import { handleActionError, ValidationError } from '@/lib/errors/app-error'

const createFirstProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nama bisnis wajib diisi')
    .max(100, 'Nama terlalu panjang')
    .regex(/^[a-zA-Z0-9\s\-_.()]+$/, 'Nama hanya boleh huruf, angka, spasi, dan - _ . ()'),
  description: z.string().trim().max(500).optional(),
})

/**
 * Membuat project pertama pengguna beserta cabang "Pusat".
 *
 * Menolak bila pengguna sudah punya project — halaman onboarding hanya untuk
 * yang benar-benar belum punya, dan pengecekannya di server supaya tidak bisa
 * dilewati dari client.
 */
export async function createFirstProjectAction(raw: unknown) {
  try {
    const user = await getUserFromSession()

    const existing = await findSessionContext()
    if (existing) {
      throw new ValidationError('Anda sudah memiliki project', {
        name: ['Project sudah ada'],
      })
    }

    const parsed = createFirstProjectSchema.safeParse(raw)
    if (!parsed.success) {
      throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
    }

    const headersList = await headers()
    const project = await projectService.create(
      user.id,
      {
        name: parsed.data.name,
        ...(parsed.data.description ? { description: parsed.data.description } : {}),
        defaultCalcMethod: 'income_based' as const,
      },
      {
        ip: headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
        userAgent: headersList.get('user-agent') ?? 'unknown',
      }
    )

    revalidatePath('/', 'layout')

    return { success: true as const, data: { projectId: project.id, name: project.name } }
  } catch (error) {
    return handleActionError(error)
  }
}
