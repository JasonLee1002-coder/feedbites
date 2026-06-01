import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { feedback_reports } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';

// POST: Submit satisfaction rating for a resolved report
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(session.user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { rating, comment } = await request.json();
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: '評分需為 1-5' }, { status: 400 });
    }

    // Verify this report belongs to the store and is resolved
    const [report] = await db
      .select({
        store_id: feedback_reports.store_id,
        status: feedback_reports.status,
        satisfaction_rating: feedback_reports.satisfaction_rating,
      })
      .from(feedback_reports)
      .where(eq(feedback_reports.id, id))
      .limit(1);

    if (!report || report.store_id !== store.id) {
      return NextResponse.json({ error: '未授權' }, { status: 403 });
    }
    if (report.status !== 'resolved' && report.status !== 'closed') {
      return NextResponse.json({ error: '只能對已解決的回報評分' }, { status: 400 });
    }
    if (report.satisfaction_rating) {
      return NextResponse.json({ error: '已經評過分了' }, { status: 400 });
    }

    const [data] = await db
      .update(feedback_reports)
      .set({
        satisfaction_rating: rating,
        satisfaction_comment: comment?.trim() || null,
        satisfaction_at: new Date(),
      })
      .where(eq(feedback_reports.id, id))
      .returning();

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
