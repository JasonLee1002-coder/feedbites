import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { dishes, surveys, responses } from '@/lib/db/schema';
import { eq, inArray, desc, count } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

    const store = await getSelectedStore(session.user.id);
    if (!store) return NextResponse.json({});

    // Get dish count
    const [dishCountRow] = await db
      .select({ count: count() })
      .from(dishes)
      .where(eq(dishes.store_id, store.id));
    const dishCount = dishCountRow?.count ?? 0;

    // Get surveys
    const surveyRows = await db
      .select({ id: surveys.id })
      .from(surveys)
      .where(eq(surveys.store_id, store.id));
    const surveyIds = surveyRows.map((s) => s.id);
    const surveyCount = surveyIds.length;

    // Today start in Taiwan time
    const todayStart = new Date(
      new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) + 'T00:00:00+08:00'
    );

    let todayResponses = 0;
    let responseCount = 0;
    let overallAvg: number | null = null;

    if (surveyIds.length > 0) {
      // Total response count
      const [totalRow] = await db
        .select({ count: count() })
        .from(responses)
        .where(inArray(responses.survey_id, surveyIds));
      responseCount = totalRow?.count ?? 0;

      // All responses for today filter + avg calculation
      const allResponses = await db
        .select({
          submitted_at: responses.submitted_at,
          answers: responses.answers,
          survey_id: responses.survey_id,
        })
        .from(responses)
        .where(inArray(responses.survey_id, surveyIds))
        .orderBy(desc(responses.submitted_at))
        .limit(500);

      // Today count
      todayResponses = allResponses.filter(
        (r) => r.submitted_at && new Date(r.submitted_at) >= todayStart
      ).length;

      // Avg rating from most recent 50
      const recent = allResponses.slice(0, 50);
      const surveyDetails = await db
        .select({ id: surveys.id, questions: surveys.questions })
        .from(surveys)
        .where(inArray(surveys.id, surveyIds));

      const qMap = new Map(
        surveyDetails.map((s) => [
          s.id,
          (s.questions as unknown as Array<{ id: string; type: string }>) || [],
        ])
      );

      let sum = 0, cnt = 0;
      for (const r of recent) {
        const qs = qMap.get(r.survey_id) || [];
        const answersObj = r.answers as unknown as Record<string, unknown>;
        for (const q of qs) {
          if (q.type === 'rating' || q.type === 'emoji-rating') {
            const v = Number(answersObj?.[q.id]);
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
      dishCount,
      surveyCount,
      hasLogo: !!(store as { logo_url?: string | null }).logo_url,
    });
  } catch {
    return NextResponse.json({});
  }
}
