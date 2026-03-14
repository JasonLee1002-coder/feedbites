import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function DELETE() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const adminDb = createServiceSupabase();

    // Delete all stores owned by this user (CASCADE handles related data)
    await adminDb
      .from('stores')
      .delete()
      .eq('user_id', user.id);

    // Remove from any store_members (stores they were invited to)
    await adminDb
      .from('store_members')
      .delete()
      .eq('user_id', user.id);

    // Delete user from auth
    const { error } = await adminDb.auth.admin.deleteUser(user.id);
    if (error) {
      console.error('Delete user error:', error);
      return NextResponse.json({ error: '刪除帳號失敗' }, { status: 500 });
    }

    // Clear cookies
    const cookieStore = await cookies();
    cookieStore.delete('feedbites_store_id');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete account error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
