import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/admin';
import { pushFlexMessage, buildFeedbackResolvedMessage } from '@/lib/line/push';

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

    // ── LINE Push Notification to store owner ──
    // Best-effort: don't block the response if LINE fails
    try {
      const { data: report } = await adminDb
        .from('feedback_reports')
        .select('title, store_id, store_name')
        .eq('id', id)
        .single();

      if (report?.store_id) {
        const { data: store } = await adminDb
          .from('stores')
          .select('owner_line_user_id, store_name')
          .eq('id', report.store_id)
          .single();

        if (store?.owner_line_user_id) {
          const flexBody = buildFeedbackResolvedMessage({
            storeName: store.store_name || report.store_name || '',
            reportTitle: report.title || '問題回報',
            replyMessage: message.trim(),
          });

          pushFlexMessage(
            store.owner_line_user_id,
            `FeedBites：您的回報「${report.title}」已處理`,
            flexBody,
          ).catch(() => {}); // Fire-and-forget
        }
      }
    } catch {
      // LINE notification is best-effort, don't fail the request
    }

    return NextResponse.json(response, { status: 201 });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
