import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import StoreSettingsClient from './StoreSettingsClient';
import { getSelectedStore } from '@/lib/store-context';

export default async function SettingsPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const store = await getSelectedStore(user.id);
  if (!store) redirect('/register?setup=true');

  return (
    <StoreSettingsClient
      storeId={store.id}
      storeName={store.store_name || ''}
      logoUrl={store.logo_url || null}
      frameId={store.frame_id || 'classic-gold'}
    />
  );
}
