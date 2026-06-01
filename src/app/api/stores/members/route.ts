import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, store_members, store_invites } from '@/lib/db/schema'
import { and, eq, asc } from 'drizzle-orm'
import { getSelectedStore } from '@/lib/store-context'

// GET: List members of the current store
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })

    const store = await getSelectedStore(session.user.id)
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 })

    // Get owner email
    const [ownerRecord] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, store.user_id))
      .limit(1)

    // Get members with their emails (join to users table)
    const memberRows = await db
      .select({
        id: store_members.id,
        user_id: store_members.user_id,
        joined_at: store_members.joined_at,
        email: users.email,
      })
      .from(store_members)
      .innerJoin(users, eq(store_members.user_id, users.id))
      .where(eq(store_members.store_id, store.id))
      .orderBy(asc(store_members.joined_at))

    // Get pending invites
    const invites = await db
      .select({ id: store_invites.id, email: store_invites.email, created_at: store_invites.created_at })
      .from(store_invites)
      .where(eq(store_invites.store_id, store.id))
      .orderBy(asc(store_invites.created_at))

    return NextResponse.json({
      owner: {
        user_id: store.user_id,
        email: ownerRecord?.email || '未知',
      },
      members: memberRows.map(m => ({
        id: m.id,
        user_id: m.user_id,
        email: m.email || '未知',
        joined_at: m.joined_at,
      })),
      invites,
    })
  } catch (err) {
    console.error('Members list error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// POST: Invite a member by email
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })

    const userId = session.user.id
    const userEmail = session.user.email

    const store = await getSelectedStore(userId)
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 })

    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: '請輸入 Email' }, { status: 400 })

    const normalizedEmail = email.trim().toLowerCase()

    // Can't invite yourself
    if (normalizedEmail === userEmail?.toLowerCase()) {
      return NextResponse.json({ error: '不能邀請自己' }, { status: 400 })
    }

    // Check if email belongs to store owner
    const [ownerRecord] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, store.user_id))
      .limit(1)

    if (ownerRecord?.email?.toLowerCase() === normalizedEmail) {
      return NextResponse.json({ error: '此用戶已是店家擁有者' }, { status: 400 })
    }

    // Check if user exists in our users table
    const [targetUser] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1)

    if (targetUser) {
      // Check if already a member
      const [existing] = await db
        .select({ id: store_members.id })
        .from(store_members)
        .where(and(eq(store_members.store_id, store.id), eq(store_members.user_id, targetUser.id)))
        .limit(1)

      if (existing) {
        return NextResponse.json({ error: '此用戶已是成員' }, { status: 400 })
      }

      // Add as member directly
      await db.insert(store_members).values({
        store_id: store.id,
        user_id: targetUser.id,
        invited_by: userId,
      })

      return NextResponse.json({ success: true, status: 'added', email: normalizedEmail })
    } else {
      // User not registered — create invite (upsert to avoid duplicates)
      await db
        .insert(store_invites)
        .values({
          store_id: store.id,
          email: normalizedEmail,
          invited_by: userId,
        })
        .onConflictDoNothing()

      return NextResponse.json({ success: true, status: 'invited', email: normalizedEmail })
    }
  } catch (err) {
    console.error('Invite member error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// DELETE: Remove a member or cancel an invite
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })

    const userId = session.user.id

    const store = await getSelectedStore(userId)
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 })

    const { memberId, inviteId, selfLeave } = await request.json()

    if (selfLeave) {
      // User wants to leave the store — can't leave if you're the owner
      if (store.user_id === userId) {
        return NextResponse.json({ error: '店家擁有者不能退出，請先轉讓擁有權或刪除店家' }, { status: 400 })
      }

      await db
        .delete(store_members)
        .where(and(eq(store_members.store_id, store.id), eq(store_members.user_id, userId)))

      return NextResponse.json({ success: true, action: 'left' })
    }

    if (memberId) {
      await db
        .delete(store_members)
        .where(and(eq(store_members.id, memberId), eq(store_members.store_id, store.id)))

      return NextResponse.json({ success: true, action: 'removed' })
    }

    if (inviteId) {
      await db
        .delete(store_invites)
        .where(and(eq(store_invites.id, inviteId), eq(store_invites.store_id, store.id)))

      return NextResponse.json({ success: true, action: 'invite_cancelled' })
    }

    return NextResponse.json({ error: '缺少參數' }, { status: 400 })
  } catch (err) {
    console.error('Remove member error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
