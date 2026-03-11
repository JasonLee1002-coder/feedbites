import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { storeName } = await request.json();

    if (!storeName || !storeName.trim()) {
      return NextResponse.json({ error: '請輸入餐廳名稱' }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const adminDb = createServiceSupabase();

    // Check if store already exists
    const { data: existingStore } = await adminDb
      .from('stores')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingStore) {
      return NextResponse.json({ error: '店家已存在' }, { status: 400 });
    }

    // Create store
    const { error: storeError } = await adminDb.from('stores').insert({
      user_id: user.id,
      email: user.email,
      store_name: storeName.trim(),
    });

    if (storeError) {
      console.error('Store creation error:', storeError);
      return NextResponse.json({ error: '建立店家失敗' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Setup store error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
