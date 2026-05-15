import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

  const store = await getSelectedStore(user.id);
  if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

  const adminDb = createServiceSupabase();

  const { data: dish } = await adminDb
    .from('dishes')
    .select('name')
    .eq('id', id)
    .eq('store_id', store.id)
    .single();

  if (!dish) return NextResponse.json({ mentions: 0, avgRating: null, comments: [] });

  const { data: surveys } = await adminDb
    .from('surveys')
    .select('id')
    .eq('store_id', store.id);

  const surveyIds = surveys?.map((s: { id: string }) => s.id) ?? [];
  if (surveyIds.length === 0) return NextResponse.json({ mentions: 0, avgRating: null, comments: [] });

  const { data: responses } = await adminDb
    .from('responses')
    .select('answers')
    .in('survey_id', surveyIds)
    .order('submitted_at', { ascending: false })
    .limit(200);

  const dishName = dish.name;
  const comments: string[] = [];
  const ratings: number[] = [];

  for (const r of responses ?? []) {
    if (!r.answers) continue;
    let hasDishMention = false;
    for (const [, v] of Object.entries(r.answers as Record<string, unknown>)) {
      if (typeof v === 'string' && v.includes(dishName)) {
        comments.push(v);
        hasDishMention = true;
      }
      const n = Number(v);
      if (!isNaN(n) && n >= 1 && n <= 5) ratings.push(n);
    }
    // suppress unused warning
    void hasDishMention;
  }

  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null;

  return NextResponse.json({ mentions: comments.length, avgRating, comments: comments.slice(0, 5) });
}
