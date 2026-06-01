import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { dishes } from '@/lib/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';

// GET: List dishes for current store
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(session.user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const result = await db
      .select()
      .from(dishes)
      .where(eq(dishes.store_id, store.id))
      .orderBy(asc(dishes.category), desc(dishes.created_at));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// POST: Create a new dish
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(session.user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { name, description, category, photo_url, price } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: '請輸入菜品名稱' }, { status: 400 });
    }

    const [dish] = await db
      .insert(dishes)
      .values({
        store_id: store.id,
        name: name.trim(),
        description: description?.trim() || null,
        category: category || '主食',
        photo_url: photo_url || null,
        price: price?.trim() || null,
      })
      .returning();

    return NextResponse.json(dish);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// DELETE: Delete all dishes for current store
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(session.user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    await db
      .delete(dishes)
      .where(eq(dishes.store_id, store.id));

    // Note: S3 photo cleanup is not handled here since we no longer use Supabase Storage.
    // Photos are in S3 and would need to be cleaned separately if required.

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
