import { test, expect } from '@playwright/test'
import { NextRequest } from 'next/server'
import { OAUTH_STATE_COOKIE, signClaimToken, signPayload, verifyPayload } from '../../src/lib/customer-session'
import { finishLogin, startLogin, type OAuthState } from '../../src/lib/customer-login'

const SECRET = 'unit-test-customer-secret'
const RID = '11111111-2222-4333-8444-555555555555'

test.beforeAll(() => {
  process.env.CUSTOMER_SESSION_SECRET = SECRET
  process.env.PUBLIC_BASE_URL = 'http://localhost/eatagain'
})

function stateFrom(res: Response): OAuthState | null {
  const setCookie = res.headers.get('set-cookie') ?? ''
  const m = setCookie.match(new RegExp(`${OAUTH_STATE_COOKIE}=([^;]+)`))
  return m ? verifyPayload<OAuthState>(decodeURIComponent(m[1]), SECRET) : null
}

function start(claim: string) {
  const req = new NextRequest(`http://localhost/eatagain/api/customer/line/start?claim=${encodeURIComponent(claim)}`)
  return startLogin(req, 'line', () => 'https://access.line.me/oauth2/v2.1/authorize')
}

test('startLogin 接受有效認領憑證，state 裡存 rid 與原始 token', () => {
  const token = signClaimToken(RID, SECRET)
  const st = stateFrom(start(token))
  expect(st?.claim).toBe(RID)
  expect(st?.claimToken).toBe(token)
})

test('startLogin 不接受裸 response id、偽造、錯 secret、過期的憑證', () => {
  const now = Date.now()
  const forged = Buffer.from(JSON.stringify({ rid: RID, exp: now + 60_000 })).toString('base64url') + '.bogus'
  const cases = [
    RID,
    forged,
    signClaimToken(RID, 'other-secret'),
    signClaimToken(RID, SECRET, now - 31 * 60 * 1000),
  ]
  for (const c of cases) {
    const st = stateFrom(start(c))
    expect(st).not.toBeNull()
    expect(st?.claim).toBeNull()
    expect(st?.claimToken).toBeNull()
  }
})

test('finishLogin 失敗時重試連結帶回原始認領憑證（已編碼）', async () => {
  const token = signClaimToken(RID, SECRET)
  const st: OAuthState = {
    provider: 'line', state: 's', nonce: 'n', claim: RID, claimToken: token,
    store: '22222222-2222-4333-8444-555555555555', exp: Date.now() + 60_000,
  }
  const req = new NextRequest('http://localhost/eatagain/api/customer/line/callback?error=access_denied', {
    headers: { cookie: `${OAUTH_STATE_COOKIE}=${signPayload(st, SECRET)}` },
  })
  const res = await finishLogin(req, 'line', async () => { throw new Error('should not be called') })
  const location = res.headers.get('location') ?? ''
  expect(location).toContain(`claim=${encodeURIComponent(token)}`)
  expect(location).not.toContain(`claim=${RID}`)
})
