export const dynamic = "force-dynamic";
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import StoreSettingsClient from './StoreSettingsClient';
import { getSelectedStore } from '@/lib/store-context';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const store = await getSelectedStore(session.user.id);
  if (!store) redirect('/dashboard/new-store');

  return (
    <StoreSettingsClient
      storeId={store.id}
      storeName={store.store_name || ''}
      logoUrl={store.logo_url || null}
      avatarUrl={store.owner_avatar_url || null}
      frameId={store.frame_id || 'classic-gold'}
      isOwner={store.user_id === session.user.id}
      ownerLineUserId={store.owner_line_user_id || ''}
      metadata={{
        cuisine_type: store.cuisine_type || '',
        city: store.city || '',
        district: store.district || '',
        price_range: store.price_range || '',
        seating_capacity: store.seating_capacity || null,
        opening_year: store.opening_year || null,
        target_audience: store.target_audience || '',
        service_type: store.service_type || '',
      }}
    />
  );
}
