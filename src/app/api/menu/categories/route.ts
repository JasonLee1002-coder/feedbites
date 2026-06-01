import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { dish_categories } from '@/lib/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';

// GET: List categories for current store (sorted by position)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(session.user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const data = await db
      .select({
        id: dish_categories.id,
        name: dish_categories.name,
        position: dish_categories.position,
      })
      .from(dish_categories)
      .where(eq(dish_categories.store_id, store.id))
      .orderBy(asc(dish_categories.position));

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// POST: Create a new category
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(session.user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: '請輸入分類名稱' }, { status: 400 });

    // Get current max position
    const existing = await db
      .select({ position: dish_categories.position })
      .from(dish_categories)
      .where(eq(dish_categories.store_id, store.id))
      .orderBy(desc(dish_categories.position))
      .limit(1);

    const nextPosition = existing.length > 0 ? existing[0].position + 1 : 0;

    try {
      const [data] = await db
        .insert(dish_categories)
        .values({ store_id: store.id, name: name.trim(), position: nextPosition })
        .returning({ id: dish_categories.id, name: dish_categories.name, position: dish_categories.position });

      return NextResponse.json(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('23505') || msg.includes('unique')) {
        return NextResponse.json({ error: '此分類名稱已存在' }, { status: 409 });
      }
      throw err;
    }
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
