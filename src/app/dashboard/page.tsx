import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { surveys, responses, dishes } from '@/lib/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';
import DashboardClient from '@/components/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const store = await getSelectedStore(session.user.id);
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

  const surveyList = await db
    .select({ id: surveys.id, title: surveys.title, is_active: surveys.is_active, questions: surveys.questions })
    .from(surveys)
    .where(eq(surveys.store_id, storeId));

  surveyCount = surveyList.length;
  activeSurveyCount = surveyList.filter(s => s.is_active).length;

  const [dishCountRow] = await db
    .select({ count: dishes.id })
    .from(dishes)
    .where(eq(dishes.store_id, storeId));
  // count via length of fetched rows (simple approach)
  const allDishes = await db.select({ id: dishes.id }).from(dishes).where(eq(dishes.store_id, storeId));
  dishCount = allDishes.length;

  if (surveyList.length > 0) {
    const surveyIds = surveyList.map(s => s.id);
    const surveyMap = new Map(surveyList.map(s => [s.id, s.title]));

    const allResponses = await db
      .select({
        id: responses.id,
        respondent_name: responses.respondent_name,
        submitted_at: responses.submitted_at,
        survey_id: responses.survey_id,
        answers: responses.answers,
        xp_earned: responses.xp_earned,
      })
      .from(responses)
      .where(inArray(responses.survey_id, surveyIds))
      .orderBy(desc(responses.submitted_at));

    const allResp = allResponses.map(r => ({
      ...r,
      submitted_at: r.submitted_at ? new Date(r.submitted_at).toISOString() : '',
    }));

    responseCount = allResp.length;

    // Analyse recent negative keywords
    const NEGATIVE_WORDS = ['鹹', '淡', '慢', '貴', '冷', '硬', '油', '臭', '差', '爛', '等太久', '不新鮮', '不好', '難吃'];
    const dayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
    const recentTexts: string[] = [];
    for (const r of allResp.filter(r => r.submitted_at >= dayAgo)) {
      if (r.answers) {
        for (const v of Object.values(r.answers as Record<string, unknown>)) {
          if (typeof v === 'string' && v.length > 2) recentTexts.push(v);
        }
      }
    }
    const urgentKeywords: { keyword: string; count: number; samples: string[] }[] = [];
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
    for (const s of surveyList) {
      const qs = (s.questions || []) as Array<{ id: string; type: string }>;
      for (const q of qs) {
        if (q.type === 'rating' || q.type === 'emoji-rating') ratingQs.push({ id: q.id });
      }
    }
    if (ratingQs.length > 0) {
      let totalScore = 0;
      let totalVotes = 0;
      for (const q of ratingQs) {
        for (const r of allResp) {
          const v = Number((r.answers as Record<string, unknown>)?.[q.id]);
          if (!isNaN(v) && v > 0) { totalScore += v; totalVotes++; }
        }
      }
      if (totalVotes > 0) overallAvg = totalScore / totalVotes;
    }

    // Recent responses with avg
    recentResponses = allResp.slice(0, 8).map(r => {
      const ratingValues: number[] = [];
      const answers = r.answers as Record<string, unknown>;
      if (answers) {
        for (const v of Object.values(answers)) {
          const n = Number(v);
          if (!isNaN(n) && n >= 1 && n <= 5) ratingValues.push(n);
        }
      }
      const avg = ratingValues.length > 0
        ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
        : null;

      return {
        id: r.id,
        respondent_name: r.respondent_name,
        submitted_at: r.submitted_at,
        survey_title: surveyMap.get(r.survey_id) || '未知問卷',
        answers: answers as Record<string, string | string[]>,
        xp_earned: r.xp_earned,
        avg,
      };
    });
  }

  const maxDailyCount = dailyCounts.length > 0 ? Math.max(...dailyCounts.map(d => d.count), 1) : 1;
  const weekTrend = weekResponses - prevWeekResponses;

  const hour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei', hour: 'numeric', hour12: false }), 10);
  const greeting = hour < 6 ? '深夜好' : hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安';

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
