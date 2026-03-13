import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

// PATCH: Update a dish
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

    const adminDb = createServiceSupabase();

    // Verify dish belongs to this store
    const { data: existing } = await adminDb
      .from('dishes')
      .select('store_id')
      .eq('id', id)
      .single();

    if (!existing || existing.store_id !== store.id) {
      return NextResponse.json({ error: '菜品不存在' }, { status: 404 });
    }

    const body = await request.json();
    const allowedFields = ['name', 'description', 'category', 'photo_url', 'is_active'];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key];
    }

    const { data: dish, error } = await adminDb
      .from('dishes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const adminDb = createServiceSupabase();

    // Verify dish belongs to this store
    const { data: existing } = await adminDb
      .from('dishes')
      .select('store_id')
      .eq('id', id)
      .single();

    if (!existing || existing.store_id !== store.id) {
      return NextResponse.json({ error: '菜品不存在' }, { status: 404 });
    }

    const { error } = await adminDb
      .from('dishes')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
