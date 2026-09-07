'use server'

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { hashPassword, passwordPolicyError, verifyPassword } from '@/lib/auth/password'
import { handleActionError, AuthError, ValidationError } from '@/lib/errors/app-error'
import { withRequestScope } from '@/lib/observability/with-request-scope'
import { logger } from '@/lib/logging/logger'

const schema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(1, 'Password baru wajib diisi'),
})

// Change the signed-in user's password. Requires the current password even during a forced reset,
// so a hijacked session can't set a new password without knowing the old one. Clears the
// must-change flag on success.
export async function changePasswordAction(raw: unknown) {
  return withRequestScope('changePasswordAction', async () => {
    try {
      const session = await auth()
      const userId = session?.user?.id
      if (!userId) throw new AuthError()

      const parsed = schema.safeParse(raw)
      if (!parsed.success) {
        throw new ValidationError('Validasi gagal', parsed.error.flatten().fieldErrors)
      }

      const policyError = passwordPolicyError(parsed.data.newPassword)
      if (policyError) throw new ValidationError(policyError, { newPassword: [policyError] })

      const [user] = await db
        .select({ passwordHash: users.passwordHash, isActive: users.isActive })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
      if (!user || !user.isActive || !user.passwordHash) throw new AuthError()

      const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash)
      if (!ok) {
        throw new ValidationError('Password saat ini salah', {
          currentPassword: ['Password saat ini salah'],
        })
      }
      if (parsed.data.newPassword === parsed.data.currentPassword) {
        throw new ValidationError('Password baru harus berbeda dari sebelumnya', {
          newPassword: ['Password baru harus berbeda'],
        })
      }

      await db
        .update(users)
        .set({ passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false })
        .where(eq(users.id, userId))

      logger.info({ userId }, 'password changed')
      return { success: true as const }
    } catch (error) {
      return handleActionError(error)
    }
  })
}
