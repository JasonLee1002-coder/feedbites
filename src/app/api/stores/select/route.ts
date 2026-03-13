import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { storeId } = await request.json();

    if (!storeId) {
      return NextResponse.json({ error: '請選擇店家' }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    // Verify this store belongs to the user
    const adminDb = createServiceSupabase();
    const { data: store } = await adminDb
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (!store) {
      return NextResponse.json({ error: '店家不存在' }, { status: 404 });
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('feedbites_store_id', storeId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Store select error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
