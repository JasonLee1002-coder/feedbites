import { NextRequest } from 'next/server'
import { buildGoogleAuthorizeUrl, googleConfig } from '@/lib/google-login'
import { startLogin } from '@/lib/customer-login'

export async function GET(req: NextRequest) {
  return startLogin(req, 'google', (state, nonce) => {
    const cfg = googleConfig()
    return buildGoogleAuthorizeUrl({ clientId: cfg.clientId, redirectUri: cfg.redirectUri, state, nonce })
  })
}
