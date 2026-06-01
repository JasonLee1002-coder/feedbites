import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stores } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSelectedStore } from '@/lib/store-context'

// GET: Get or generate invite link for current store
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })

    const store = await getSelectedStore(session.user.id)
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 })

    // If token already exists, return it
    if (store.invite_token) {
      return NextResponse.json({
        token: store.invite_token,
        store_name: store.store_name,
      })
    }

    // Generate a new token (8 chars, URL-safe)
    const token = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .slice(0, 8)

    await db
      .update(stores)
      .set({ invite_token: token })
      .where(eq(stores.id, store.id))

    return NextResponse.json({
      token,
      store_name: store.store_name,
    })
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// DELETE: Reset invite link (invalidate old one)
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })

    const store = await getSelectedStore(session.user.id)
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 })

    await db
      .update(stores)
      .set({ invite_token: null })
      .where(eq(stores.id, store.id))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
