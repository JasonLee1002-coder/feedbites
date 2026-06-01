import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { dishes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';

// PATCH: Update a dish
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

    // Verify dish belongs to this store
    const [existing] = await db
      .select({ store_id: dishes.store_id })
      .from(dishes)
      .where(eq(dishes.id, id))
      .limit(1);

    if (!existing || existing.store_id !== store.id) {
      return NextResponse.json({ error: '菜品不存在' }, { status: 404 });
    }

    const body = await request.json();
    const allowedFields = ['name', 'description', 'category', 'photo_url', 'is_active', 'price'];
    const updates: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '沒有要更新的欄位' }, { status: 400 });
    }

    const [dish] = await db
      .update(dishes)
      .set(updates as Partial<typeof dishes.$inferInsert>)
      .where(and(eq(dishes.id, id), eq(dishes.store_id, store.id)))
      .returning();

    return NextResponse.json(dish);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// DELETE: Delete a dish
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

    // Verify dish belongs to this store
    const [existing] = await db
      .select({ store_id: dishes.store_id })
      .from(dishes)
      .where(eq(dishes.id, id))
      .limit(1);

    if (!existing || existing.store_id !== store.id) {
      return NextResponse.json({ error: '菜品不存在' }, { status: 404 });
    }

    await db
      .delete(dishes)
      .where(and(eq(dishes.id, id), eq(dishes.store_id, store.id)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
