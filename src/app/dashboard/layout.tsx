import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminDb = createServiceSupabase();
  const { data: store } = await adminDb
    .from('stores')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const storeName = store?.store_name || '我的店家';

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Sidebar storeName={storeName} />
      {/* Main content */}
      <main className="lg:pl-60">
        <div className="pt-14 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
