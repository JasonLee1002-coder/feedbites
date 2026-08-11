import { test, expect } from '@playwright/test'
import { isEmailAllowed, parseAllowlist } from '../../src/lib/auth-allowlist'

test('未設定白名單時拒絕所有人（fail-closed）', () => {
  expect(isEmailAllowed('anyone@gmail.com', undefined)).toBe(false)
  expect(isEmailAllowed('anyone@gmail.com', '')).toBe(false)
  expect(isEmailAllowed('anyone@gmail.com', '   ')).toBe(false)
})

test('名單內的信箱允許登入', () => {
  expect(isEmailAllowed('boss@gmail.com', 'boss@gmail.com')).toBe(true)
})

test('大小寫與空白不影響比對', () => {
  expect(isEmailAllowed('  BOSS@Gmail.com ', 'boss@gmail.com')).toBe(true)
  expect(isEmailAllowed('boss@gmail.com', ' BOSS@GMAIL.COM , staff@x.com ')).toBe(true)
})

test('名單外的信箱一律拒絕', () => {
  expect(isEmailAllowed('attacker@gmail.com', 'boss@gmail.com,staff@x.com')).toBe(false)
})

test('空信箱拒絕', () => {
  expect(isEmailAllowed(null, 'boss@gmail.com')).toBe(false)
  expect(isEmailAllowed(undefined, 'boss@gmail.com')).toBe(false)
  expect(isEmailAllowed('', 'boss@gmail.com')).toBe(false)
})

test('parseAllowlist 去除空項目', () => {
  expect(parseAllowlist('a@x.com, ,b@x.com,')).toEqual(['a@x.com', 'b@x.com'])
})
