import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { surveys, responses } from '@/lib/db/schema';
import { eq, inArray, gte, desc } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';
import TodayClient from './TodayClient';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const store = await getSelectedStore(session.user.id);
  if (!store) redirect('/dashboard/new-store');

  const storeId = store.id;

  // Today's start in Asia/Taipei (UTC+8)
  const todayStartISO = new Date(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) + 'T00:00:00+08:00'
  ).toISOString();

  const dateLabel = new Date().toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'long',
    day: 'numeric',
  });

  // Fetch surveys for this store
  const surveyList = await db
    .select({ id: surveys.id, title: surveys.title })
    .from(surveys)
    .where(eq(surveys.store_id, storeId));

  if (surveyList.length === 0) {
    return (
      <TodayClient
        responses={[]}
        dateLabel={dateLabel}
        avgScore={null}
      />
    );
  }

  const surveyIds = surveyList.map(s => s.id);
  const surveyMap = new Map(surveyList.map(s => [s.id, s.title]));

  // Fetch today's responses
  const rawResponses = await db
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

  // Filter to today (gte on timestamp)
  const todayStart = new Date(todayStartISO);
  const raw = rawResponses.filter(r => r.submitted_at && new Date(r.submitted_at) >= todayStart);

  let totalScore = 0;
  let totalVotes = 0;

  const mappedResponses = raw.map(r => {
    const answers = (r.answers as Record<string, unknown>) || {};
    const ratingValues: number[] = [];
    let firstTextAnswer: string | null = null;

    for (const v of Object.values(answers)) {
      const n = Number(v);
      if (!isNaN(n) && n >= 1 && n <= 5) {
        ratingValues.push(n);
        totalScore += n;
        totalVotes++;
      }
      if (firstTextAnswer === null && typeof v === 'string' && v.length > 3) {
        firstTextAnswer = v;
      }
    }

    const avg = ratingValues.length > 0
      ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
      : null;

    return {
      id: r.id,
      respondent_name: r.respondent_name,
      submitted_at: r.submitted_at ? new Date(r.submitted_at).toISOString() : '',
      survey_id: r.survey_id,
      survey_title: surveyMap.get(r.survey_id) || '未知問卷',
      answers: answers as Record<string, string | string[] | number>,
      xp_earned: r.xp_earned,
      avg,
      firstTextAnswer,
    };
  });

  const avgScore = totalVotes > 0 ? totalScore / totalVotes : null;

  return (
    <TodayClient
      responses={mappedResponses}
      dateLabel={dateLabel}
      avgScore={avgScore}
    />
  );
}
