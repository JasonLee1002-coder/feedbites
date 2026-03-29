import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET: Switch store via direct navigation (most reliable for mobile)
export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get('id');
    if (!storeId) return NextResponse.redirect(new URL('/dashboard', request.url));

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', request.url));

    const adminDb = createServiceSupabase();

    // Verify ownership or membership
    const { data: ownedStore } = await adminDb
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (!ownedStore) {
      const { data: membership } = await adminDb
        .from('store_members')
        .select('id')
        .eq('store_id', storeId)
        .eq('user_id', user.id)
        .single();

      if (!membership) return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Set cookie and redirect with cache bust
    const cookieStore = await cookies();
    cookieStore.set('feedbites_store_id', storeId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    const redirectUrl = new URL(`/dashboard?s=${Date.now()}`, request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}

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

    // Verify this store belongs to the user (owner or member)
    const adminDb = createServiceSupabase();
    const { data: store } = await adminDb
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .single();

    if (!store) {
      return NextResponse.json({ error: '店家不存在' }, { status: 404 });
    }

    // Check ownership or membership
    const { data: ownedStore } = await adminDb
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (!ownedStore) {
      const { data: membership } = await adminDb
        .from('store_members')
        .select('id')
        .eq('store_id', storeId)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return NextResponse.json({ error: '你不是此店家的成員' }, { status: 403 });
      }
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
