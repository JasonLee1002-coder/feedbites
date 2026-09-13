// LINE Login v2.1 — 手寫 OAuth，只用兩個官方端點：token 與 verify。
// 文件：https://developers.line.biz/en/reference/line-login/

const AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize'
const TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token'
const VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify'

export interface LineConfig {
  channelId: string
  channelSecret: string
  redirectUri: string
}

export interface LineProfile {
  sub: string
  name: string | null
  picture: string | null
}

export function lineConfig(): LineConfig {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET
  const base = process.env.PUBLIC_BASE_URL
  if (!channelId || !channelSecret || !base) {
    throw new Error('LINE_LOGIN_CHANNEL_ID / LINE_LOGIN_CHANNEL_SECRET / PUBLIC_BASE_URL not set')
  }
  return { channelId, channelSecret, redirectUri: `${base.replace(/\/$/, '')}/api/customer/line/callback` }
}

export function buildAuthorizeUrl(p: { channelId: string; redirectUri: string; state: string; nonce: string }): string {
  const u = new URL(AUTHORIZE_URL)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', p.channelId)
  u.searchParams.set('redirect_uri', p.redirectUri)
  u.searchParams.set('state', p.state)
  u.searchParams.set('scope', 'profile openid')
  u.searchParams.set('nonce', p.nonce)
  u.searchParams.set('bot_prompt', 'aggressive')
  return u.toString()
}

export async function exchangeCodeForIdToken(code: string, cfg: LineConfig): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
      client_id: cfg.channelId,
      client_secret: cfg.channelSecret,
    }),
  })
  if (!res.ok) throw new Error(`LINE token exchange failed: ${res.status}`)
  const json = (await res.json()) as { id_token?: string }
  if (!json.id_token) throw new Error('LINE token response has no id_token')
  return json.id_token
}

export async function verifyIdToken(idToken: string, channelId: string, nonce: string): Promise<LineProfile> {
  const res = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId, nonce }),
  })
  if (!res.ok) throw new Error(`LINE id_token verify failed: ${res.status}`)
  const j = (await res.json()) as { sub?: string; name?: string; picture?: string; nonce?: string }
  if (!j.sub) throw new Error('LINE id_token has no sub')
  if (j.nonce !== nonce) throw new Error('LINE id_token nonce mismatch')
  return { sub: j.sub, name: j.name ?? null, picture: j.picture ?? null }
}
