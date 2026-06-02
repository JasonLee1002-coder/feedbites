import { signIn } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from 'next-auth'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: '請輸入有效的 Gmail' }, { status: 400 })
    }

    await signIn('credentials', { email, redirect: false })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: '登入失敗，請重試' }, { status: 401 })
    }
    console.error('Login error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
