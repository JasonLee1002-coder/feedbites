import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/admin';

// POST: Admin reply to a feedback report
export async function POST(
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

    const { message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: '請輸入回覆內容' }, { status: 400 });
    }

    const adminDb = createServiceSupabase();

    // Insert response
    const { data: response, error } = await adminDb
      .from('feedback_responses')
      .insert({
        report_id: id,
        responder_email: user.email,
        message: message.trim(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Auto-update status to in-progress if still pending
    await adminDb
      .from('feedback_reports')
      .update({ status: 'in-progress', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending');

    return NextResponse.json(response, { status: 201 });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
