import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

// GET: List feedback reports for current store
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const adminDb = createServiceSupabase();
    const { data: reports, error } = await adminDb
      .from('feedback_reports')
      .select('*, feedback_attachments(id, file_url, file_name), feedback_responses(id, responder_email, message, created_at)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(reports || []);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// POST: Create a new feedback report
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { title, description, category, priority, voice_transcript } = await request.json();

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: '請填寫標題和描述' }, { status: 400 });
    }

    const adminDb = createServiceSupabase();
    const { data: report, error } = await adminDb
      .from('feedback_reports')
      .insert({
        store_id: store.id,
        user_id: user.id,
        user_email: user.email,
        store_name: store.store_name,
        title: title.trim(),
        description: description.trim(),
        category: category || 'suggestion',
        priority: priority || 'medium',
        voice_transcript: voice_transcript || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(report, { status: 201 });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
