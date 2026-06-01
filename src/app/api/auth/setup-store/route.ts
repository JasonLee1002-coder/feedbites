import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stores } from '@/lib/db/schema'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { storeName } = await req.json()

    if (!storeName || !storeName.trim()) {
      return NextResponse.json({ error: '請輸入餐廳名稱' }, { status: 400 })
    }

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email ?? ''

    // Create store (multi-store: one user can have multiple stores)
    const [newStore] = await db
      .insert(stores)
      .values({
        user_id: userId,
        email: userEmail,
        store_name: storeName.trim(),
      })
      .returning({ id: stores.id })

    if (!newStore) {
      return NextResponse.json({ error: '建立店家失敗' }, { status: 500 })
    }

    // Auto-select the newly created store
    const cookieStore = await cookies()
    cookieStore.set('feedbites_store_id', newStore.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })

    return NextResponse.json({ success: true, storeId: newStore.id })
  } catch (err) {
    console.error('Setup store error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
