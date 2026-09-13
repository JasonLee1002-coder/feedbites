import { test, expect } from '@playwright/test'
import { buildGoogleAuthorizeUrl, checkGoogleClaims } from '../../src/lib/google-login'

test('Google authorize URL 帶齊參數', () => {
  const url = new URL(buildGoogleAuthorizeUrl({
    clientId: 'cid.apps.googleusercontent.com',
    redirectUri: 'https://poc.mcstation.ai/eatagain/api/customer/google/callback',
    state: 'st', nonce: 'nc',
  }))
  expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
  expect(url.searchParams.get('response_type')).toBe('code')
  expect(url.searchParams.get('scope')).toBe('openid profile')
  expect(url.searchParams.get('state')).toBe('st')
  expect(url.searchParams.get('nonce')).toBe('nc')
  expect(url.searchParams.get('prompt')).toBe('select_account')
})

test('checkGoogleClaims 驗 aud、iss、nonce、exp', () => {
  const now = 1_800_000_000
  const ok = { aud: 'cid', iss: 'https://accounts.google.com', nonce: 'n', exp: String(now + 60), sub: '123', name: '甲', picture: 'p' }
  expect(checkGoogleClaims(ok, 'cid', 'n', now)).toEqual({ sub: '123', name: '甲', picture: 'p' })
  expect(() => checkGoogleClaims({ ...ok, aud: 'other' }, 'cid', 'n', now)).toThrow(/aud/)
  expect(() => checkGoogleClaims({ ...ok, iss: 'evil' }, 'cid', 'n', now)).toThrow(/iss/)
  expect(() => checkGoogleClaims({ ...ok, nonce: 'x' }, 'cid', 'n', now)).toThrow(/nonce/)
  expect(() => checkGoogleClaims({ ...ok, exp: String(now - 1) }, 'cid', 'n', now)).toThrow(/expired/)
})
