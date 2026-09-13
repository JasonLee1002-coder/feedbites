import { test, expect } from '@playwright/test'
import {
  checkGoogleStaffSignIn,
  isStaffEmailLoginEnabled,
  isStaffSessionValid,
  normalizeStaffEmail,
} from '../../src/lib/staff-login-policy'

const LIST = 'boss@gmail.com, staff@x.com'

test('Google 未驗證 email 一律拒絕', () => {
  expect(checkGoogleStaffSignIn({ email: 'boss@gmail.com', email_verified: false }, LIST))
    .toEqual({ ok: false, reason: 'unverified' })
  expect(checkGoogleStaffSignIn({ email: 'boss@gmail.com' }, LIST))
    .toEqual({ ok: false, reason: 'unverified' })
  // 字串 'true' 不算布林 true
  expect(checkGoogleStaffSignIn({ email: 'boss@gmail.com', email_verified: 'true' }, LIST))
    .toEqual({ ok: false, reason: 'unverified' })
})

test('Google 白名單外拒絕', () => {
  expect(checkGoogleStaffSignIn({ email: 'attacker@gmail.com', email_verified: true }, LIST))
    .toEqual({ ok: false, reason: 'not_allowed' })
})

test('Google 白名單未設定時拒絕所有人（fail-closed）', () => {
  expect(checkGoogleStaffSignIn({ email: 'boss@gmail.com', email_verified: true }, undefined))
    .toEqual({ ok: false, reason: 'not_allowed' })
  expect(checkGoogleStaffSignIn({ email: 'boss@gmail.com', email_verified: true }, ''))
    .toEqual({ ok: false, reason: 'not_allowed' })
})

test('Google 白名單內且已驗證允許，email 正規化為小寫', () => {
  expect(checkGoogleStaffSignIn({ email: 'boss@gmail.com', email_verified: true }, LIST))
    .toEqual({ ok: true, email: 'boss@gmail.com' })
  expect(checkGoogleStaffSignIn({ email: '  BOSS@Gmail.COM ', email_verified: true }, ' STAFF@X.COM ,boss@gmail.com'))
    .toEqual({ ok: true, email: 'boss@gmail.com' })
})

test('Google 缺 email 或 profile 拒絕', () => {
  expect(checkGoogleStaffSignIn(null, LIST)).toEqual({ ok: false, reason: 'no_email' })
  expect(checkGoogleStaffSignIn({ email_verified: true }, LIST)).toEqual({ ok: false, reason: 'no_email' })
  expect(checkGoogleStaffSignIn({ email: '   ', email_verified: true }, LIST)).toEqual({ ok: false, reason: 'no_email' })
})

test('email 登入開關只認精確的 true', () => {
  expect(isStaffEmailLoginEnabled('true')).toBe(true)
  expect(isStaffEmailLoginEnabled(undefined)).toBe(false)
  expect(isStaffEmailLoginEnabled(null)).toBe(false)
  expect(isStaffEmailLoginEnabled('')).toBe(false)
  expect(isStaffEmailLoginEnabled('false')).toBe(false)
  expect(isStaffEmailLoginEnabled('TRUE')).toBe(false)
  expect(isStaffEmailLoginEnabled(' true')).toBe(false)
  expect(isStaffEmailLoginEnabled('1')).toBe(false)
})

test('normalizeStaffEmail', () => {
  expect(normalizeStaffEmail('  A@B.com ')).toBe('a@b.com')
  expect(normalizeStaffEmail('no-at-sign')).toBeNull()
  expect(normalizeStaffEmail(123)).toBeNull()
})

test('既有 session：Google 登入的 session 不受 email 開關影響', () => {
  const env = { allowlistRaw: LIST, emailLoginFlag: undefined }
  expect(isStaffSessionValid({ provider: 'google', email: 'boss@gmail.com' }, env)).toBe(true)
})

test('既有 session：email 登入（含舊 token 無 provider）在開關關閉時失效', () => {
  const off = { allowlistRaw: LIST, emailLoginFlag: 'false' }
  const on = { allowlistRaw: LIST, emailLoginFlag: 'true' }
  expect(isStaffSessionValid({ provider: 'credentials', email: 'boss@gmail.com' }, off)).toBe(false)
  expect(isStaffSessionValid({ email: 'boss@gmail.com' }, off)).toBe(false)
  expect(isStaffSessionValid({ provider: 'credentials', email: 'boss@gmail.com' }, on)).toBe(true)
  expect(isStaffSessionValid({ email: 'boss@gmail.com' }, on)).toBe(true)
})

test('既有 session：移出白名單即失效', () => {
  const env = { allowlistRaw: 'staff@x.com', emailLoginFlag: 'true' }
  expect(isStaffSessionValid({ provider: 'google', email: 'boss@gmail.com' }, env)).toBe(false)
  expect(isStaffSessionValid({ provider: 'google' }, env)).toBe(false)
})
