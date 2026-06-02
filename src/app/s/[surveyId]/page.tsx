import { Suspense } from 'react';
import { db } from '@/lib/db';
import { surveys, stores } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import SurveyClient from './SurveyClient';

interface Props {
  params: Promise<{ surveyId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { surveyId } = await params;

  const [row] = await db
    .select({ title: surveys.title, store_id: surveys.store_id })
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.is_active, true)))
    .limit(1);

  if (!row) {
    return { title: '問卷不存在 — FeedBites' };
  }

  const [store] = await db
    .select({ store_name: stores.store_name })
    .from(stores)
    .where(eq(stores.id, row.store_id))
    .limit(1);

  const storeName = store?.store_name || '';
  return {
    title: `${row.title} — ${storeName}`,
    description: `${storeName} 邀請您填寫問卷，完成即可獲得優惠！`,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicSurveyPage({ params }: Props) {
  const { surveyId } = await params;

  if (!UUID_RE.test(surveyId)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#FAF7F2]">
        <div className="text-6xl mb-6">🍽️</div>
        <h1 className="text-2xl font-bold text-[#4A4545] mb-3" style={{ fontFamily: "'Noto Serif TC', serif" }}>問卷不存在或已結束</h1>
        <p className="text-sm text-[#8A8585] text-center">連結有誤，請向店家確認。</p>
      </div>
    );
  }

  // Fetch survey with store info via join
  const [surveyRow] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, surveyId), eq(surveys.is_active, true)))
    .limit(1);

  if (!surveyRow) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#FAF7F2]">
        <div className="text-6xl mb-6">🍽️</div>
        <h1 className="text-2xl font-bold text-[#4A4545] mb-3" style={{ fontFamily: "'Noto Serif TC', serif" }}>
          問卷不存在或已結束
        </h1>
        <p className="text-sm text-[#8A8585] text-center leading-relaxed">
          此問卷可能已停止收集回饋，<br />
          或連結有誤，請向店家確認。
        </p>
        <div className="mt-8 text-center">
          <a href="/" className="text-xs font-medium text-[#C5A55A]">
            FeedBites
          </a>
          <div className="text-[10px] mt-0.5 text-[#8A8585]">
            Bite. Rate. Save.
          </div>
        </div>
      </div>
    );
  }

  // Fetch store info separately
  const [storeRow] = await db
    .select({
      store_name: stores.store_name,
      logo_url: stores.logo_url,
      frame_id: stores.frame_id,
      owner_avatar_url: stores.owner_avatar_url,
    })
    .from(stores)
    .where(eq(stores.id, surveyRow.store_id))
    .limit(1);

  // Build a survey object compatible with SurveyClient (which expects stores nested)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const survey = {
    ...surveyRow,
    template_id: surveyRow.template_id as import('@/types/survey').TemplateId,
    custom_colors: surveyRow.custom_colors as import('@/types/survey').ThemeColors | null,
    stores: storeRow ?? null,
  } as any;

  return (
    <Suspense>
      <SurveyClient survey={survey} />
    </Suspense>
  );
}
