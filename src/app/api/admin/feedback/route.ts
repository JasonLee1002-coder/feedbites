import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { feedback_reports, feedback_attachments, feedback_responses } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { isSuperAdmin } from '@/lib/admin';

// GET: All feedback reports (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    if (!isSuperAdmin(session.user.email || '')) {
      return NextResponse.json({ error: '需要管理員權限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    // Build base query with filters
    let reports = await db
      .select()
      .from(feedback_reports)
      .orderBy(desc(feedback_reports.created_at));

    // Apply filters in-memory (Drizzle doesn't support conditional chaining easily)
    if (status) reports = reports.filter((r) => r.status === status);
    if (category) reports = reports.filter((r) => r.category === category);

    if (reports.length === 0) return NextResponse.json([]);

    const reportIds = reports.map((r) => r.id);

    const [attachments, responses] = await Promise.all([
      db
        .select({ id: feedback_attachments.id, file_url: feedback_attachments.file_url, report_id: feedback_attachments.report_id })
        .from(feedback_attachments)
        .where(inArray(feedback_attachments.report_id, reportIds)),
      db
        .select({ id: feedback_responses.id, report_id: feedback_responses.report_id })
        .from(feedback_responses)
        .where(inArray(feedback_responses.report_id, reportIds)),
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
