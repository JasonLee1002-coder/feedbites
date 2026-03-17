import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';
import { isSuperAdmin } from '@/lib/admin';

// GET: Get feedback report detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const adminDb = createServiceSupabase();
    const { data: report, error } = await adminDb
      .from('feedback_reports')
      .select('*, feedback_attachments(*), feedback_responses(*)')
      .eq('id', id)
      .single();

    if (error || !report) return NextResponse.json({ error: '找不到回報' }, { status: 404 });

    // Verify ownership or admin
    if (!isSuperAdmin(user.email || '')) {
      const store = await getSelectedStore(user.id);
      if (!store || report.store_id !== store.id) {
        return NextResponse.json({ error: '未授權' }, { status: 403 });
      }
    }

    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// PATCH: Update status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    if (!isSuperAdmin(user.email || '')) {
      return NextResponse.json({ error: '需要管理員權限' }, { status: 403 });
    }

    const { status } = await request.json();
    const adminDb = createServiceSupabase();

    const { data, error } = await adminDb
      .from('feedback_reports')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
