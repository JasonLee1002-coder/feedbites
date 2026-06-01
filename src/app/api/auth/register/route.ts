import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { db } from '@/lib/db'
import { users, store_invites, store_members } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: '請填寫所有欄位' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ error: '此 Email 已註冊' }, { status: 409 })
    }

    const password_hash = await hash(password, 10)
    const [newUser] = await db
      .insert(users)
      .values({ email: normalizedEmail, password_hash })
      .returning({ id: users.id })

    // Process pending invites for this email
    const pendingInvites = await db
      .select()
      .from(store_invites)
      .where(eq(store_invites.email, normalizedEmail))

    for (const invite of pendingInvites) {
      await db
        .insert(store_members)
        .values({
          store_id: invite.store_id,
          user_id: newUser.id,
          invited_by: invite.invited_by,
        })
        .onConflictDoNothing()

      await db
        .delete(store_invites)
        .where(eq(store_invites.id, invite.id))
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
