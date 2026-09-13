import { NextRequest } from 'next/server'
import { buildAuthorizeUrl, lineConfig } from '@/lib/line-login'
import { startLogin } from '@/lib/customer-login'

// GET /api/customer/line/start?claim=<responseId>&store=<storeId>
export async function GET(req: NextRequest) {
  return startLogin(req, 'line', (state, nonce) => {
    const cfg = lineConfig()
    return buildAuthorizeUrl({ channelId: cfg.channelId, redirectUri: cfg.redirectUri, state, nonce })
  })
}
