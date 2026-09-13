// src/auth.ts — 店長後台登入（Node runtime；DB 查詢只能放這裡，auth.config.ts 不碰 DB）
//
// 主要登入方式：Google（email_verified + ALLOWED_LOGIN_EMAILS 白名單）。
// 過渡用 email-only 登入：只有 STAFF_EMAIL_LOGIN_ENABLED === 'true' 才註冊 Credentials provider。
// token.id 一律是資料庫 users.id（UUID），不是 Google sub —— store-context 依 users.id 找店。
// callback 邏輯在 src/lib/staff-auth-callbacks.ts（有單元測試）。
import NextAuth from 'next-auth'
import type { Provider } from 'next-auth/providers'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { authConfig } from './auth.config'
import { isEmailAllowed } from '@/lib/auth-allowlist'
import { isStaffEmailLoginEnabled, normalizeStaffEmail } from '@/lib/staff-login-policy'
import { createStaffAuthCallbacks } from '@/lib/staff-auth-callbacks'

/** 以 email 找或建立使用者，回傳 users.id。email 須已正規化（小寫、trim）。 */
async function upsertUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  const [user] = await db
    .insert(users)
    .values({ email })
    .onConflictDoUpdate({
      target: users.email,
      set: { updated_at: new Date() },
    })
    .returning({ id: users.id, email: users.email })
  return user ?? null
}

const providers: Provider[] = [
  // clientId / clientSecret 由 @auth/core 自動讀 AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
  Google({ authorization: { params: { prompt: 'select_account' } } }),
]

if (isStaffEmailLoginEnabled(process.env.STAFF_EMAIL_LOGIN_ENABLED)) {
  providers.push(
    Credentials({
      credentials: {
        email: { label: 'Gmail', type: 'email' },
      },
      async authorize(credentials) {
        if (!isStaffEmailLoginEnabled(process.env.STAFF_EMAIL_LOGIN_ENABLED)) return null
        const email = normalizeStaffEmail(credentials?.email)
        if (!email) return null
        if (!isEmailAllowed(email, process.env.ALLOWED_LOGIN_EMAILS)) return null
        return upsertUserByEmail(email)
      },
    }),
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    ...createStaffAuthCallbacks({
      upsertUserByEmail,
      env: () => ({
        allowlistRaw: process.env.ALLOWED_LOGIN_EMAILS,
        emailLoginFlag: process.env.STAFF_EMAIL_LOGIN_ENABLED,
      }),
    }),
  },
})
