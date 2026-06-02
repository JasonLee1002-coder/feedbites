import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stores, store_members } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

// GET: Switch store — set cookie via HTML page then redirect (most reliable)
export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get('id')
    if (!storeId) return NextResponse.redirect(new URL('/feedbites/dashboard', request.url))

    const session = await auth()
    if (!session?.user?.id) return NextResponse.redirect(new URL('/feedbites/login', request.url))

    const userId = session.user.id

    // Verify ownership or membership
    const [ownedStore] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.user_id, userId)))
      .limit(1)

    if (!ownedStore) {
      const [membership] = await db
        .select({ id: store_members.id })
        .from(store_members)
        .where(and(eq(store_members.store_id, storeId), eq(store_members.user_id, userId)))
        .limit(1)

      if (!membership) return NextResponse.redirect(new URL('/feedbites/dashboard', request.url))
    }

    const returnTo = request.nextUrl.searchParams.get('returnTo')
    const dashboardUrl = returnTo && returnTo.startsWith('/feedbites/dashboard') ? returnTo : `/feedbites/dashboard?s=${Date.now()}`
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieValue = `feedbites_store_id=${storeId}; Path=/; Max-Age=31536000; SameSite=Lax${isProduction ? '; Secure' : ''}; HttpOnly`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>window.location.replace("${dashboardUrl}")</script></body></html>`

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': cookieValue,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch {
    return NextResponse.redirect(new URL('/feedbites/dashboard', request.url))
  }
}

export async function POST(request: NextRequest) {
  try {
    const { storeId } = await request.json()

    if (!storeId) {
      return NextResponse.json({ error: '請選擇店家' }, { status: 400 })
    }

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const userId = session.user.id

    // Verify the store exists
    const [store] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1)

    if (!store) {
      return NextResponse.json({ error: '店家不存在' }, { status: 404 })
    }

    // Check ownership or membership
    const [ownedStore] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.user_id, userId)))
      .limit(1)

    if (!ownedStore) {
      const [membership] = await db
        .select({ id: store_members.id })
        .from(store_members)
        .where(and(eq(store_members.store_id, storeId), eq(store_members.user_id, userId)))
        .limit(1)

      if (!membership) {
        return NextResponse.json({ error: '你不是此店家的成員' }, { status: 403 })
      }
    }

    const isProduction = process.env.NODE_ENV === 'production'
    const response = NextResponse.json({ success: true })
    response.cookies.set('feedbites_store_id', storeId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
    return response
  } catch (err) {
    console.error('Store select error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
