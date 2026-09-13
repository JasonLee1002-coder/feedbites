// src/lib/staff-auth-callbacks.ts
// 店長登入的 signIn / jwt callback。DB 存取以參數注入，方便單元測試；實際 DB 版在 src/auth.ts 接上。
import type { NextAuthConfig } from 'next-auth'
// AccessDenied 屬於 Auth.js 的 client-safe 錯誤，會導回 pages.error?error=AccessDenied；
// 丟一般 Error 會變成 CallbackRouteError，前端只看得到 error=Configuration。
import { AccessDenied } from '@auth/core/errors'
import {
  checkGoogleStaffSignIn,
  isStaffEmailLoginEnabled,
  isStaffSessionValid,
} from './staff-login-policy'
import type { GoogleBindResult } from './staff-google-binding'
import { logger, maskEmail } from './logger'

type Callbacks = NonNullable<NextAuthConfig['callbacks']>

export interface StaffAuthDeps {
  /**
   * 以正規化 email 找或建立 users 列，並綁定 Google sub。
   * sub 與已綁定值不同回 sub_mismatch；sub 已綁在別的 user 上回 sub_taken。
   */
  bindGoogleUser: (input: { email: string; sub: string }) => Promise<GoogleBindResult>
  env: () => { allowlistRaw: string | undefined; emailLoginFlag: string | undefined }
  /** 預設 logger.warn；測試可注入以檢查記錄內容 */
  warn?: (event: string, ctx: Record<string, unknown>, msg: string) => void
}

function subPrefix(sub: string | null): string | null {
  return sub ? sub.slice(0, 4) : null
}

export function createStaffAuthCallbacks(deps: StaffAuthDeps): Pick<Callbacks, 'signIn' | 'jwt'> {
  const warn = deps.warn ?? logger.warn

  function reject(reason: string, email: string | null, sub: string | null): never {
    warn(
      'staff_google_signin_rejected',
      { reason, email: maskEmail(email), sub_prefix: subPrefix(sub) },
      'google sign-in rejected',
    )
    throw new AccessDenied(`google sign-in rejected: ${reason}`)
  }

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
          const sub = typeof profile?.sub === 'string' && profile.sub.trim() ? profile.sub : null
          const check = checkGoogleStaffSignIn(profile, env.allowlistRaw)
          if (!check.ok) reject(check.reason, null, sub)
          // Google sub 是帳號不可變的 ID；沒有 sub 就無法確認是不是同一個人，視同驗證失敗
          if (!sub) reject('no_sub', check.email, null)

          const bound = await deps.bindGoogleUser({ email: check.email, sub })
          if (!bound.ok) reject(bound.reason, check.email, sub)

          // token.id 必須是資料庫 users.id，不能用 Google sub，否則既有店長找不到自己的店
          token.id = bound.user.id
          token.sub = bound.user.id
          token.email = bound.user.email
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
