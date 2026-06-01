import { signIn } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from 'next-auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: '請填寫 Email 和密碼' }, { status: 400 })
    }

    await signIn('credentials', { email, password, redirect: false })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: 'Email 或密碼錯誤' }, { status: 401 })
    }
    console.error('Login error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
