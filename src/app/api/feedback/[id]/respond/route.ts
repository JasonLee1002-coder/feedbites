import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { feedback_reports, feedback_responses, stores } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { isSuperAdmin } from '@/lib/admin';
import { getSelectedStore } from '@/lib/store-context';
import { pushFlexMessage, buildFeedbackResolvedMessage } from '@/lib/line/push';

// POST: Reply to a feedback report (admin or store owner)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const isAdmin = isSuperAdmin(session.user.email || '');

    // If not admin, check if user is the store owner of this report
    if (!isAdmin) {
      const store = await getSelectedStore(session.user.id);
      const [report] = await db
        .select({ store_id: feedback_reports.store_id })
        .from(feedback_reports)
        .where(eq(feedback_reports.id, id))
        .limit(1);

      if (!store || !report || report.store_id !== store.id) {
        return NextResponse.json({ error: '未授權' }, { status: 403 });
      }
    }

    const { message } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: '請輸入回覆內容' }, { status: 400 });
    }

    // Insert response
    const [response] = await db
      .insert(feedback_responses)
      .values({
        report_id: id,
        responder_email: session.user.email ?? '',
        message: message.trim(),
      })
      .returning();

    if (!response) return NextResponse.json({ error: '回覆失敗' }, { status: 500 });

    // Auto-update status to in-progress if still pending
    await db
      .update(feedback_reports)
      .set({ status: 'in-progress', updated_at: new Date() })
      .where(and(eq(feedback_reports.id, id), eq(feedback_reports.status, 'pending')));

    // ── LINE Push Notification to store owner ──
    try {
      const [report] = await db
        .select({
          title: feedback_reports.title,
          store_id: feedback_reports.store_id,
          store_name: feedback_reports.store_name,
        })
        .from(feedback_reports)
        .where(eq(feedback_reports.id, id))
        .limit(1);

      if (report?.store_id) {
        const [store] = await db
          .select({
            owner_line_user_id: stores.owner_line_user_id,
            store_name: stores.store_name,
          })
          .from(stores)
          .where(eq(stores.id, report.store_id))
          .limit(1);

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
