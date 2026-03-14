import { createServiceSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: '請填寫所有欄位' }, { status: 400 });
    }

    const adminDb = createServiceSupabase();

    // Register user via admin API (auto-confirms email, no verification needed)
    const { data: authData, error: authError } = await adminDb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return NextResponse.json({ error: '此 Email 已註冊' }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Process pending invites for this email (no store created at registration)
    if (authData.user) {
      const normalizedEmail = email.trim().toLowerCase();
      const { data: pendingInvites } = await adminDb
        .from('store_invites')
        .select('id, store_id, invited_by')
        .eq('email', normalizedEmail);

      if (pendingInvites && pendingInvites.length > 0) {
        for (const invite of pendingInvites) {
          await adminDb.from('store_members').upsert({
            store_id: invite.store_id,
            user_id: authData.user.id,
            invited_by: invite.invited_by,
          }, { onConflict: 'store_id,user_id' });
        }
        // Clean up processed invites
        await adminDb
          .from('store_invites')
          .delete()
          .eq('email', normalizedEmail);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
