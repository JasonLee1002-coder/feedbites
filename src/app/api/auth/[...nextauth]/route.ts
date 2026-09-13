// src/app/api/auth/[...nextauth]/route.ts
import { NextRequest } from 'next/server'
import { handlers } from '@/auth'
import { BASE_PATH } from '@/lib/brand'

// Next 交給 route handler 的 req.url 不含 basePath（/api/auth/...），
// 但 Auth.js 的 basePath 取自 AUTH_URL（/eatagain/api/auth），兩者對不上會回 400 UnknownAction，
// OAuth callback（/eatagain/api/auth/callback/google）也會壞。這裡把 basePath 補回去。
function withBasePath(handler: (req: NextRequest) => Promise<Response>) {
  return (req: NextRequest) => {
    const url = new URL(req.url)
    if (BASE_PATH && !url.pathname.startsWith(`${BASE_PATH}/`)) {
      url.pathname = `${BASE_PATH}${url.pathname}`
      return handler(new NextRequest(url, req))
    }
    return handler(req)
  }
}

export const GET = withBasePath(handlers.GET)
export const POST = withBasePath(handlers.POST)
