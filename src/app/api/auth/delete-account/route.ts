import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, stores, store_members } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const userId = session.user.id

    // Delete all stores owned by this user (CASCADE handles surveys, responses, etc.)
    await db.delete(stores).where(eq(stores.user_id, userId))

    // Remove from any store_members (stores they were invited to)
    await db.delete(store_members).where(eq(store_members.user_id, userId))

    // Delete the user record
    await db.delete(users).where(eq(users.id, userId))

    // Clear store cookie
    const cookieStore = await cookies()
    cookieStore.delete('feedbites_store_id')

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete account error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
