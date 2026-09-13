// src/lib/staff-login-policy.ts
// 店長後台登入政策。純函式、無 DB／無 Node 依賴，方便單元測試。
//
// 規則：
// 1. Google 登入：Google 必須回報 email_verified === true，且 email 在 ALLOWED_LOGIN_EMAILS 內。
// 2. Email-only 登入（過渡用）：只有 STAFF_EMAIL_LOGIN_ENABLED 精確等於 'true' 才開。
// 3. 既有 session 每次讀取都重驗：email 被移出白名單、或 email 登入開關關閉後，
//    用 email 登入取得的舊 session 立即失效（Google 登入的 session 不受開關影響）。

import { isEmailAllowed } from './auth-allowlist'

export function normalizeStaffEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null
  const normalized = email.trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) return null
  return normalized
}

/** 精確比對字串 'true'；未設、'false'、'TRUE'、'1' 一律視為關閉（fail-closed）。 */
export function isStaffEmailLoginEnabled(raw: string | undefined | null): boolean {
  return raw === 'true'
}

export type GoogleStaffCheck =
  | { ok: true; email: string }
  | { ok: false; reason: 'no_email' | 'unverified' | 'not_allowed' }

export function checkGoogleStaffSignIn(
  profile: { email?: unknown; email_verified?: unknown } | null | undefined,
  allowlistRaw: string | undefined | null,
): GoogleStaffCheck {
  const email = normalizeStaffEmail(profile?.email)
  if (!email) return { ok: false, reason: 'no_email' }
  // 只接受布林 true；字串 'true' 或缺值都不算已驗證
  if (profile?.email_verified !== true) return { ok: false, reason: 'unverified' }
  if (!isEmailAllowed(email, allowlistRaw)) return { ok: false, reason: 'not_allowed' }
  return { ok: true, email }
}

/**
 * 既有 JWT session 是否仍有效。
 * provider 為 'google' 以外的值（含舊版 token 沒有 provider 欄位）都視為 email 登入，
 * 需要開關開啟才有效。
 */
export function isStaffSessionValid(
  token: { provider?: unknown; email?: unknown },
  env: { allowlistRaw: string | undefined | null; emailLoginFlag: string | undefined | null },
): boolean {
  const email = normalizeStaffEmail(token.email)
  if (!email || !isEmailAllowed(email, env.allowlistRaw)) return false
  if (token.provider === 'google') return true
  return isStaffEmailLoginEnabled(env.emailLoginFlag)
}
