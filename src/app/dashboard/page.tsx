import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSelectedStore } from '@/lib/store-context';
import DashboardClient from '@/components/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminDb = createServiceSupabase();

  const store = await getSelectedStore(user.id);
  if (!store) redirect('/dashboard/new-store');

  const storeName = store.store_name || '我的店家';
  const storeId = store.id;

  // ── Data fetch ──
  let surveyCount = 0;
  let responseCount = 0;
  let todayResponses = 0;
  let weekResponses = 0;
  let prevWeekResponses = 0;
  let overallAvg: number | null = null;
  let activeSurveyCount = 0;
  let dishCount = 0;
  let recentResponses: Array<{
    id: string;
    respondent_name: string | null;
    submitted_at: string;
    survey_title?: string;
    answers?: Record<string, string | string[]>;
    xp_earned?: number | null;
    avg?: number | null;
  }> = [];

  const dailyCounts: { label: string; count: number }[] = [];
  let topUrgent: { keyword: string; count: number; samples: string[] }[] = [];

  if (storeId) {
    const { data: surveys } = await adminDb
      .from('surveys')
      .select('id, title, is_active, questions')
      .eq('store_id', storeId);

    surveyCount = surveys?.length || 0;
    activeSurveyCount = surveys?.filter((s: { is_active: boolean }) => s.is_active).length || 0;

    const { count: dc } = await adminDb
      .from('dishes')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId);
    dishCount = dc || 0;

    if (surveys && surveys.length > 0) {
      const surveyIds = surveys.map((s: { id: string }) => s.id);
      const surveyMap = new Map(surveys.map((s: { id: string; title: string }) => [s.id, s.title]));

      const { data: allResponses } = await adminDb
        .from('responses')
        .select('id, respondent_name, submitted_at, survey_id, answers, xp_earned')
        .in('survey_id', surveyIds)
        .order('submitted_at', { ascending: false });

      const allResp = allResponses || [];
      responseCount = allResp.length;

      // 分析近 24 小時負面關鍵字
      const urgentKeywords: { keyword: string; count: number; samples: string[] }[] = [];
      const NEGATIVE_WORDS = ['鹹', '淡', '慢', '貴', '冷', '硬', '油', '臭', '差', '爛', '等太久', '不新鮮', '不好', '難吃'];
      const dayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
      const recentTexts: string[] = [];
      for (const r of allResp.filter(r => r.submitted_at >= dayAgo)) {
        if (r.answers) {
          for (const v of Object.values(r.answers)) {
            if (typeof v === 'string' && v.length > 2) recentTexts.push(v);
          }
        }
      }
      for (const kw of NEGATIVE_WORDS) {
        const matches = recentTexts.filter(t => t.includes(kw));
        if (matches.length >= 2) urgentKeywords.push({ keyword: kw, count: matches.length, samples: matches.slice(0, 2) });
      }
      urgentKeywords.sort((a, b) => b.count - a.count);
      topUrgent = urgentKeywords.slice(0, 3);

      const todayStr = new Date().toISOString().slice(0, 10);
      todayResponses = allResp.filter(r => r.submitted_at.slice(0, 10) === todayStr).length;
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      weekResponses = allResp.filter(r => r.submitted_at >= weekAgo).length;
      const prevWeekStart = new Date(Date.now() - 14 * 86400000).toISOString();
      prevWeekResponses = allResp.filter(r => r.submitted_at >= prevWeekStart && r.submitted_at < weekAgo).length;

      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const ds = d.toISOString().slice(0, 10);
        const dayLabel = d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
        dailyCounts.push({
          label: dayLabel,
          count: allResp.filter(r => r.submitted_at.slice(0, 10) === ds).length,
        });
      }

      // Overall avg rating
      const ratingQs: { id: string }[] = [];
      for (const s of surveys) {
        const qs = (s.questions || []) as Array<{ id: string; type: string }>;
        for (const q of qs) {
          if (q.type === 'rating' || q.type === 'emoji-rating') {
            ratingQs.push({ id: q.id });
          }
        }
      }
      if (ratingQs.length > 0) {
        let totalScore = 0;
        let totalVotes = 0;
        for (const q of ratingQs) {
          for (const r of allResp) {
            const v = Number(r.answers?.[q.id]);
            if (!isNaN(v) && v > 0) {
              totalScore += v;
              totalVotes++;
            }
          }
        }
        if (totalVotes > 0) overallAvg = totalScore / totalVotes;
      }

      // Recent responses with avg
      recentResponses = allResp.slice(0, 8).map(r => {
        const ratingValues: number[] = [];
        if (r.answers) {
          for (const [, v] of Object.entries(r.answers)) {
            const n = Number(v);
            if (!isNaN(n) && n >= 1 && n <= 5) ratingValues.push(n);
          }
        }
        const avg = ratingValues.length > 0
          ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
          : null;

        return {
          ...r,
          survey_title: surveyMap.get(r.survey_id) || '未知問卷',
          avg,
        };
      });
    }
  }

  const maxDailyCount = dailyCounts.length > 0 ? Math.max(...dailyCounts.map(d => d.count), 1) : 1;
  const weekTrend = weekResponses - prevWeekResponses;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安';

  return (
    <DashboardClient
      storeName={storeName}
      greeting={greeting}
      responseCount={responseCount}
      todayResponses={todayResponses}
      weekResponses={weekResponses}
      weekTrend={weekTrend}
      overallAvg={overallAvg}
      surveyCount={surveyCount}
      activeSurveyCount={activeSurveyCount}
      dishCount={dishCount}
      dailyCounts={dailyCounts}
      maxDailyCount={maxDailyCount}
      recentResponses={recentResponses}
      urgentKeywords={topUrgent}
    />
  );
}
