import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { stores, store_members, store_invites } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const userId = session.user.id
  const userEmail = session.user.email

  // Process pending email invites for this user
  if (userEmail) {
    const normalizedEmail = userEmail.toLowerCase()
    const pendingInvites = await db
      .select()
      .from(store_invites)
      .where(eq(store_invites.email, normalizedEmail))

    for (const invite of pendingInvites) {
      await db
        .insert(store_members)
        .values({
          store_id: invite.store_id,
          user_id: userId,
          invited_by: invite.invited_by,
        })
        .onConflictDoNothing()

      await db
        .delete(store_invites)
        .where(eq(store_invites.id, invite.id))
    }
  }

  // Handle invite token from query param
  const inviteToken = req.nextUrl.searchParams.get('invite')
  if (inviteToken) {
    const [inviteStore] = await db
      .select({ id: stores.id, user_id: stores.user_id })
      .from(stores)
      .where(eq(stores.invite_token, inviteToken))
      .limit(1)

    if (inviteStore && inviteStore.user_id !== userId) {
      await db
        .insert(store_members)
        .values({
          store_id: inviteStore.id,
          user_id: userId,
          invited_by: inviteStore.user_id,
        })
        .onConflictDoNothing()
    }
  }

  // Check if user has any stores
  const ownedStores = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.user_id, userId))

  const memberStores = await db
    .select({ store_id: store_members.store_id })
    .from(store_members)
    .where(eq(store_members.user_id, userId))

  const hasAnyStore = ownedStores.length > 0 || memberStores.length > 0

  if (!hasAnyStore) {
    return NextResponse.redirect(new URL('/dashboard/new-store', req.url))
  }

  // Auto-select first store if no cookie set
  const cookieStore = await cookies()
  const currentStoreId = cookieStore.get('feedbites_store_id')?.value

  const allStoreIds = [
    ...ownedStores.map(s => s.id),
    ...memberStores.map(s => s.store_id),
  ]
  const validStore = allStoreIds.includes(currentStoreId!)

  if (!validStore && allStoreIds.length > 0) {
    cookieStore.set('feedbites_store_id', allStoreIds[0], {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  const next = req.nextUrl.searchParams.get('next') ?? '/dashboard'
  return NextResponse.redirect(new URL(next, req.url))
}
