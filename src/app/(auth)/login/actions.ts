'use server'

import { signIn } from '@/auth'
import { BASE_PATH } from '@/lib/brand'

// 邀請碼只允許 URL-safe 字元，避免把任意字串塞進 callbackUrl
const INVITE_TOKEN_RE = /^[A-Za-z0-9_-]{1,128}$/

/**
 * 店長 Google 登入。
 * 用 server action 呼叫 server 端 signIn，而不用 next-auth/react 的 signIn：
 * client 版讀不到 AUTH_URL，會打到沒有 /eatagain 前綴的 /api/auth，basePath 下會 404。
 *
 * 登入完成後導向 /api/auth/callback：處理 email 邀請與 invite token、選店、沒有店導去建店頁。
 * Auth.js 預設 redirect callback 只接受同源網址；相對路徑會接在 origin 後面，所以要自己帶 BASE_PATH。
 */
export async function signInWithGoogle(formData: FormData) {
  const invite = formData.get('invite')
  const params = new URLSearchParams()
  if (typeof invite === 'string' && INVITE_TOKEN_RE.test(invite)) {
    params.set('invite', invite)
  }
  const qs = params.toString()
  const redirectTo = `${BASE_PATH}/api/auth/callback${qs ? `?${qs}` : ''}`
  await signIn('google', { redirectTo })
}
