'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { projectService } from '@/lib/services/project.service'
import { resolveSessionState } from '@/lib/auth/session-context'
import { getUserFromSession } from '@/lib/auth-utils'
import { tagRequestActor, withRequestScope } from '@/lib/observability/with-request-scope'
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

// Create the user's first project with its "Pusat" branch. Rejects if the user already has a project; onboarding is only for those who truly don't, checked server-side so it can't be bypassed from the client.
export async function createFirstProjectAction(raw: unknown) {
  return withRequestScope('createFirstProjectAction', async () => {
    try {
      const user = await getUserFromSession()
      tagRequestActor(user.id)

      const state = await resolveSessionState()
      if (state.status === 'ready') {
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
  })
}
