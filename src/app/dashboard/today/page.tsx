import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getSelectedStore } from '@/lib/store-context';
import TodayClient from './TodayClient';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminDb = createServiceSupabase();

  const store = await getSelectedStore(user.id);
  if (!store) redirect('/dashboard/new-store');

  const storeId = store.id;

  // Today's start in Asia/Taipei (UTC+8)
  const todayStartISO = new Date(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) + 'T00:00:00+08:00'
  ).toISOString();

  // Date label e.g. "5月15日"
  const dateLabel = new Date().toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'long',
    day: 'numeric',
  });

  // Fetch surveys for this store
  const { data: surveys } = await adminDb
    .from('surveys')
    .select('id, title')
    .eq('store_id', storeId);

  const surveyList = surveys || [];

  if (surveyList.length === 0) {
    return (
      <TodayClient
        responses={[]}
        dateLabel={dateLabel}
        avgScore={null}
      />
    );
  }

  const surveyIds = surveyList.map((s: { id: string }) => s.id);
  const surveyMap = new Map(surveyList.map((s: { id: string; title: string }) => [s.id, s.title]));

  // Fetch today's responses
  const { data: rawResponses } = await adminDb
    .from('responses')
    .select('id, respondent_name, submitted_at, survey_id, answers, xp_earned')
    .in('survey_id', surveyIds)
    .gte('submitted_at', todayStartISO)
    .order('submitted_at', { ascending: false });

  const raw = rawResponses || [];

  // Compute per-response avg score and first text answer
  let totalScore = 0;
  let totalVotes = 0;

  const responses = raw.map((r: {
    id: string;
    respondent_name: string | null;
    submitted_at: string;
    survey_id: string;
    answers: Record<string, string | string[] | number> | null;
    xp_earned: number | null;
  }) => {
    const ratingValues: number[] = [];
    let firstTextAnswer: string | null = null;

    if (r.answers) {
      for (const v of Object.values(r.answers)) {
        const n = Number(v);
        if (!isNaN(n) && n >= 1 && n <= 5) {
          ratingValues.push(n);
          totalScore += n;
          totalVotes++;
        }
        if (
          firstTextAnswer === null &&
          typeof v === 'string' &&
          v.length > 3
        ) {
          firstTextAnswer = v;
        }
      }
    }

    const avg =
      ratingValues.length > 0
        ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
        : null;

    return {
      id: r.id,
      respondent_name: r.respondent_name,
      submitted_at: r.submitted_at,
      survey_id: r.survey_id,
      survey_title: surveyMap.get(r.survey_id) || '未知問卷',
      answers: r.answers,
      xp_earned: r.xp_earned,
      avg,
      firstTextAnswer,
    };
  });

  const avgScore = totalVotes > 0 ? totalScore / totalVotes : null;

  return (
    <TodayClient
      responses={responses}
      dateLabel={dateLabel}
      avgScore={avgScore}
    />
  );
}
