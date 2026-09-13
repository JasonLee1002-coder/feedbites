import { test, expect } from '@playwright/test'
import {
  signPayload, verifyPayload, safeNext, isUuid, signClaimToken, readClaimToken, customerSecret, CLAIM_TOKEN_TTL_MS,
} from '../../src/lib/customer-session'

const SECRET = 'unit-test-secret'

test('簽章後可驗回原內容', () => {
  const token = signPayload({ cid: 'abc', exp: Date.now() + 60_000 }, SECRET)
  expect(verifyPayload<{ cid: string; exp: number }>(token, SECRET)?.cid).toBe('abc')
})

test('竄改內容驗證失敗', () => {
  const token = signPayload({ cid: 'abc', exp: Date.now() + 60_000 }, SECRET)
  const [, mac] = token.split('.')
  const forged = Buffer.from(JSON.stringify({ cid: 'evil', exp: Date.now() + 60_000 })).toString('base64url') + '.' + mac
  expect(verifyPayload(forged, SECRET)).toBeNull()
})

test('錯的 secret 驗證失敗', () => {
  const token = signPayload({ cid: 'abc', exp: Date.now() + 60_000 }, SECRET)
  expect(verifyPayload(token, 'other')).toBeNull()
})

test('過期驗證失敗', () => {
  const token = signPayload({ cid: 'abc', exp: Date.now() - 1 }, SECRET)
  expect(verifyPayload(token, SECRET)).toBeNull()
})

test('空值與亂碼回 null 不丟例外', () => {
  expect(verifyPayload(undefined, SECRET)).toBeNull()
  expect(verifyPayload('garbage', SECRET)).toBeNull()
  expect(verifyPayload('a.b', SECRET)).toBeNull()
})

test('safeNext 只允許站內 /eatagain/ 路徑', () => {
  expect(safeNext('/eatagain/w/123')).toBe('/eatagain/w/123')
  expect(safeNext('https://evil.com')).toBe('/eatagain')
  expect(safeNext('//evil.com/eatagain/')).toBe('/eatagain')
  expect(safeNext(null)).toBe('/eatagain')
})

test('isUuid', () => {
  expect(isUuid('36759bb5-7786-47bf-a5e2-ce78b3e27dc7')).toBe(true)
  expect(isUuid('not-a-uuid')).toBe(false)
  expect(isUuid(null)).toBe(false)
})

const RID = '11111111-2222-4333-8444-555555555555'

test('認領憑證：正確簽發可換回 response id', () => {
  const now = Date.now()
  expect(readClaimToken(signClaimToken(RID, SECRET, now), SECRET, now + 1000)).toBe(RID)
})

test('認領憑證：過期、錯 secret、偽造、裸 id、非 uuid 都不接受', () => {
  const now = Date.now()
  const token = signClaimToken(RID, SECRET, now)
  expect(readClaimToken(token, SECRET, now + CLAIM_TOKEN_TTL_MS + 1)).toBeNull()
  expect(readClaimToken(token, 'other', now)).toBeNull()
  const [, mac] = token.split('.')
  const forgedBody = Buffer.from(JSON.stringify({ rid: '99999999-2222-4333-8444-555555555555', exp: now + 60_000 })).toString('base64url')
  expect(readClaimToken(`${forgedBody}.${mac}`, SECRET, now)).toBeNull()
  expect(readClaimToken(RID, SECRET, now)).toBeNull()
  expect(readClaimToken(signPayload({ rid: 'not-a-uuid', exp: now + 60_000 }, SECRET), SECRET, now)).toBeNull()
  expect(readClaimToken(signPayload({ cid: RID, exp: now + 60_000 }, SECRET), SECRET, now)).toBeNull()
  expect(readClaimToken(null, SECRET, now)).toBeNull()
})

test('customerSecret 不退回 AUTH_SECRET', () => {
  const saved = { c: process.env.CUSTOMER_SESSION_SECRET, a: process.env.AUTH_SECRET }
  try {
    delete process.env.CUSTOMER_SESSION_SECRET
    process.env.AUTH_SECRET = 'auth-secret'
    expect(() => customerSecret()).toThrow(/CUSTOMER_SESSION_SECRET/)
    process.env.CUSTOMER_SESSION_SECRET = 'customer-secret'
    expect(customerSecret()).toBe('customer-secret')
  } finally {
    if (saved.c === undefined) delete process.env.CUSTOMER_SESSION_SECRET; else process.env.CUSTOMER_SESSION_SECRET = saved.c
    if (saved.a === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = saved.a
  }
})
