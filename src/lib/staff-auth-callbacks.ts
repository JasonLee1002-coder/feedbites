// src/lib/staff-auth-callbacks.ts
// 店長登入的 signIn / jwt callback。DB 存取以參數注入，方便單元測試；實際 DB 版在 src/auth.ts 接上。
import type { NextAuthConfig } from 'next-auth'
import {
  checkGoogleStaffSignIn,
  isStaffEmailLoginEnabled,
  isStaffSessionValid,
} from './staff-login-policy'

type Callbacks = NonNullable<NextAuthConfig['callbacks']>

export interface StaffAuthDeps {
  /** 以正規化 email 找或建立 users 列，回傳資料庫 users.id */
  upsertUserByEmail: (email: string) => Promise<{ id: string; email: string } | null>
  env: () => { allowlistRaw: string | undefined; emailLoginFlag: string | undefined }
}

export function createStaffAuthCallbacks(deps: StaffAuthDeps): Pick<Callbacks, 'signIn' | 'jwt'> {
  return {
    signIn({ account, profile }) {
      const env = deps.env()
      if (account?.provider === 'google') {
        return checkGoogleStaffSignIn(profile, env.allowlistRaw).ok
      }
      if (account?.provider === 'credentials') {
        return isStaffEmailLoginEnabled(env.emailLoginFlag)
      }
      return false
    },

    async jwt({ token, user, account, profile }) {
      const env = deps.env()

      // 首次登入：account 與 user 只在這一次會有值
      if (account && user) {
        if (account.provider === 'google') {
          const check = checkGoogleStaffSignIn(profile, env.allowlistRaw)
          if (!check.ok) throw new Error(`google sign-in rejected: ${check.reason}`)
          // token.id 必須是資料庫 users.id，不能用 Google sub，否則既有店長找不到自己的店
          const dbUser = await deps.upsertUserByEmail(check.email)
          if (!dbUser) throw new Error('google sign-in: user upsert failed')
          token.id = dbUser.id
          token.sub = dbUser.id
          token.email = dbUser.email
          token.provider = 'google'
          return token
        }
        if (account.provider === 'credentials') {
          if (!isStaffEmailLoginEnabled(env.emailLoginFlag)) return null
          token.id = user.id
          token.provider = 'credentials'
          return token
        }
        return null
      }

      // 之後每次讀 session 都重驗：移出白名單、或關閉 email 登入後，舊 session 立即失效
      const valid = isStaffSessionValid(
        { provider: token.provider, email: token.email },
        env,
      )
      return valid ? token : null
    },
  }
}
