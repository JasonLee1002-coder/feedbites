// auth.config.ts — Edge-compatible auth config (no bcryptjs / no DB calls)
// Used by middleware to avoid Node.js-only deps in Edge Runtime
import type { NextAuthConfig } from 'next-auth'
import { BASE_PATH } from '@/lib/brand'

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  // Auth.js 把 pages 當成 origin 後的絕對路徑使用，不會自動補 Next basePath，所以要自己帶。
  // 登入被拒（白名單外、email 未驗證）會導回 /eatagain/login?error=AccessDenied。
  pages: {
    signIn: `${BASE_PATH}/login`,
    error: `${BASE_PATH}/login`,
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
  providers: [], // Google / Credentials providers added in auth.ts (Node.js only)
}
