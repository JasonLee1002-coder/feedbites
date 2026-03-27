import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';

// GET: Check invite token validity + current user status
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) return NextResponse.json({ error: '缺少邀請碼' }, { status: 400 });

    const adminDb = createServiceSupabase();

    // Find store by invite token
    const { data: store } = await adminDb
      .from('stores')
      .select('id, store_name, user_id')
      .eq('invite_token', token)
      .single();

    if (!store) {
      return NextResponse.json({ error: '邀請連結無效或已過期' }, { status: 404 });
    }

    // Check if user is logged in
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Not logged in — show store name, prompt login
      return NextResponse.json({
        store_name: store.store_name,
        can_join: false,
      });
    }

    // Check if already owner
    if (store.user_id === user.id) {
      return NextResponse.json({
        store_name: store.store_name,
        already_member: true,
      });
    }

    // Check if already member
    const { data: existing } = await adminDb
      .from('store_members')
      .select('id')
      .eq('store_id', store.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({
        store_name: store.store_name,
        already_member: true,
      });
    }

    // User is logged in and not yet a member
    return NextResponse.json({
      store_name: store.store_name,
      can_join: true,
    });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// POST: Join store using invite token
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) return NextResponse.json({ error: '缺少邀請碼' }, { status: 400 });

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '請先登入' }, { status: 401 });

    const adminDb = createServiceSupabase();

    // Find store
    const { data: store } = await adminDb
      .from('stores')
      .select('id, store_name, user_id')
      .eq('invite_token', token)
      .single();

    if (!store) {
      return NextResponse.json({ error: '邀請連結無效' }, { status: 404 });
    }

    // Can't join your own store
    if (store.user_id === user.id) {
      return NextResponse.json({ success: true, store_name: store.store_name });
    }

    // Add as member (upsert to avoid duplicates)
    const { error: insertError } = await adminDb
      .from('store_members')
      .upsert({
        store_id: store.id,
        user_id: user.id,
        invited_by: store.user_id,
      }, { onConflict: 'store_id,user_id' });

    if (insertError) {
      return NextResponse.json({ error: '加入失敗' }, { status: 500 });
    }

    // Clean up any pending email invite for this user
    if (user.email) {
      await adminDb
        .from('store_invites')
        .delete()
        .eq('store_id', store.id)
        .eq('email', user.email.toLowerCase());
    }

    return NextResponse.json({ success: true, store_name: store.store_name });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
