import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { dishes, surveys, responses } from '@/lib/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

  const store = await getSelectedStore(session.user.id);
  if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

  const [dish] = await db
    .select({ name: dishes.name })
    .from(dishes)
    .where(and(eq(dishes.id, id), eq(dishes.store_id, store.id)))
    .limit(1);

  if (!dish) return NextResponse.json({ mentions: 0, avgRating: null, comments: [] });

  const surveyRows = await db
    .select({ id: surveys.id })
    .from(surveys)
    .where(eq(surveys.store_id, store.id));

  const surveyIds = surveyRows.map((s) => s.id);
  if (surveyIds.length === 0) return NextResponse.json({ mentions: 0, avgRating: null, comments: [] });

  const responseRows = await db
    .select({ answers: responses.answers })
    .from(responses)
    .where(inArray(responses.survey_id, surveyIds))
    .orderBy(desc(responses.submitted_at))
    .limit(200);

  const dishName = dish.name;
  const comments: string[] = [];
  const ratings: number[] = [];

  for (const r of responseRows) {
    if (!r.answers) continue;
    const answersObj = r.answers as unknown as Record<string, unknown>;
    for (const [, v] of Object.entries(answersObj)) {
      if (typeof v === 'string' && v.includes(dishName)) {
        comments.push(v);
      }
      const n = Number(v);
      if (!isNaN(n) && n >= 1 && n <= 5) ratings.push(n);
    }
  }

  const avgRating = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null;

  return NextResponse.json({ mentions: comments.length, avgRating, comments: comments.slice(0, 5) });
}
