import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { feedback_reports, feedback_attachments, feedback_responses, stores } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';
import { isSuperAdmin } from '@/lib/admin';
import { pushFlexMessage, buildStatusChangeMessage } from '@/lib/line/push';

// GET: Get feedback report detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const [report] = await db
      .select()
      .from(feedback_reports)
      .where(eq(feedback_reports.id, id))
      .limit(1);

    if (!report) return NextResponse.json({ error: '找不到回報' }, { status: 404 });

    // Verify ownership or admin
    if (!isSuperAdmin(session.user.email || '')) {
      const store = await getSelectedStore(session.user.id);
      if (!store || report.store_id !== store.id) {
        return NextResponse.json({ error: '未授權' }, { status: 403 });
      }
    }

    const [attachments, responses] = await Promise.all([
      db.select().from(feedback_attachments).where(eq(feedback_attachments.report_id, id)),
      db.select().from(feedback_responses).where(eq(feedback_responses.report_id, id)),
    ]);

    return NextResponse.json({
      ...report,
      feedback_attachments: attachments,
      feedback_responses: responses,
    });
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
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    if (!isSuperAdmin(session.user.email || '')) {
      return NextResponse.json({ error: '需要管理員權限' }, { status: 403 });
    }

    const { status } = await request.json();

    // Get old status before updating
    const [oldReport] = await db
      .select({
        status: feedback_reports.status,
        title: feedback_reports.title,
        store_id: feedback_reports.store_id,
        store_name: feedback_reports.store_name,
      })
      .from(feedback_reports)
      .where(eq(feedback_reports.id, id))
      .limit(1);

    const [data] = await db
      .update(feedback_reports)
      .set({ status, updated_at: new Date() })
      .where(eq(feedback_reports.id, id))
      .returning();

    if (!data) return NextResponse.json({ error: '找不到回報' }, { status: 404 });

    // ── LINE Push: notify store owner on status change ──
    if (oldReport && oldReport.status !== status && oldReport.store_id) {
      try {
        const [store] = await db
          .select({
            owner_line_user_id: stores.owner_line_user_id,
            store_name: stores.store_name,
          })
          .from(stores)
          .where(eq(stores.id, oldReport.store_id))
          .limit(1);

        if (store?.owner_line_user_id) {
          const flexBody = buildStatusChangeMessage({
            storeName: store.store_name || oldReport.store_name || '',
            reportTitle: oldReport.title || '問題回報',
            oldStatus: oldReport.status,
            newStatus: status,
          });

          pushFlexMessage(
            store.owner_line_user_id,
            `FeedBites：您的回報狀態更新為「${STATUS_LABELS[status] || status}」`,
            flexBody,
          ).catch(() => {});
        }
      } catch {
        // LINE notification is best-effort
      }
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待處理',
  'in-progress': '處理中',
  resolved: '已解決',
  closed: '已關閉',
};
