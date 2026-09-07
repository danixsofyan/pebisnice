import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema'
import { teamService } from '@/lib/services/team.service'
import { verifyPassword } from '@/lib/auth/password'
import { logger } from '@/lib/logging/logger'
import { authConfig } from './auth.config'

// Email/password login. Defined here (Node runtime) rather than in auth.config.ts so bcrypt and the
// database never get pulled into the edge middleware bundle. Returns null on any failure so the
// reason (unknown email vs wrong password vs disabled) is never leaked.
const credentials = Credentials({
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  authorize: async (raw) => {
    const email = String(raw?.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(raw?.password ?? '')
    if (!email || !password) return null

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (!user || !user.passwordHash || !user.isActive) return null

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) return null

    return { id: user.id, email: user.email, name: user.name, image: user.image }
  },
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  ...authConfig,
  providers: [...authConfig.providers, credentials],
  events: {
    // Pending team invites link to the account on sign-in. A failure here must not block login, so it's caught and logged.
    async signIn({ user }) {
      if (!user?.id || !user.email) return
      try {
        await teamService.linkPendingInvites(user.id, user.email)
      } catch (error) {
        logger.warn(
          { userId: user.id, err: error instanceof Error ? error.message : String(error) },
          'failed to link pending team invites on sign in'
        )
      }
    },
  },
})
