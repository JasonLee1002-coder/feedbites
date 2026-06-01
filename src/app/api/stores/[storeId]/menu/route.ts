import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stores, dishes } from '@/lib/db/schema'
import { and, eq, asc, desc } from 'drizzle-orm'

// GET: Public endpoint — fetch store info and active dishes
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params

    // Fetch store info
    const [store] = await db
      .select({ store_name: stores.store_name, logo_url: stores.logo_url })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1)

    if (!store) {
      return NextResponse.json({ error: '找不到店家' }, { status: 404 })
    }

    // Fetch active dishes
    const dishList = await db
      .select()
      .from(dishes)
      .where(and(eq(dishes.store_id, storeId), eq(dishes.is_active, true)))
      .orderBy(asc(dishes.category), desc(dishes.created_at))

    return NextResponse.json({
      store,
      dishes: dishList,
    })
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
