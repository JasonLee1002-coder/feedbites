import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

// GET: List categories for current store (sorted by position)
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const db = createServiceSupabase();
    const { data, error } = await db
      .from('dish_categories')
      .select('id, name, position')
      .eq('store_id', store.id)
      .order('position', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// POST: Create a new category
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: '請輸入分類名稱' }, { status: 400 });

    const db = createServiceSupabase();

    // Get current max position
    const { data: existing } = await db
      .from('dish_categories')
      .select('position')
      .eq('store_id', store.id)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

    const { data, error } = await db
      .from('dish_categories')
      .insert({ store_id: store.id, name: name.trim(), position: nextPosition })
      .select('id, name, position')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '此分類名稱已存在' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
