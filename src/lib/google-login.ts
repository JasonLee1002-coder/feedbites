// Google OAuth 2.0 / OpenID Connect — 給沒有 LINE 的外國客人。
// 驗 id_token 用 Google 官方 tokeninfo 端點，不自行驗簽。
import type { LineProfile } from './line-login'

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'

export interface GoogleConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function googleConfig(): GoogleConfig {
  const clientId = process.env.CUSTOMER_GOOGLE_CLIENT_ID
  const clientSecret = process.env.CUSTOMER_GOOGLE_CLIENT_SECRET
  const base = process.env.PUBLIC_BASE_URL
  if (!clientId || !clientSecret || !base) {
    throw new Error('CUSTOMER_GOOGLE_CLIENT_ID / CUSTOMER_GOOGLE_CLIENT_SECRET / PUBLIC_BASE_URL not set')
  }
  return { clientId, clientSecret, redirectUri: `${base.replace(/\/$/, '')}/api/customer/google/callback` }
}

export function buildGoogleAuthorizeUrl(p: { clientId: string; redirectUri: string; state: string; nonce: string }): string {
  const u = new URL(AUTHORIZE_URL)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', p.clientId)
  u.searchParams.set('redirect_uri', p.redirectUri)
  u.searchParams.set('scope', 'openid profile')
  u.searchParams.set('state', p.state)
  u.searchParams.set('nonce', p.nonce)
  u.searchParams.set('prompt', 'select_account')
  return u.toString()
}

export function checkGoogleClaims(
  c: { aud?: string; iss?: string; nonce?: string; exp?: string; sub?: string; name?: string; picture?: string },
  clientId: string,
  nonce: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): LineProfile {
  if (c.aud !== clientId) throw new Error('Google id_token aud mismatch')
  if (c.iss !== 'https://accounts.google.com' && c.iss !== 'accounts.google.com') throw new Error('Google id_token iss mismatch')
  if (c.nonce !== nonce) throw new Error('Google id_token nonce mismatch')
  if (!c.exp || Number(c.exp) <= nowSec) throw new Error('Google id_token expired')
  if (!c.sub) throw new Error('Google id_token has no sub')
  return { sub: c.sub, name: c.name ?? null, picture: c.picture ?? null }
}

export async function googleProfileFromCode(code: string, nonce: string, cfg: GoogleConfig): Promise<LineProfile> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
  })
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`)
  const { id_token } = (await res.json()) as { id_token?: string }
  if (!id_token) throw new Error('Google token response has no id_token')

  const info = await fetch(`${TOKENINFO_URL}?id_token=${encodeURIComponent(id_token)}`)
  if (!info.ok) throw new Error(`Google tokeninfo failed: ${info.status}`)
  return checkGoogleClaims(await info.json(), cfg.clientId, nonce)
}
