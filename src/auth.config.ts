// auth.config.ts — Edge-compatible auth config (no bcryptjs / no DB calls)
// Used by middleware to avoid Node.js-only deps in Edge Runtime
import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
  providers: [], // Credentials provider added in auth.ts (Node.js only)
}
