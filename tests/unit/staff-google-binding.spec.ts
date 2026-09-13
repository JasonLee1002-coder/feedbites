import { test, expect } from '@playwright/test'
import {
  bindGoogleUserWith,
  isGoogleSubUniqueViolation,
  type GoogleBindingStore,
} from '../../src/lib/staff-google-binding'

const SUB_A = '112233445566778899000'
const SUB_B = '998877665544332211000'

type Row = { id: string; email: string; google_sub: string | null }

/** 模擬 users 表：email 與 google_sub（非 NULL）各自唯一 */
function memoryStore(rows: Row[], hooks: { beforeBind?: () => void; beforeInsert?: () => void } = {}) {
  let seq = 0
  const store: GoogleBindingStore = {
    async findByEmail(email) {
      const r = rows.find((x) => x.email === email)
      return r ? { ...r } : null
    },
    async insertWithSub(email, sub) {
      hooks.beforeInsert?.()
      if (rows.some((x) => x.email === email)) return null
      if (rows.some((x) => x.google_sub === sub)) return 'sub_taken'
      const row = { id: `new-${++seq}`, email, google_sub: sub }
      rows.push(row)
      return { id: row.id, email }
    },
    async bindSubIfUnset(id, sub) {
      hooks.beforeBind?.()
      const r = rows.find((x) => x.id === id)
      if (!r || r.google_sub !== null) return false
      if (rows.some((x) => x.google_sub === sub)) return 'sub_taken'
      r.google_sub = sub
      return true
    },
  }
  return store
}

test('沒有 users 列：建立並寫入 sub', async () => {
  const rows: Row[] = []
  const res = await bindGoogleUserWith(memoryStore(rows), { email: 'new@gmail.com', sub: SUB_A })
  expect(res).toEqual({ ok: true, user: { id: 'new-1', email: 'new@gmail.com' } })
  expect(rows).toEqual([{ id: 'new-1', email: 'new@gmail.com', google_sub: SUB_A }])
})

test('既有店長 google_sub 為 NULL：首次綁定，沿用原本 users.id', async () => {
  const rows: Row[] = [{ id: 'u1', email: 'boss@gmail.com', google_sub: null }]
  const res = await bindGoogleUserWith(memoryStore(rows), { email: 'boss@gmail.com', sub: SUB_A })
  expect(res).toEqual({ ok: true, user: { id: 'u1', email: 'boss@gmail.com' } })
  expect(rows[0].google_sub).toBe(SUB_A)
})

test('同一個 sub：通過', async () => {
  const rows: Row[] = [{ id: 'u1', email: 'boss@gmail.com', google_sub: SUB_A }]
  const res = await bindGoogleUserWith(memoryStore(rows), { email: 'boss@gmail.com', sub: SUB_A })
  expect(res).toEqual({ ok: true, user: { id: 'u1', email: 'boss@gmail.com' } })
})

test('同 email 不同 sub（email 被重新指派給別人）：拒絕 sub_mismatch，不改資料', async () => {
  const rows: Row[] = [{ id: 'u1', email: 'boss@gmail.com', google_sub: SUB_A }]
  const res = await bindGoogleUserWith(memoryStore(rows), { email: 'boss@gmail.com', sub: SUB_B })
  expect(res).toEqual({ ok: false, reason: 'sub_mismatch' })
  expect(rows[0].google_sub).toBe(SUB_A)
})

test('sub 已綁在別的 email 上：綁定既有列或建新列都拒絕 sub_taken', async () => {
  const rows: Row[] = [
    { id: 'u1', email: 'old@gmail.com', google_sub: SUB_A },
    { id: 'u2', email: 'boss@gmail.com', google_sub: null },
  ]
  expect(await bindGoogleUserWith(memoryStore(rows), { email: 'boss@gmail.com', sub: SUB_A }))
    .toEqual({ ok: false, reason: 'sub_taken' })
  expect(await bindGoogleUserWith(memoryStore(rows), { email: 'new@gmail.com', sub: SUB_A }))
    .toEqual({ ok: false, reason: 'sub_taken' })
  expect(rows).toHaveLength(2)
  expect(rows[1].google_sub).toBeNull()
})

test('同 email 兩個首次登入同時進來：後到的若 sub 不同會被拒絕', async () => {
  const rows: Row[] = [{ id: 'u1', email: 'boss@gmail.com', google_sub: null }]
  // 讀到 NULL 之後、寫入之前，另一個請求先綁上 SUB_A
  let raced = false
  const store = memoryStore(rows, {
    beforeBind: () => {
      if (!raced) { raced = true; rows[0].google_sub = SUB_A }
    },
  })
  expect(await bindGoogleUserWith(store, { email: 'boss@gmail.com', sub: SUB_B }))
    .toEqual({ ok: false, reason: 'sub_mismatch' })
  expect(rows[0].google_sub).toBe(SUB_A)
})

test('同 email 同時建立：INSERT 撞到 email 後重讀並綁定', async () => {
  const rows: Row[] = []
  let raced = false
  const store = memoryStore(rows, {
    beforeInsert: () => {
      if (!raced) { raced = true; rows.push({ id: 'u9', email: 'boss@gmail.com', google_sub: SUB_A }) }
    },
  })
  expect(await bindGoogleUserWith(store, { email: 'boss@gmail.com', sub: SUB_A }))
    .toEqual({ ok: true, user: { id: 'u9', email: 'boss@gmail.com' } })
})

test('isGoogleSubUniqueViolation：只認 uq_users_google_sub，含 drizzle 包在 cause 裡的情況', () => {
  const pgErr = { code: '23505', constraint_name: 'uq_users_google_sub' }
  expect(isGoogleSubUniqueViolation(pgErr)).toBe(true)
  expect(isGoogleSubUniqueViolation(Object.assign(new Error('Failed query'), { cause: pgErr }))).toBe(true)
  expect(isGoogleSubUniqueViolation({ code: '23505', constraint_name: 'users_email_key' })).toBe(false)
  expect(isGoogleSubUniqueViolation(new Error('boom'))).toBe(false)
  expect(isGoogleSubUniqueViolation(null)).toBe(false)
})
