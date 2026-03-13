import { cookies } from 'next/headers';
import { createServiceSupabase } from '@/lib/supabase/server';

const STORE_COOKIE = 'feedbites_store_id';

export async function getSelectedStoreId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(STORE_COOKIE)?.value || null;
}

/**
 * Get the currently selected store for a user.
 * Falls back to first store if no cookie or cookie is stale.
 */
export async function getSelectedStore(userId: string) {
  const adminDb = createServiceSupabase();
  const storeId = await getSelectedStoreId();

  if (storeId) {
    const { data: store } = await adminDb
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', userId)
      .single();
    if (store) return store;
  }

  // Fallback: get first store
  const { data: stores } = await adminDb
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1);

  return stores?.[0] || null;
}

/**
 * Get all stores for a user.
 */
export async function getUserStores(userId: string) {
  const adminDb = createServiceSupabase();
  const { data: stores } = await adminDb
    .from('stores')
    .select('id, store_name, logo_url, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return stores || [];
}
