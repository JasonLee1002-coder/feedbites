import { signIn } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from 'next-auth'
import { isStaffEmailLoginEnabled } from '@/lib/staff-login-policy'

// 過渡用 email-only 登入。STAFF_EMAIL_LOGIN_ENABLED !== 'true' 時一律關閉。
export async function POST(req: NextRequest) {
  if (!isStaffEmailLoginEnabled(process.env.STAFF_EMAIL_LOGIN_ENABLED)) {
    return NextResponse.json({ error: '請改用 Google 登入' }, { status: 403 })
  }

  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: '請輸入有效的 Gmail' }, { status: 400 })
    }

    await signIn('credentials', { email, redirect: false })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: '這個信箱沒有登入權限，請聯絡常來點管理員' }, { status: 401 })
    }
    console.error('Login error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
