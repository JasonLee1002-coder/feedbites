import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { dish_categories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';

// PATCH: Rename or reposition a category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(session.user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.position !== undefined) updates.position = body.position;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '沒有要更新的欄位' }, { status: 400 });
    }

    try {
      const [data] = await db
        .update(dish_categories)
        .set(updates as Partial<typeof dish_categories.$inferInsert>)
        .where(and(eq(dish_categories.id, id), eq(dish_categories.store_id, store.id)))
        .returning({
          id: dish_categories.id,
          name: dish_categories.name,
          position: dish_categories.position,
        });

      if (!data) return NextResponse.json({ error: '找不到分類' }, { status: 404 });

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

// DELETE: Remove a category (dishes keep their category text, show as 未分類)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(session.user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    await db
      .delete(dish_categories)
      .where(and(eq(dish_categories.id, id), eq(dish_categories.store_id, store.id)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
