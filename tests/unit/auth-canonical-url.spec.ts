import { test, expect } from '@playwright/test'
import { buildCanonicalAuthUrl, resolveCanonicalOrigin } from '../../src/lib/auth-canonical-url'

const PROD_ENV = {
  AUTH_URL: 'https://poc.mcstation.ai/eatagain/api/auth',
  PUBLIC_BASE_URL: 'https://poc.mcstation.ai/eatagain',
}

test('偽造 Host 的請求：origin 仍是 AUTH_URL，pathname 補上 basePath，query 保留', () => {
  const url = buildCanonicalAuthUrl(
    'http://evil.example.com:8080/api/auth/callback/google?code=abc&state=xyz',
    PROD_ENV,
    '/eatagain',
  )
  expect(url.href).toBe('https://poc.mcstation.ai/eatagain/api/auth/callback/google?code=abc&state=xyz')
})

test('pathname 已含 basePath 時不重複補', () => {
  const url = buildCanonicalAuthUrl('http://evil.example.com/eatagain/api/auth/session', PROD_ENV, '/eatagain')
  expect(url.href).toBe('https://poc.mcstation.ai/eatagain/api/auth/session')
})

test('只補完整路徑段：/eatagainX 不算已含 basePath', () => {
  const url = buildCanonicalAuthUrl('http://h/eatagainX/api/auth/session', PROD_ENV, '/eatagain')
  expect(url.pathname).toBe('/eatagain/eatagainX/api/auth/session')
})

test('沒有 AUTH_URL 時退回 PUBLIC_BASE_URL 的 origin', () => {
  expect(resolveCanonicalOrigin('http://evil.example.com/api/auth/signin', {
    PUBLIC_BASE_URL: 'https://poc.mcstation.ai/eatagain',
  })).toBe('https://poc.mcstation.ai')
})

test('AUTH_URL 不是合法 URL 時退回 PUBLIC_BASE_URL', () => {
  expect(resolveCanonicalOrigin('http://evil.example.com/api/auth/signin', {
    AUTH_URL: 'not a url',
    PUBLIC_BASE_URL: 'https://poc.mcstation.ai/eatagain',
  })).toBe('https://poc.mcstation.ai')
})

test('兩者都沒有（本機開發）才用 req.url 的 origin', () => {
  const url = buildCanonicalAuthUrl('http://localhost:3000/api/auth/providers?x=1', {}, '/eatagain')
  expect(url.href).toBe('http://localhost:3000/eatagain/api/auth/providers?x=1')
})

test('basePath 為空字串時不補前綴', () => {
  const url = buildCanonicalAuthUrl('http://evil.example.com/api/auth/csrf', PROD_ENV, '')
  expect(url.href).toBe('https://poc.mcstation.ai/api/auth/csrf')
})
