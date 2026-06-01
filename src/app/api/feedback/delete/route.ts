import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { feedback_reports } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';

// POST: Delete multiple feedback reports (store owner only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(session.user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '請選擇要刪除的回報' }, { status: 400 });
    }

    // Only delete reports belonging to this store
    await db
      .delete(feedback_reports)
      .where(and(inArray(feedback_reports.id, ids), eq(feedback_reports.store_id, store.id)));

    return NextResponse.json({ deleted: ids.length });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
