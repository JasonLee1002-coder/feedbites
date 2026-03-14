import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const { storeId } = await request.json();
    if (!storeId) return NextResponse.json({ error: '缺少店家 ID' }, { status: 400 });

    const adminDb = createServiceSupabase();

    // Verify user owns this store
    const { data: store } = await adminDb
      .from('stores')
      .select('id, user_id')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (!store) {
      return NextResponse.json({ error: '只有店家擁有者可以刪除' }, { status: 403 });
    }

    // Delete store (CASCADE will handle surveys, responses, discount_codes, dishes, store_members, store_invites)
    const { error } = await adminDb
      .from('stores')
      .delete()
      .eq('id', storeId);

    if (error) {
      console.error('Delete store error:', error);
      return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
    }

    // Clear store cookie if it was the selected store
    const cookieStore = await cookies();
    const currentStoreId = cookieStore.get('feedbites_store_id')?.value;
    if (currentStoreId === storeId) {
      cookieStore.delete('feedbites_store_id');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete store error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
