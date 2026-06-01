import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stores, store_members, store_invites } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

// GET: Check invite token validity + current user status
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: '缺少邀請碼' }, { status: 400 })

    // Find store by invite token
    const [store] = await db
      .select({ id: stores.id, store_name: stores.store_name, user_id: stores.user_id })
      .from(stores)
      .where(eq(stores.invite_token, token))
      .limit(1)

    if (!store) {
      return NextResponse.json({ error: '邀請連結無效或已過期' }, { status: 404 })
    }

    // Check if user is logged in
    const session = await auth()

    if (!session?.user?.id) {
      // Not logged in — show store name, prompt login
      return NextResponse.json({
        store_name: store.store_name,
        can_join: false,
      })
    }

    const userId = session.user.id

    // Check if already owner
    if (store.user_id === userId) {
      return NextResponse.json({
        store_name: store.store_name,
        already_member: true,
      })
    }

    // Check if already member
    const [existing] = await db
      .select({ id: store_members.id })
      .from(store_members)
      .where(and(eq(store_members.store_id, store.id), eq(store_members.user_id, userId)))
      .limit(1)

    if (existing) {
      return NextResponse.json({
        store_name: store.store_name,
        already_member: true,
      })
    }

    // User is logged in and not yet a member
    return NextResponse.json({
      store_name: store.store_name,
      can_join: true,
    })
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// POST: Join store using invite token
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    if (!token) return NextResponse.json({ error: '缺少邀請碼' }, { status: 400 })

    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '請先登入' }, { status: 401 })

    const userId = session.user.id
    const userEmail = session.user.email

    // Find store
    const [store] = await db
      .select({ id: stores.id, store_name: stores.store_name, user_id: stores.user_id })
      .from(stores)
      .where(eq(stores.invite_token, token))
      .limit(1)

    if (!store) {
      return NextResponse.json({ error: '邀請連結無效' }, { status: 404 })
    }

    // Can't join your own store
    if (store.user_id === userId) {
      return NextResponse.json({ success: true, store_name: store.store_name })
    }

    // Add as member (ignore conflict to avoid duplicates)
    await db
      .insert(store_members)
      .values({
        store_id: store.id,
        user_id: userId,
        invited_by: store.user_id,
      })
      .onConflictDoNothing()

    // Clean up any pending email invite for this user
    if (userEmail) {
      await db
        .delete(store_invites)
        .where(
          and(
            eq(store_invites.store_id, store.id),
            eq(store_invites.email, userEmail.toLowerCase()),
          ),
        )
    }

    return NextResponse.json({ success: true, store_name: store.store_name })
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
