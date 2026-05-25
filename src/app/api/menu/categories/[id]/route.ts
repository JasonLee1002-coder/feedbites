import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

// PATCH: Rename or reposition a category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.position !== undefined) updates.position = body.position;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '沒有要更新的欄位' }, { status: 400 });
    }

    const db = createServiceSupabase();
    const { data, error } = await db
      .from('dish_categories')
      .update(updates)
      .eq('id', id)
      .eq('store_id', store.id)
      .select('id, name, position')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '此分類名稱已存在' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: '找不到分類' }, { status: 404 });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// DELETE: Remove a category (dishes keep their category text, show as 未分類)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const db = createServiceSupabase();
    const { error } = await db
      .from('dish_categories')
      .delete()
      .eq('id', id)
      .eq('store_id', store.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
