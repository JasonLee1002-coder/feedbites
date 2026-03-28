export const dynamic = "force-dynamic";
import { redirect, notFound } from 'next/navigation';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import QrPrintClient from './QrPrintClient';
import { getSelectedStore } from '@/lib/store-context';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QrCodePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminDb = createServiceSupabase();

  const store = await getSelectedStore(user.id);
  if (!store) redirect('/dashboard/new-store');

  const { data: survey } = await adminDb
    .from('surveys')
    .select('id, title, store_id')
    .eq('id', id)
    .eq('store_id', store.id)
    .single();

  if (!survey) notFound();

  const publicUrl = `https://feedbites-seven.vercel.app/s/${survey.id}`;

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <Link
        href={`/dashboard/surveys/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[#8A8585] hover:text-[#A08735] mb-5 transition-colors print:hidden"
      >
        <ArrowLeft className="w-4 h-4" />
        返回問卷詳情
      </Link>

      <QrPrintClient
        surveyId={survey.id}
        surveyTitle={survey.title}
        storeName={store.store_name}
        publicUrl={publicUrl}
      />
    </div>
  );
}
