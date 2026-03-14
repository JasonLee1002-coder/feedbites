import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getSelectedStore } from '@/lib/store-context';

// GET: List members of the current store
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const adminDb = createServiceSupabase();

    // Get owner info
    const { data: ownerAuth } = await adminDb.auth.admin.getUserById(store.user_id);

    // Get members
    const { data: members } = await adminDb
      .from('store_members')
      .select('id, user_id, invited_by, joined_at')
      .eq('store_id', store.id)
      .order('joined_at', { ascending: true });

    // Resolve member emails
    const memberList = [];
    for (const member of (members || [])) {
      const { data: memberAuth } = await adminDb.auth.admin.getUserById(member.user_id);
      memberList.push({
        id: member.id,
        user_id: member.user_id,
        email: memberAuth?.user?.email || '未知',
        joined_at: member.joined_at,
      });
    }

    // Get pending invites
    const { data: invites } = await adminDb
      .from('store_invites')
      .select('id, email, created_at')
      .eq('store_id', store.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      owner: {
        user_id: store.user_id,
        email: ownerAuth?.user?.email || '未知',
      },
      members: memberList,
      invites: invites || [],
    });
  } catch (err) {
    console.error('Members list error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// POST: Invite a member by email
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: '請輸入 Email' }, { status: 400 });

    const normalizedEmail = email.trim().toLowerCase();

    // Can't invite yourself
    if (normalizedEmail === user.email?.toLowerCase()) {
      return NextResponse.json({ error: '不能邀請自己' }, { status: 400 });
    }

    const adminDb = createServiceSupabase();

    // Check if this email is already the owner
    const { data: ownerAuth } = await adminDb.auth.admin.getUserById(store.user_id);
    if (ownerAuth?.user?.email?.toLowerCase() === normalizedEmail) {
      return NextResponse.json({ error: '此用戶已是店家擁有者' }, { status: 400 });
    }

    // Check if user exists in auth
    const { data: { users } } = await adminDb.auth.admin.listUsers();
    const targetUser = users.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (targetUser) {
      // Check if already a member
      const { data: existing } = await adminDb
        .from('store_members')
        .select('id')
        .eq('store_id', store.id)
        .eq('user_id', targetUser.id)
        .single();

      if (existing) {
        return NextResponse.json({ error: '此用戶已是成員' }, { status: 400 });
      }

      // Add as member directly
      const { error: insertError } = await adminDb
        .from('store_members')
        .insert({
          store_id: store.id,
          user_id: targetUser.id,
          invited_by: user.id,
        });

      if (insertError) {
        console.error('Insert member error:', insertError);
        return NextResponse.json({ error: '加入失敗' }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'added', email: normalizedEmail });
    } else {
      // User not registered — create invite
      const { error: inviteError } = await adminDb
        .from('store_invites')
        .upsert({
          store_id: store.id,
          email: normalizedEmail,
          invited_by: user.id,
        }, { onConflict: 'store_id,email' });

      if (inviteError) {
        console.error('Insert invite error:', inviteError);
        return NextResponse.json({ error: '邀請失敗' }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'invited', email: normalizedEmail });
    }
  } catch (err) {
    console.error('Invite member error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// DELETE: Remove a member or cancel an invite
export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { memberId, inviteId, selfLeave } = await request.json();
    const adminDb = createServiceSupabase();

    if (selfLeave) {
      // User wants to leave the store
      // Can't leave if you're the owner
      if (store.user_id === user.id) {
        return NextResponse.json({ error: '店家擁有者不能退出，請先轉讓擁有權或刪除店家' }, { status: 400 });
      }

      const { error } = await adminDb
        .from('store_members')
        .delete()
        .eq('store_id', store.id)
        .eq('user_id', user.id);

      if (error) {
        return NextResponse.json({ error: '退出失敗' }, { status: 500 });
      }
      return NextResponse.json({ success: true, action: 'left' });
    }

    if (memberId) {
      // Remove a member
      const { error } = await adminDb
        .from('store_members')
        .delete()
        .eq('id', memberId)
        .eq('store_id', store.id);

      if (error) {
        return NextResponse.json({ error: '移除失敗' }, { status: 500 });
      }
      return NextResponse.json({ success: true, action: 'removed' });
    }

    if (inviteId) {
      // Cancel an invite
      const { error } = await adminDb
        .from('store_invites')
        .delete()
        .eq('id', inviteId)
        .eq('store_id', store.id);

      if (error) {
        return NextResponse.json({ error: '取消邀請失敗' }, { status: 500 });
      }
      return NextResponse.json({ success: true, action: 'invite_cancelled' });
    }

    return NextResponse.json({ error: '缺少參數' }, { status: 400 });
  } catch (err) {
    console.error('Remove member error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
