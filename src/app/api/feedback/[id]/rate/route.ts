import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

// POST: Submit satisfaction rating for a resolved report
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { rating, comment } = await request.json();
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: '評分需為 1-5' }, { status: 400 });
    }

    const adminDb = createServiceSupabase();

    // Verify this report belongs to the store and is resolved
    const { data: report } = await adminDb
      .from('feedback_reports')
      .select('store_id, status, satisfaction_rating')
      .eq('id', id)
      .single();

    if (!report || report.store_id !== store.id) {
      return NextResponse.json({ error: '未授權' }, { status: 403 });
    }
    if (report.status !== 'resolved' && report.status !== 'closed') {
      return NextResponse.json({ error: '只能對已解決的回報評分' }, { status: 400 });
    }
    if (report.satisfaction_rating) {
      return NextResponse.json({ error: '已經評過分了' }, { status: 400 });
    }

    const { data, error } = await adminDb
      .from('feedback_reports')
      .update({
        satisfaction_rating: rating,
        satisfaction_comment: comment?.trim() || null,
        satisfaction_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
