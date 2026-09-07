import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { passwordResetTokens, users } from '@/lib/db/schema'
import { hashPassword, passwordPolicyError } from '@/lib/auth/password'
import { passwordResetEmail } from '@/lib/email/templates'
import { sendEmail } from '@/lib/email/mailer'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { RateLimitError, ValidationError } from '@/lib/errors/app-error'
import { logger } from '@/lib/logging/logger'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
export const RESEND_COOLDOWN_SEC = 60

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export class PasswordResetService {
  // Start a reset. Rate-limited per email so the endpoint can't be abused, and always returns the
  // same generic result so it never reveals whether an email is registered.
  async requestReset(rawEmail: string, origin: string): Promise<{ retryAfterSec: number }> {
    const email = rawEmail.trim().toLowerCase()

    const cooldown = await checkRateLimit(`pwreset:cd:${email}`, 1, RESEND_COOLDOWN_SEC)
    if (!cooldown.allowed) {
      const secs = Math.max(1, Math.ceil((cooldown.resetAt - Date.now()) / 1000))
      throw new RateLimitError(`Tunggu ${secs} detik sebelum meminta tautan lagi.`)
    }
    const hourly = await checkRateLimit(`pwreset:hr:${email}`, 5, 3600)
    if (!hourly.allowed) {
      throw new RateLimitError('Terlalu banyak permintaan reset. Coba lagi nanti.')
    }

    const [user] = await db
      .select({ id: users.id, name: users.name, isActive: users.isActive })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (user && user.isActive) {
      const raw = randomBytes(32).toString('hex')
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      })
      try {
        await sendEmail(
          passwordResetEmail({
            to: email,
            name: user.name ?? null,
            resetUrl: `${origin}/reset-password?token=${raw}`,
          })
        )
      } catch (error) {
        logger.error({ err: error, userId: user.id }, 'password reset email failed')
      }
    } else {
      logger.info({ email }, 'password reset requested for unknown/inactive email')
    }

    return { retryAfterSec: RESEND_COOLDOWN_SEC }
  }

  // Complete a reset. Consumes the token, sets the new password, and clears must_change_password.
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const policyError = passwordPolicyError(newPassword)
    if (policyError) throw new ValidationError(policyError, { newPassword: [policyError] })

    const tokenHash = hashToken(rawToken.trim())
    const [row] = await db
      .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!row) {
      throw new ValidationError('Tautan reset tidak valid atau sudah kedaluwarsa.')
    }

    const passwordHash = await hashPassword(newPassword)
    await db.transaction(async (tx) => {
      // Mark used first, guarded on still-unused, so a double submit can't reset twice.
      const consumed = await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResetTokens.id, row.id), isNull(passwordResetTokens.usedAt)))
        .returning({ id: passwordResetTokens.id })
      if (consumed.length === 0) {
        throw new ValidationError('Tautan reset tidak valid atau sudah kedaluwarsa.')
      }
      await tx
        .update(users)
        .set({ passwordHash, mustChangePassword: false })
        .where(eq(users.id, row.userId))
    })

    logger.info({ userId: row.userId }, 'password reset completed')
  }
}

export const passwordResetService = new PasswordResetService()
