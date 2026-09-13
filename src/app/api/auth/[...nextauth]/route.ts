// src/app/api/auth/[...nextauth]/route.ts
import { NextRequest } from 'next/server'
import { handlers } from '@/auth'
import { BASE_PATH } from '@/lib/brand'
import { buildCanonicalAuthUrl } from '@/lib/auth-canonical-url'

// 1. Next 交給 route handler 的 req.url 不含 basePath（/api/auth/...），
//    但 Auth.js 的 basePath 取自 AUTH_URL（/eatagain/api/auth），兩者對不上會回 400 UnknownAction，
//    OAuth callback（/eatagain/api/auth/callback/google）也會壞。這裡把 basePath 補回去。
// 2. origin 一律用 AUTH_URL／PUBLIC_BASE_URL，不用入站請求的 Host（可被偽造），見 auth-canonical-url.ts。
function withCanonicalUrl(handler: (req: NextRequest) => Promise<Response>) {
  return (req: NextRequest) => {
    const url = buildCanonicalAuthUrl(
      req.url,
      { AUTH_URL: process.env.AUTH_URL, PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL },
      BASE_PATH,
    )
    return handler(new NextRequest(url, req))
  }
}

export const GET = withCanonicalUrl(handlers.GET)
export const POST = withCanonicalUrl(handlers.POST)
