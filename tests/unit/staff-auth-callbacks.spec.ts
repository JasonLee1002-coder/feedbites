import { test, expect } from '@playwright/test'
import { createStaffAuthCallbacks } from '../../src/lib/staff-auth-callbacks'

const DB_ID = '916f87a4-b44b-46c7-81a1-109cf13b9852'
const GOOGLE_SUB = '112233445566778899000'

function setup(env: { allowlistRaw?: string; emailLoginFlag?: string }) {
  const calls: string[] = []
  const cb = createStaffAuthCallbacks({
    upsertUserByEmail: async (email) => {
      calls.push(email)
      return { id: DB_ID, email }
    },
    env: () => ({ allowlistRaw: env.allowlistRaw, emailLoginFlag: env.emailLoginFlag }),
  })
  // callback 參數型別很嚴，測試只放用得到的欄位
  const jwt = (p: Record<string, unknown>) => cb.jwt!(p as never)
  const signIn = (p: Record<string, unknown>) => cb.signIn!(p as never)
  return { calls, jwt, signIn }
}

const googleAccount = { provider: 'google', type: 'oidc', providerAccountId: GOOGLE_SUB }
const credAccount = { provider: 'credentials', type: 'credentials', providerAccountId: DB_ID }

test('Google 首次登入：token.id 是資料庫 users.id，不是 Google sub', async () => {
  const { calls, jwt } = setup({ allowlistRaw: 'boss@gmail.com' })
  const token = await jwt({
    token: { sub: GOOGLE_SUB, email: 'Boss@Gmail.com' },
    user: { id: GOOGLE_SUB, email: 'Boss@Gmail.com' },
    account: googleAccount,
    profile: { sub: GOOGLE_SUB, email: 'Boss@Gmail.com', email_verified: true },
  })
  expect(calls).toEqual(['boss@gmail.com'])
  expect(token).toMatchObject({ id: DB_ID, sub: DB_ID, email: 'boss@gmail.com', provider: 'google' })
})

test('Google 首次登入：未驗證或白名單外不建使用者並拋錯', async () => {
  const { calls, jwt } = setup({ allowlistRaw: 'boss@gmail.com' })
  await expect(jwt({
    token: {}, user: { id: GOOGLE_SUB }, account: googleAccount,
    profile: { email: 'boss@gmail.com', email_verified: false },
  })).rejects.toThrow(/unverified/)
  await expect(jwt({
    token: {}, user: { id: GOOGLE_SUB }, account: googleAccount,
    profile: { email: 'other@gmail.com', email_verified: true },
  })).rejects.toThrow(/not_allowed/)
  expect(calls).toEqual([])
})

test('signIn callback：Google 依 email_verified + 白名單；credentials 依開關', async () => {
  const off = setup({ allowlistRaw: 'boss@gmail.com' })
  expect(await off.signIn({ account: googleAccount, profile: { email: 'boss@gmail.com', email_verified: true } })).toBe(true)
  expect(await off.signIn({ account: googleAccount, profile: { email: 'boss@gmail.com', email_verified: false } })).toBe(false)
  expect(await off.signIn({ account: googleAccount, profile: { email: 'x@gmail.com', email_verified: true } })).toBe(false)
  expect(await off.signIn({ account: credAccount })).toBe(false)
  expect(await off.signIn({ account: { provider: 'github' } })).toBe(false)

  const on = setup({ allowlistRaw: 'boss@gmail.com', emailLoginFlag: 'true' })
  expect(await on.signIn({ account: credAccount })).toBe(true)
})

test('credentials 首次登入沿用 authorize 回傳的資料庫 id', async () => {
  const { jwt } = setup({ allowlistRaw: 'boss@gmail.com', emailLoginFlag: 'true' })
  const token = await jwt({ token: { email: 'boss@gmail.com' }, user: { id: DB_ID, email: 'boss@gmail.com' }, account: credAccount })
  expect(token).toMatchObject({ id: DB_ID, provider: 'credentials' })
})

test('既有 session：關閉 email 登入後 email session 失效、Google session 保留', async () => {
  const { jwt } = setup({ allowlistRaw: 'boss@gmail.com', emailLoginFlag: 'false' })
  expect(await jwt({ token: { id: DB_ID, email: 'boss@gmail.com', provider: 'credentials' } })).toBeNull()
  expect(await jwt({ token: { id: DB_ID, email: 'boss@gmail.com' } })).toBeNull()
  expect(await jwt({ token: { id: DB_ID, email: 'boss@gmail.com', provider: 'google' } }))
    .toMatchObject({ id: DB_ID, provider: 'google' })
})
