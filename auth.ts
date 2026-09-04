import NextAuth from 'next-auth'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/lib/db'
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema'
import { teamService } from '@/lib/services/team.service'
import { logger } from '@/lib/logging/logger'
import { authConfig } from './auth.config'

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  ...authConfig,
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
