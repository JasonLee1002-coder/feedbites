import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

    // Create store (multi-store: one user can have multiple stores)
    const { data: newStore, error: storeError } = await adminDb
      .from('stores')
      .insert({
        user_id: user.id,
        email: user.email,
        store_name: storeName.trim(),
      })
      .select('id')
      .single();

    if (storeError) {
      console.error('Store creation error:', storeError);
      return NextResponse.json({ error: '建立店家失敗' }, { status: 500 });
    }

    // Auto-select the newly created store
    if (newStore) {
      const cookieStore = await cookies();
      cookieStore.set('feedbites_store_id', newStore.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return NextResponse.json({ success: true, storeId: newStore?.id });
  } catch (err) {
    console.error('Setup store error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
