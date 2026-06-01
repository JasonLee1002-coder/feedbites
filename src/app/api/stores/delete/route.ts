import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stores } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { cookies } from 'next/headers'

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })

    const userId = session.user.id
    const { storeId } = await request.json()
    if (!storeId) return NextResponse.json({ error: '缺少店家 ID' }, { status: 400 })

    // Verify user owns this store
    const [store] = await db
      .select({ id: stores.id, user_id: stores.user_id })
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.user_id, userId)))
      .limit(1)

    if (!store) {
      return NextResponse.json({ error: '只有店家擁有者可以刪除' }, { status: 403 })
    }

    // Delete store (CASCADE handles surveys, responses, discount_codes, dishes, store_members, store_invites)
    await db.delete(stores).where(eq(stores.id, storeId))

    // Clear store cookie if it was the selected store
    const cookieStore = await cookies()
    const currentStoreId = cookieStore.get('feedbites_store_id')?.value
    if (currentStoreId === storeId) {
      cookieStore.delete('feedbites_store_id')
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete store error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
