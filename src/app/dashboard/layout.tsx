import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Sidebar
        storeName={store.store_name}
        storeId={store.id}
        allStores={allStores}
      />
      {/* Main content */}
      <main className="lg:pl-60">
        <div className="pt-14 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
