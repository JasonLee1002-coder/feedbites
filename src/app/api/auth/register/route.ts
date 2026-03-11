import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, storeName } = await request.json();

    if (!email || !password || !storeName) {
      return NextResponse.json({ error: '請填寫所有欄位' }, { status: 400 });
    }

    const supabase = await createServerSupabase();

    // Register user via auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: '此 Email 已註冊' }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Create store record using service role (server-side only)
    if (authData.user) {
      const adminDb = createServiceSupabase();
      const { error: storeError } = await adminDb.from('stores').insert({
        user_id: authData.user.id,
        email,
        store_name: storeName,
      });

      if (storeError) {
        console.error('Store creation error:', storeError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
