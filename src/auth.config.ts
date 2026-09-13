// auth.config.ts — Edge-compatible auth config (no bcryptjs / no DB calls)
// Used by middleware to avoid Node.js-only deps in Edge Runtime
import type { NextAuthConfig } from 'next-auth'
import { BASE_PATH } from '@/lib/brand'

export const authConfig: NextAuthConfig = {
  // trustHost 刻意不設，交給 Auth.js 預設（@auth/core lib/utils/env.js setEnvDefaults）：
  //   有 AUTH_URL（或 AUTH_TRUST_HOST）→ true；正式環境兩者都沒有 → false，所有 auth 請求回 UntrustedHost（fail-closed）。
  // 有 AUTH_URL 時，對外網址的 origin 一律取 AUTH_URL，不看 Host／X-Forwarded-Host：
  //   - route handler：next-auth lib/env.js reqWithEnvURL 把 req origin 換成 AUTH_URL origin
  //     （我們的 route.ts 另外先用 AUTH_URL 組 canonical URL）
  //   - signIn／signOut／auth()：@auth/core createActionURL 先用 AUTH_URL，沒有才讀 x-forwarded-host／host
  // 所以正式站必須設 AUTH_URL=https://poc.mcstation.ai/eatagain/api/auth（要帶 /api/auth，basePath 取自其 pathname）。
  // 不可寫成 trustHost: !process.env.AUTH_URL：明確給 false 時預設值不會覆蓋，有 AUTH_URL 反而全部被拒。
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
