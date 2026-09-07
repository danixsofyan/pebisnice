import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

export const authConfig = {
  // allowDangerousEmailAccountLinking lets an invited employee (whose account was created with a
  // temporary password) also sign in with Google on the same address — Google verifies email
  // ownership, so linking by verified email is safe here.
  providers: [Google({ allowDangerousEmailAccountLinking: true })],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id || ''
      }
      return token
    },
  },
} satisfies NextAuthConfig
