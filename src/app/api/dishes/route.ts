import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

// GET: List dishes for current store
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const adminDb = createServiceSupabase();
    const { data: dishes, error } = await adminDb
      .from('dishes')
      .select('*')
      .eq('store_id', store.id)
      .order('category')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(dishes || []);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// POST: Create a new dish
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { name, description, category, photo_url } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: '請輸入菜品名稱' }, { status: 400 });
    }

    const adminDb = createServiceSupabase();
    const { data: dish, error } = await adminDb
      .from('dishes')
      .insert({
        store_id: store.id,
        name: name.trim(),
        description: description?.trim() || null,
        category: category || '主食',
        photo_url: photo_url || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(dish);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// DELETE: Delete all dishes for current store
export async function DELETE() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const adminDb = createServiceSupabase();

    // Delete all dishes for this store
    const { error } = await adminDb
      .from('dishes')
      .delete()
      .eq('store_id', store.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Clean up photos from storage
    const { data: files } = await adminDb.storage
      .from('store-assets')
      .list(`dishes/${store.id}`);

    if (files && files.length > 0) {
      await adminDb.storage
        .from('store-assets')
        .remove(files.map(f => `dishes/${store.id}/${f.name}`));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
