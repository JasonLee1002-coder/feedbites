export const dynamic = "force-dynamic";
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { surveys } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';
import EditClient from './EditClient';
import type { Question, TemplateId, ThemeColors } from '@/types/survey';

interface PrizeItem { label: string; emoji: string; color: string }

export default async function SurveyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const store = await getSelectedStore(session.user.id);
  if (!store) redirect('/dashboard/new-store');

  const [survey] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, id), eq(surveys.store_id, store.id)))
    .limit(1);

  if (!survey) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-[#3A3A3A] mb-2">找不到這份問卷</h1>
        <p className="text-sm text-[#8A8585] mb-6">
          可能是店家選擇不正確，或問卷已被刪除。請回到問卷列表重試。
        </p>
        <Link
          href="/dashboard/surveys"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C5A55A] text-white font-bold rounded-xl hover:bg-[#A08735] text-sm"
        >
          ← 回到問卷列表
        </Link>
      </div>
    );
  }

  return (
    <EditClient
      surveyId={id}
      storeId={store.id}
      initialTitle={survey.title || ''}
      initialQuestions={(survey.questions as Question[]) || []}
      initialDiscountValue={survey.discount_value || ''}
      initialDiscountEnabled={survey.discount_enabled ?? true}
      initialTemplateId={(survey.template_id as TemplateId) || null}
      initialCustomColors={(survey.custom_colors as ThemeColors) || null}
      initialPrizeItems={(survey.prize_items as PrizeItem[]) || null}
      initialDiscountExpiryDays={survey.discount_expiry_days ?? 30}
      initialPrizeSameDayValid={survey.prize_same_day_valid ?? true}
    />
  );
}
