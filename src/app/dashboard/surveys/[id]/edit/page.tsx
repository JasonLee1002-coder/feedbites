import { redirect, notFound } from 'next/navigation';
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

  if (error || !survey) notFound();

  return (
    <EditClient
      surveyId={id}
      initialTitle={survey.title || ''}
      initialQuestions={survey.questions || []}
      initialDiscountValue={survey.discount_value || ''}
      initialDiscountEnabled={survey.discount_enabled ?? true}
    />
  );
}
