import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/admin';

// GET: All feedback reports (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    if (!isSuperAdmin(user.email || '')) {
      return NextResponse.json({ error: '需要管理員權限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const adminDb = createServiceSupabase();
    let query = adminDb
      .from('feedback_reports')
      .select('*, feedback_attachments(id, file_url), feedback_responses(id)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);

    const { data: reports, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(reports || []);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
