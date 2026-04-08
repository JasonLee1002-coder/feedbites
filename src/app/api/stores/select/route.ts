import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET: Switch store — set cookie via HTML page then redirect (most reliable)
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

    // Return HTML that sets cookie via Set-Cookie header and redirects via JS
    const returnTo = request.nextUrl.searchParams.get('returnTo');
    const dashboardUrl = returnTo && returnTo.startsWith('/dashboard') ? returnTo : `/dashboard?s=${Date.now()}`;
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieValue = `feedbites_store_id=${storeId}; Path=/; Max-Age=31536000; SameSite=Lax${isProduction ? '; Secure' : ''}; HttpOnly`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>window.location.replace("${dashboardUrl}")</script></body></html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': cookieValue,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
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

    // Set cookie on response object directly
    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({ success: true });
    response.cookies.set('feedbites_store_id', storeId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (err) {
    console.error('Store select error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
