import { Suspense } from 'react';
import { createServiceSupabase } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import SurveyClient from './SurveyClient';

interface Props {
  params: Promise<{ surveyId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { surveyId } = await params;
  const db = createServiceSupabase();
  const { data: survey } = await db
    .from('surveys')
    .select('title, stores(store_name)')
    .eq('id', surveyId)
    .eq('is_active', true)
    .single();

  if (!survey) {
    return { title: '問卷不存在 — FeedBites' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storeData = survey.stores as any;
  const storeName = storeData?.store_name || '';
  return {
    title: `${survey.title} — ${storeName}`,
    description: `${storeName} 邀請您填寫問卷，完成即可獲得優惠！`,
  };
}

export default async function PublicSurveyPage({ params }: Props) {
  const { surveyId } = await params;
  const db = createServiceSupabase();
  const { data: survey } = await db
    .from('surveys')
    .select('*, stores(store_name, logo_url, frame_id, owner_avatar_url)')
    .eq('id', surveyId)
    .eq('is_active', true)
    .single();

  if (!survey) {
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

  return (
    <Suspense>
      <SurveyClient survey={survey} />
    </Suspense>
  );
}
