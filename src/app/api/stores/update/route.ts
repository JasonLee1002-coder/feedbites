import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stores } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSelectedStore } from '@/lib/store-context'

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const store = await getSelectedStore(userId)
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const body = await request.json()

    // Only allow updating specific fields
    const allowedFields = [
      'store_name', 'frame_id', 'logo_url',
      'cuisine_type', 'city', 'district', 'price_range',
      'seating_capacity', 'opening_year', 'target_audience', 'service_type',
      'owner_line_user_id',
    ]
    const updates: Record<string, string | number | null> = {}
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    await db
      .update(stores)
      .set(updates)
      .where(eq(stores.id, store.id))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Store update error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
