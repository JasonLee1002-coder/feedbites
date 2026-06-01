export const dynamic = "force-dynamic";
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { surveys } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import QrPrintClient from './QrPrintClient';
import { getSelectedStore } from '@/lib/store-context';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QrCodePage({ params }: PageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const store = await getSelectedStore(session.user.id);
  if (!store) redirect('/dashboard/new-store');

  const [survey] = await db
    .select({ id: surveys.id, title: surveys.title, store_id: surveys.store_id })
    .from(surveys)
    .where(and(eq(surveys.id, id), eq(surveys.store_id, store.id)))
    .limit(1);

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
