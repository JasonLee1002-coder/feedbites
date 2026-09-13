import { NextRequest } from 'next/server'
import { exchangeCodeForIdToken, lineConfig, verifyIdToken } from '@/lib/line-login'
import { finishLogin } from '@/lib/customer-login'

export async function GET(req: NextRequest) {
  return finishLogin(req, 'line', async (code, nonce) => {
    const cfg = lineConfig()
    const idToken = await exchangeCodeForIdToken(code, cfg)
    return verifyIdToken(idToken, cfg.channelId, nonce)
  })
}
