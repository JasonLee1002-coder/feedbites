// LINE 與 Google 共用：start 產 state/nonce 並導向；callback 驗 state、建客人、認領問卷、設 session。
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import {
  CUSTOMER_COOKIE, OAUTH_STATE_COOKIE, SESSION_TTL_MS,
  cookieOptions, customerSecret, isUuid, readClaimToken, signPayload, verifyPayload,
} from '@/lib/customer-session'
import { claimResponse, getRules, getStoreIdForResponse, upsertCustomer, type IdentityProvider } from '@/lib/ledger/service'
import type { LineProfile } from '@/lib/line-login'
import { logger, newRequestId } from '@/lib/logger'

export type OAuthState = {
  provider: IdentityProvider
  state: string
  nonce: string
  claim: string | null
  claimToken: string | null
  store: string | null
  exp: number
}

/**
 * 回傳這次登入所屬、且已開放點數功能的店家 id；回 null 代表不該進 OAuth。
 * 沒有有效認領憑證、也沒有指定店家時一律拒絕，不建立「純登入」的空殼客人。
 */
export type StoreGate = (p: { claimRid: string | null; storeId: string | null }) => Promise<string | null>

export const defaultStoreGate: StoreGate = async ({ claimRid, storeId }) => {
  const sid = claimRid ? await getStoreIdForResponse(claimRid) : storeId
  if (!sid) return null
  const rules = await getRules(sid)
  return rules.enabled ? sid : null
}

function unavailable(storeId: string | null): NextResponse {
  const base = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '')
  const target = storeId ? `${base}/w/${storeId}?login=unavailable` : `${base}/`
  const res = NextResponse.redirect(target)
  res.cookies.delete(OAUTH_STATE_COOKIE)
  return res
}

export async function startLogin(
  req: NextRequest,
  provider: IdentityProvider,
  buildUrl: (state: string, nonce: string) => string,
  gate: StoreGate = defaultStoreGate,
): Promise<NextResponse> {
  const claimParam = req.nextUrl.searchParams.get('claim')
  const storeParam = req.nextUrl.searchParams.get('store')
  try {
    const secret = customerSecret()
    const claimRid = readClaimToken(claimParam, secret)
    const requestedStore = isUuid(storeParam) ? storeParam : null
    const gatedStore = await gate({ claimRid, storeId: requestedStore })
    if (!gatedStore) {
      logger.warn('customer.login.start.gated', { provider }, 'no enabled store for this login')
      return unavailable(requestedStore)
    }
    const payload: OAuthState = {
      provider,
      state: randomBytes(16).toString('hex'),
      nonce: randomBytes(16).toString('hex'),
      claim: claimRid,
      claimToken: claimRid ? claimParam : null,
      store: gatedStore,
      exp: Date.now() + 10 * 60 * 1000,
    }
    const res = NextResponse.redirect(buildUrl(payload.state, payload.nonce))
    res.cookies.set(OAUTH_STATE_COOKIE, signPayload(payload, secret), cookieOptions(600))
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
  gate: StoreGate = defaultStoreGate,
): Promise<NextResponse> {
  const request_id = newRequestId()
  const base = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '')
  const st = verifyPayload<OAuthState>(req.cookies.get(OAUTH_STATE_COOKIE)?.value, customerSecret())
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const providerError = req.nextUrl.searchParams.get('error')

  const walletUrl = (storeId: string | null, query: string) =>
    storeId ? `${base}/w/${storeId}?${query}` : `${base}/`
  const retry = st?.claimToken ? `&claim=${encodeURIComponent(st.claimToken)}` : ''

  if (providerError || !st || st.provider !== provider || !code || state !== st.state) {
    logger.warn('customer.login.rejected', { request_id, provider }, providerError ?? 'state mismatch or missing')
    const storeId = st?.store ?? (st?.claim ? await getStoreIdForResponse(st.claim) : null)
    const res = NextResponse.redirect(walletUrl(storeId, `login=cancelled${retry}`))
    res.cookies.delete(OAUTH_STATE_COOKIE)
    return res
  }

  try {
    // OAuth 往返期間店長可能關掉點數，建立客人前再確認一次
    const stillEnabled = await gate({ claimRid: st.claim, storeId: st.store })
    if (!stillEnabled) {
      logger.warn('customer.login.callback.gated', { request_id, provider }, 'store disabled during login')
      return unavailable(st.store)
    }
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
    const res = NextResponse.redirect(walletUrl(storeId, `login=failed${retry}`))
    // state 一次性：例外路徑也要清掉，否則 10 分鐘內同一個 state 可被重放
    res.cookies.delete(OAUTH_STATE_COOKIE)
    return res
  }
}
