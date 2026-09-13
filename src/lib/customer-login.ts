// LINE 與 Google 共用：start 產 state/nonce 並導向；callback 驗 state、建客人、認領問卷、設 session。
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import {
  CUSTOMER_COOKIE, OAUTH_STATE_COOKIE, SESSION_TTL_MS,
  cookieOptions, customerSecret, isUuid, signPayload, verifyPayload,
} from '@/lib/customer-session'
import { claimResponse, getStoreIdForResponse, upsertCustomer, type IdentityProvider } from '@/lib/ledger/service'
import type { LineProfile } from '@/lib/line-login'
import { logger, newRequestId } from '@/lib/logger'

export type OAuthState = {
  provider: IdentityProvider
  state: string
  nonce: string
  claim: string | null
  store: string | null
  exp: number
}

export function startLogin(
  req: NextRequest,
  provider: IdentityProvider,
  buildUrl: (state: string, nonce: string) => string,
): NextResponse {
  const claimParam = req.nextUrl.searchParams.get('claim')
  const storeParam = req.nextUrl.searchParams.get('store')
  try {
    const payload: OAuthState = {
      provider,
      state: randomBytes(16).toString('hex'),
      nonce: randomBytes(16).toString('hex'),
      claim: isUuid(claimParam) ? claimParam : null,
      store: isUuid(storeParam) ? storeParam : null,
      exp: Date.now() + 10 * 60 * 1000,
    }
    const res = NextResponse.redirect(buildUrl(payload.state, payload.nonce))
    res.cookies.set(OAUTH_STATE_COOKIE, signPayload(payload, customerSecret()), cookieOptions(600))
    return res
  } catch (err) {
    logger.error('customer.login.start.failed', { provider }, err)
    return NextResponse.json({ error: '登入暫時無法使用' }, { status: 503 })
  }
}

export async function finishLogin(
  req: NextRequest,
  provider: IdentityProvider,
  profileFromCode: (code: string, nonce: string) => Promise<LineProfile>,
): Promise<NextResponse> {
  const request_id = newRequestId()
  const base = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '')
  const st = verifyPayload<OAuthState>(req.cookies.get(OAUTH_STATE_COOKIE)?.value, customerSecret())
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const providerError = req.nextUrl.searchParams.get('error')

  const walletUrl = (storeId: string | null, query: string) =>
    storeId ? `${base}/w/${storeId}?${query}` : `${base}/`
  const retry = st?.claim ? `&claim=${st.claim}` : ''

  if (providerError || !st || st.provider !== provider || !code || state !== st.state) {
    logger.warn('customer.login.rejected', { request_id, provider }, providerError ?? 'state mismatch or missing')
    const storeId = st?.store ?? (st?.claim ? await getStoreIdForResponse(st.claim) : null)
    const res = NextResponse.redirect(walletUrl(storeId, `login=cancelled${retry}`))
    res.cookies.delete(OAUTH_STATE_COOKIE)
    return res
  }

  try {
    const profile = await profileFromCode(code, st.nonce)
    const customerId = await upsertCustomer({
      provider,
      subject: profile.sub,
      displayName: profile.name,
      pictureUrl: profile.picture,
    })

    let storeId = st.store
    let query = 'login=ok'
    if (st.claim) {
      const claimed = await claimResponse(customerId, st.claim)
      if (claimed) {
        storeId = claimed.storeId
        query = `claimed=${claimed.pointsAwarded}`
      } else {
        storeId = storeId ?? (await getStoreIdForResponse(st.claim))
        query = 'claimed=none'
      }
    }

    const res = NextResponse.redirect(walletUrl(storeId, query))
    res.cookies.set(
      CUSTOMER_COOKIE,
      signPayload({ cid: customerId, exp: Date.now() + SESSION_TTL_MS }, customerSecret()),
      cookieOptions(SESSION_TTL_MS / 1000),
    )
    res.cookies.delete(OAUTH_STATE_COOKIE)
    logger.info('customer.login', { request_id, provider }, st.claim ? 'with claim' : 'plain')
    return res
  } catch (err) {
    logger.error('customer.login.callback.failed', { request_id, provider }, err)
    const storeId = st.store ?? (st.claim ? await getStoreIdForResponse(st.claim) : null)
    return NextResponse.redirect(walletUrl(storeId, `login=failed${retry}`))
  }
}
