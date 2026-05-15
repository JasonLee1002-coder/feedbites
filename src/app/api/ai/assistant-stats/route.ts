import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({}, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({});

    const db = createServiceSupabase();

    // Get dish count
    const { count: dishCount } = await db.from('dishes').select('*', { count: 'exact', head: true }).eq('store_id', store.id);

    // Get surveys
    const { data: surveys } = await db.from('surveys').select('id').eq('store_id', store.id);
    const surveyIds = surveys?.map(s => s.id) || [];
    const surveyCount = surveyIds.length;

    // Today start in Taiwan time
    const todayStart = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) + 'T00:00:00+08:00').toISOString();

    let todayResponses = 0;
    let responseCount = 0;
    let overallAvg: number | null = null;

    if (surveyIds.length > 0) {
      const { count: total } = await db.from('responses').select('*', { count: 'exact', head: true }).in('survey_id', surveyIds);
      responseCount = total || 0;

      const { count: today } = await db.from('responses').select('*', { count: 'exact', head: true }).in('survey_id', surveyIds).gte('submitted_at', todayStart);
      todayResponses = today || 0;

      // Get avg rating from recent 50 responses
      const { data: recent } = await db.from('responses').select('answers, survey_id').in('survey_id', surveyIds).order('submitted_at', { ascending: false }).limit(50);
      const { data: surveyDetails } = await db.from('surveys').select('id, questions').in('id', surveyIds);
      const qMap = new Map((surveyDetails || []).map(s => [s.id, s.questions as Array<{id: string; type: string}>]));

      let sum = 0, cnt = 0;
      for (const r of recent || []) {
        const qs = qMap.get(r.survey_id) || [];
        for (const q of qs) {
          if (q.type === 'rating' || q.type === 'emoji-rating') {
            const v = Number(r.answers?.[q.id]);
            if (!isNaN(v) && v >= 1 && v <= 5) { sum += v; cnt++; }
          }
        }
      }
      if (cnt > 0) overallAvg = Math.round((sum / cnt) * 10) / 10;
    }

    return NextResponse.json({
      todayResponses,
      responseCount,
      overallAvg,
      dishCount: dishCount || 0,
      surveyCount,
      hasLogo: !!(store as {logo_url?: string | null}).logo_url,
    });
  } catch {
    return NextResponse.json({});
  }
}
