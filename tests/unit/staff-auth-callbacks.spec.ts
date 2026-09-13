import { test, expect } from '@playwright/test'
import { createStaffAuthCallbacks } from '../../src/lib/staff-auth-callbacks'
import type { GoogleBindResult } from '../../src/lib/staff-google-binding'

const DB_ID = '916f87a4-b44b-46c7-81a1-109cf13b9852'
const GOOGLE_SUB = '112233445566778899000'

function setup(
  env: { allowlistRaw?: string; emailLoginFlag?: string },
  bindResult: GoogleBindResult | ((input: { email: string; sub: string }) => GoogleBindResult) =
    (input) => ({ ok: true, user: { id: DB_ID, email: input.email } }),
) {
  const calls: string[] = []
  const bindCalls: { email: string; sub: string }[] = []
  const warnings: { event: string; ctx: Record<string, unknown> }[] = []
  const cb = createStaffAuthCallbacks({
    bindGoogleUser: async (input) => {
      calls.push(input.email)
      bindCalls.push(input)
      return typeof bindResult === 'function' ? bindResult(input) : bindResult
    },
    env: () => ({ allowlistRaw: env.allowlistRaw, emailLoginFlag: env.emailLoginFlag }),
    warn: (event, ctx) => { warnings.push({ event, ctx }) },
  })
  // callback 參數型別很嚴，測試只放用得到的欄位
  const jwt = (p: Record<string, unknown>) => cb.jwt!(p as never)
  const signIn = (p: Record<string, unknown>) => cb.signIn!(p as never)
  return { calls, bindCalls, warnings, jwt, signIn }
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

// ── Google sub 綁定 ───────────────────────────────────────────────────────────

const OTHER_SUB = '998877665544332211000'

function googleSignIn(sub: unknown) {
  return {
    token: { sub: String(sub), email: 'boss@gmail.com' },
    user: { id: String(sub), email: 'boss@gmail.com' },
    account: googleAccount,
    profile: { sub, email: 'boss@gmail.com', email_verified: true },
  }
}

/** 回傳被拋出的錯誤；沒拋錯回 null */
function caught(p: unknown): Promise<unknown> {
  return Promise.resolve(p).then(() => null, (e: unknown) => e)
}

function expectAccessDenied(err: unknown, reason: RegExp) {
  expect(err).toBeInstanceOf(Error)
  expect((err as { type?: string }).type).toBe('AccessDenied')
  expect((err as Error).message).toMatch(reason)
}

test('Google sub：首次綁定把 email 與 sub 一起交給 bindGoogleUser，token.id 為 users.id', async () => {
  const { bindCalls, jwt, warnings } = setup({ allowlistRaw: 'boss@gmail.com' })
  const token = await jwt(googleSignIn(GOOGLE_SUB))
  expect(bindCalls).toEqual([{ email: 'boss@gmail.com', sub: GOOGLE_SUB }])
  expect(token).toMatchObject({ id: DB_ID, sub: DB_ID, provider: 'google' })
  expect(warnings).toEqual([])
})

test('Google sub：同一個 sub 再次登入通過', async () => {
  const bound = new Map<string, string>([['boss@gmail.com', GOOGLE_SUB]])
  const { jwt } = setup({ allowlistRaw: 'boss@gmail.com' }, ({ email, sub }) =>
    bound.get(email) === sub
      ? { ok: true, user: { id: DB_ID, email } }
      : { ok: false, reason: 'sub_mismatch' })
  await expect(jwt(googleSignIn(GOOGLE_SUB))).resolves.toMatchObject({ id: DB_ID, provider: 'google' })
  await expect(jwt(googleSignIn(GOOGLE_SUB))).resolves.toMatchObject({ id: DB_ID, provider: 'google' })
})

test('Google sub：同 email 不同 sub 拒絕（AccessDenied），log 只記 sub 前 4 碼', async () => {
  const { jwt, warnings } = setup({ allowlistRaw: 'boss@gmail.com' }, { ok: false, reason: 'sub_mismatch' })
  const err = await caught(jwt(googleSignIn(OTHER_SUB)))
  expectAccessDenied(err, /sub_mismatch/)
  expect(warnings).toHaveLength(1)
  expect(warnings[0].event).toBe('staff_google_signin_rejected')
  expect(warnings[0].ctx).toMatchObject({ reason: 'sub_mismatch', sub_prefix: OTHER_SUB.slice(0, 4) })
  expect(JSON.stringify(warnings[0].ctx)).not.toContain(OTHER_SUB)
  expect(JSON.stringify(warnings[0].ctx)).not.toContain('boss@gmail.com')
})

test('Google sub：sub 已綁在別的 user 上拒絕', async () => {
  const { jwt, warnings } = setup({ allowlistRaw: 'boss@gmail.com' }, { ok: false, reason: 'sub_taken' })
  const err = await caught(jwt(googleSignIn(GOOGLE_SUB)))
  expectAccessDenied(err, /sub_taken/)
  expect(warnings[0].ctx).toMatchObject({ reason: 'sub_taken' })
})

test('Google sub：profile 缺 sub（或空字串、非字串）拒絕，且不碰資料庫', async () => {
  for (const sub of [undefined, '', '   ', 12345]) {
    const { calls, jwt, warnings } = setup({ allowlistRaw: 'boss@gmail.com' })
    const input = googleSignIn(sub)
    const err = await caught(jwt(input))
    expectAccessDenied(err, /no_sub/)
    expect(calls).toEqual([])
    expect(warnings[0].ctx).toMatchObject({ reason: 'no_sub', sub_prefix: null })
  }
})
