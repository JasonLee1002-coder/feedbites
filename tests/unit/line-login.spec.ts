import { test, expect } from '@playwright/test'
import { buildAuthorizeUrl } from '../../src/lib/line-login'

test('authorize URL 帶齊必要參數與加好友提示', () => {
  const url = new URL(buildAuthorizeUrl({
    channelId: '1234567890',
    redirectUri: 'https://poc.mcstation.ai/feedbites/api/customer/line/callback',
    state: 'st', nonce: 'nc',
  }))
  expect(url.origin + url.pathname).toBe('https://access.line.me/oauth2/v2.1/authorize')
  expect(url.searchParams.get('response_type')).toBe('code')
  expect(url.searchParams.get('client_id')).toBe('1234567890')
  expect(url.searchParams.get('redirect_uri')).toBe('https://poc.mcstation.ai/feedbites/api/customer/line/callback')
  expect(url.searchParams.get('state')).toBe('st')
  expect(url.searchParams.get('nonce')).toBe('nc')
  expect(url.searchParams.get('scope')).toBe('profile openid')
  expect(url.searchParams.get('bot_prompt')).toBe('aggressive')
})
