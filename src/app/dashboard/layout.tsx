import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import AiAssistant from '@/components/dashboard/AiAssistant';
import { getSelectedStore, getUserStores } from '@/lib/store-context';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [store, allStores] = await Promise.all([
    getSelectedStore(user.id),
    getUserStores(user.id),
  ]);

  // No store yet — render without sidebar (for new-store page)
  if (!store) {
    return (
      <div className="min-h-screen bg-[#FAF7F2]">
        {children}
        <AiAssistant />
      </div>
    );
  }

  // Fetch counts for AI assistant context
  const adminDb = createServiceSupabase();
  const [{ count: dishCount }, { count: surveyCount }, { count: responseCount }] = await Promise.all([
    adminDb.from('dishes').select('*', { count: 'exact', head: true }).eq('store_id', store.id),
    adminDb.from('surveys').select('*', { count: 'exact', head: true }).eq('store_id', store.id),
    adminDb.from('responses').select('*', { count: 'exact', head: true }).in(
      'survey_id',
      (await adminDb.from('surveys').select('id').eq('store_id', store.id)).data?.map(s => s.id) || []
    ),
  ]);

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Sidebar
        storeName={store.store_name}
        storeId={store.id}
        allStores={allStores}
        avatarUrl={store.owner_avatar_url}
      />
      {/* Main content */}
      <main className="lg:pl-60">
        <div className="pt-14 lg:pt-0">
          {children}
        </div>
      </main>
      <AiAssistant
        storeName={store.store_name}
        hasLogo={!!store.logo_url}
        dishCount={dishCount || 0}
        surveyCount={surveyCount || 0}
        responseCount={responseCount || 0}
      />
    </div>
  );
}
