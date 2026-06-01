import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { feedback_reports, feedback_attachments, feedback_responses } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';

// GET: List feedback reports for current store
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(session.user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const reports = await db
      .select()
      .from(feedback_reports)
      .where(eq(feedback_reports.store_id, store.id))
      .orderBy(desc(feedback_reports.created_at));

    if (reports.length === 0) return NextResponse.json([]);

    const reportIds = reports.map((r) => r.id);

    const [attachments, responses] = await Promise.all([
      db.select().from(feedback_attachments).where(inArray(feedback_attachments.report_id, reportIds)),
      db.select().from(feedback_responses).where(inArray(feedback_responses.report_id, reportIds)),
    ]);

    const result = reports.map((r) => ({
      ...r,
      feedback_attachments: attachments.filter((a) => a.report_id === r.id),
      feedback_responses: responses.filter((res) => res.report_id === r.id),
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// POST: Create a new feedback report
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(session.user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { title, description, category, priority, voice_transcript } = await request.json();

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: '請填寫標題和描述' }, { status: 400 });
    }

    const [report] = await db
      .insert(feedback_reports)
      .values({
        store_id: store.id,
        user_id: session.user.id,
        user_email: session.user.email ?? null,
        store_name: store.store_name,
        title: title.trim(),
        description: description.trim(),
        category: category || 'suggestion',
        priority: priority || 'medium',
        voice_transcript: voice_transcript || null,
      })
      .returning();

    return NextResponse.json(report, { status: 201 });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
