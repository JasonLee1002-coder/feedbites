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

  const currentRole = allStores.find(s => s.id === store.id)?.role || 'owner';
  const isCollab = currentRole === 'member';

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
          {/* Store context banner — especially visible for collab stores */}
          {isCollab && (
            <div className="bg-blue-50 border-b border-blue-200 px-5 py-2.5 flex items-center gap-3">
              <span className="text-lg">🤝</span>
              <div>
                <span className="text-sm font-bold text-blue-700">
                  目前管理：{store.store_name}
                </span>
                <span className="text-[11px] text-blue-500 ml-2">協作模式</span>
              </div>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
