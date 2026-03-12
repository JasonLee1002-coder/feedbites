import { redirect } from 'next/navigation';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import StoreSettingsClient from './StoreSettingsClient';

export default async function SettingsPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const adminDb = createServiceSupabase();

  const { data: store } = await adminDb
    .from('stores')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!store) redirect('/register');

  return (
    <StoreSettingsClient
      storeId={store.id}
      storeName={store.store_name || ''}
      logoUrl={store.logo_url || null}
      frameId={store.frame_id || 'classic-gold'}
    />
  );
}
