export const dynamic = "force-dynamic";
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { surveys } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { getSelectedStore, getUserStores } from '@/lib/store-context';
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
    // 這份問卷可能屬於使用者的另一家店 —— 多店店主最常卡在這裡：
    // 問卷確實存在，但目前選定的店不對，畫面卻只說「找不到」，
    // 讓人以為問卷壞了或被刪掉（2026-03-15 店長實際回報過）。
    // 找出它到底在哪一家店，直接給一個能點的切換連結。
    const myStores = await getUserStores(session.user.id);
    const otherStoreIds = myStores.map(s => s.id).filter(sid => sid !== store.id);

    let ownerStore: { id: string; store_name: string } | null = null;
    if (otherStoreIds.length > 0) {
      const [found] = await db
        .select({ store_id: surveys.store_id })
        .from(surveys)
        .where(and(eq(surveys.id, id), inArray(surveys.store_id, otherStoreIds)))
        .limit(1);
      if (found) {
        const s = myStores.find(m => m.id === found.store_id);
        if (s) ownerStore = { id: s.id, store_name: s.store_name };
      }
    }

    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <div className="text-5xl mb-4">{ownerStore ? '🏪' : '🔍'}</div>
        {ownerStore ? (
          <>
            <h1 className="text-xl font-bold text-[#3A3A3A] mb-2">這份問卷在你的另一家店</h1>
            <p className="text-base text-[#5F5A54] mb-6 leading-relaxed">
              它屬於<b className="text-[#80651F]">{ownerStore.store_name}</b>，
              但你現在看的是 <b>{store.store_name}</b>。<br />
              切換過去就可以編輯了。
            </p>
            <a
              href={`/feedbites/api/stores/select?id=${ownerStore.id}&returnTo=${encodeURIComponent(`/dashboard/surveys/${id}/edit`)}`}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#80651F] text-white font-bold rounded-xl text-base"
            >
              切換到 {ownerStore.store_name} →
            </a>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-[#3A3A3A] mb-2">找不到這份問卷</h1>
            <p className="text-base text-[#5F5A54] mb-6">
              它可能已經被刪除了。回到列表看看還有哪些問卷。
            </p>
            <Link
              href="/dashboard/surveys"
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#80651F] text-white font-bold rounded-xl text-base"
            >
              ← 回到問卷列表
            </Link>
          </>
        )}
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
