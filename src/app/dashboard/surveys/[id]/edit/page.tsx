import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';
import EditClient from './EditClient';

export default async function SurveyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const store = await getSelectedStore(user.id);
  if (!store) redirect('/dashboard/new-store');

  const adminDb = createServiceSupabase();
  const { data: survey, error } = await adminDb
    .from('surveys')
    .select('*')
    .eq('id', id)
    .eq('store_id', store.id)
    .single();

  if (error || !survey) {
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
      initialTitle={survey.title || ''}
      initialQuestions={survey.questions || []}
      initialDiscountValue={survey.discount_value || ''}
      initialDiscountEnabled={survey.discount_enabled ?? true}
      initialTemplateId={survey.template_id || null}
      initialPrizeItems={survey.prize_items || null}
    />
  );
}
