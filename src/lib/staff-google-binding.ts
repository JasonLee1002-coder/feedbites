// src/lib/staff-google-binding.ts
// 店長 Google 登入：把 Google 不可變的帳號 ID（OIDC sub）綁到 users 列上。
//
// 只用 email 對應帳號的風險：Google Workspace 管理員把同一個 email 重新指派給另一個人，
// 新的人會以同 email 登入並繼承舊店長的 users.id 與店家權限。白名單擋不住，因為 email 相同。
//
// 規則：
// - email 沒有 users 列：建立並寫入 google_sub。
// - 有列且 google_sub 為 NULL：寫入（首次綁定，既有店長都是這個情況）。
// - 有列且 google_sub === sub：通過。
// - 有列且 google_sub 不同：拒絕 sub_mismatch。
// - 寫入時撞到 uq_users_google_sub（這個 sub 已綁在別的 email 上）：拒絕 sub_taken。
// 寫入一律是條件式單一語句（INSERT ... ON CONFLICT (email) DO NOTHING／UPDATE ... WHERE google_sub IS NULL），
// 兩個同 email 的首次登入同時進來時，只有一個會寫成功，另一個重讀後依上面規則判斷。
import { and, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { users } from './db/schema'

export type GoogleBindReason = 'sub_mismatch' | 'sub_taken'

export type GoogleBindResult =
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; reason: GoogleBindReason }

export interface GoogleBindingStore {
  findByEmail: (email: string) => Promise<{ id: string; email: string; google_sub: string | null } | null>
  /** 建立新列並寫入 sub。email 已存在（同時被別人建立）回 null；sub 已被別列使用回 'sub_taken'。 */
  insertWithSub: (email: string, sub: string) => Promise<{ id: string; email: string } | null | 'sub_taken'>
  /** 只在 google_sub 仍為 NULL 時寫入。沒寫到（已被綁定）回 false；sub 已被別列使用回 'sub_taken'。 */
  bindSubIfUnset: (id: string, sub: string) => Promise<boolean | 'sub_taken'>
}

const MAX_ATTEMPTS = 3

export async function bindGoogleUserWith(
  store: GoogleBindingStore,
  input: { email: string; sub: string },
): Promise<GoogleBindResult> {
  const { email, sub } = input
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const existing = await store.findByEmail(email)

    if (!existing) {
      const created = await store.insertWithSub(email, sub)
      if (created === 'sub_taken') return { ok: false, reason: 'sub_taken' }
      if (created) return { ok: true, user: created }
      continue // 同 email 剛被別的請求建立，重讀
    }

    if (existing.google_sub === sub) {
      return { ok: true, user: { id: existing.id, email: existing.email } }
    }
    if (existing.google_sub !== null) {
      return { ok: false, reason: 'sub_mismatch' }
    }

    const bound = await store.bindSubIfUnset(existing.id, sub)
    if (bound === 'sub_taken') return { ok: false, reason: 'sub_taken' }
    if (bound) return { ok: true, user: { id: existing.id, email: existing.email } }
    // 同時有別的請求先綁上了，重讀後比對
  }
  throw new Error('google binding: too many concurrent updates')
}

/** postgres-js 的唯一鍵衝突；drizzle 會把原始錯誤包在 cause 裡。 */
export function isGoogleSubUniqueViolation(err: unknown): boolean {
  let cur: unknown = err
  for (let depth = 0; depth < 5 && cur && typeof cur === 'object'; depth++) {
    const e = cur as { code?: unknown; constraint_name?: unknown; cause?: unknown }
    if (e.code === '23505' && e.constraint_name === 'uq_users_google_sub') return true
    cur = e.cause
  }
  return false
}

export function createDbGoogleBindingStore(db: PostgresJsDatabase): GoogleBindingStore {
  return {
    async findByEmail(email) {
      const [row] = await db
        .select({ id: users.id, email: users.email, google_sub: users.google_sub })
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
      return row ?? null
    },

    async insertWithSub(email, sub) {
      try {
        const [row] = await db
          .insert(users)
          .values({ email, google_sub: sub })
          .onConflictDoNothing({ target: users.email })
          .returning({ id: users.id, email: users.email })
        return row ?? null
      } catch (err) {
        if (isGoogleSubUniqueViolation(err)) return 'sub_taken'
        throw err
      }
    },

    async bindSubIfUnset(id, sub) {
      try {
        const rows = await db
          .update(users)
          .set({ google_sub: sub, updated_at: new Date() })
          .where(and(eq(users.id, id), isNull(users.google_sub)))
          .returning({ id: users.id })
        return rows.length > 0
      } catch (err) {
        if (isGoogleSubUniqueViolation(err)) return 'sub_taken'
        throw err
      }
    },
  }
}
