import { test, expect } from '@playwright/test'
import { signPayload, verifyPayload, safeNext, isUuid } from '../../src/lib/customer-session'

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

test('safeNext 只允許站內 /feedbites/ 路徑', () => {
  expect(safeNext('/feedbites/w/123')).toBe('/feedbites/w/123')
  expect(safeNext('https://evil.com')).toBe('/feedbites')
  expect(safeNext('//evil.com/feedbites/')).toBe('/feedbites')
  expect(safeNext(null)).toBe('/feedbites')
})

test('isUuid', () => {
  expect(isUuid('36759bb5-7786-47bf-a5e2-ce78b3e27dc7')).toBe(true)
  expect(isUuid('not-a-uuid')).toBe(false)
  expect(isUuid(null)).toBe(false)
})
