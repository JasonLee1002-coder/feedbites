import { test, expect } from '@playwright/test'
import { NextRequest } from 'next/server'
import { OAUTH_STATE_COOKIE, signClaimToken, signPayload, verifyPayload } from '../../src/lib/customer-session'
import { finishLogin, startLogin, type OAuthState, type StoreGate } from '../../src/lib/customer-login'

const SECRET = 'unit-test-customer-secret'
const RID = '11111111-2222-4333-8444-555555555555'
const STORE = '22222222-2222-4333-8444-555555555555'
const openGate: StoreGate = async () => STORE
const closedGate: StoreGate = async () => null

test.beforeAll(() => {
  process.env.CUSTOMER_SESSION_SECRET = SECRET
  process.env.PUBLIC_BASE_URL = 'http://localhost/eatagain'
})

function stateFrom(res: Response): OAuthState | null {
  const setCookie = res.headers.get('set-cookie') ?? ''
  const m = setCookie.match(new RegExp(`${OAUTH_STATE_COOKIE}=([^;]+)`))
  return m ? verifyPayload<OAuthState>(decodeURIComponent(m[1]), SECRET) : null
}

function start(claim: string, gate: StoreGate = openGate) {
  const req = new NextRequest(`http://localhost/eatagain/api/customer/line/start?claim=${encodeURIComponent(claim)}&store=${STORE}`)
  return startLogin(req, 'line', () => 'https://access.line.me/oauth2/v2.1/authorize', gate)
}

test('startLogin 接受有效認領憑證，state 裡存 rid 與原始 token', async () => {
  const token = signClaimToken(RID, SECRET)
  const st = stateFrom(await start(token))
  expect(st?.claim).toBe(RID)
  expect(st?.claimToken).toBe(token)
})

test('startLogin 不接受裸 response id、偽造、錯 secret、過期的憑證', async () => {
  const now = Date.now()
  const forged = Buffer.from(JSON.stringify({ rid: RID, exp: now + 60_000 })).toString('base64url') + '.bogus'
  const cases = [
    RID,
    forged,
    signClaimToken(RID, 'other-secret'),
    signClaimToken(RID, SECRET, now - 31 * 60 * 1000),
  ]
  for (const c of cases) {
    const st = stateFrom(await start(c))
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
  const res = await finishLogin(req, 'line', async () => { throw new Error('should not be called') }, openGate)
  const location = res.headers.get('location') ?? ''
  expect(location).toContain(`claim=${encodeURIComponent(token)}`)
  expect(location).not.toContain(`claim=${RID}`)
})

test('店家沒開放點數時，startLogin 不進 OAuth、不設 state cookie', async () => {
  const token = signClaimToken(RID, SECRET)
  const res = await start(token, closedGate)
  expect(res.headers.get('location')).toContain(`/w/${STORE}?login=unavailable`)
  expect(stateFrom(res)).toBeNull()
})

test('OAuth 往返期間店家關閉點數，finishLogin 不建立客人', async () => {
  const st: OAuthState = {
    provider: 'line', state: 's', nonce: 'n', claim: RID, claimToken: null,
    store: STORE, exp: Date.now() + 60_000,
  }
  const req = new NextRequest('http://localhost/eatagain/api/customer/line/callback?code=c&state=s', {
    headers: { cookie: `${OAUTH_STATE_COOKIE}=${signPayload(st, SECRET)}` },
  })
  let called = false
  const res = await finishLogin(req, 'line', async () => { called = true; throw new Error('no') }, closedGate)
  expect(called).toBe(false)
  expect(res.headers.get('location')).toContain('login=unavailable')
})
