import LoginClient from './LoginClient'
import { isStaffEmailLoginEnabled } from '@/lib/staff-login-policy'

// 每次請求讀 runtime 環境變數；不能在 build 時預先渲染，否則開關會被烤死在 build 當下的值
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const emailLoginEnabled = isStaffEmailLoginEnabled(process.env.STAFF_EMAIL_LOGIN_ENABLED)
  return <LoginClient emailLoginEnabled={emailLoginEnabled} />
}
