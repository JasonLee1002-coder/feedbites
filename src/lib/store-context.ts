import { cookies } from 'next/headers';
import { createServiceSupabase } from '@/lib/supabase/server';

const STORE_COOKIE = 'feedbites_store_id';

export async function getSelectedStoreId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(STORE_COOKIE)?.value || null;
}

/**
 * Get the currently selected store for a user.
 * Includes stores the user owns OR is a member of.
 * Falls back to first store if no cookie or cookie is stale.
 */
export async function getSelectedStore(userId: string) {
  const adminDb = createServiceSupabase();
  const storeId = await getSelectedStoreId();

  if (storeId) {
    // Check if user owns or is a member of this store
    const { data: store } = await adminDb
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (store) {
      const isOwner = store.user_id === userId;
      if (!isOwner) {
        const { data: membership } = await adminDb
          .from('store_members')
          .select('id')
          .eq('store_id', storeId)
          .eq('user_id', userId)
          .single();
        if (!membership) {
          // Not owner or member, fall through to find a valid store
        } else {
          return store;
        }
      } else {
        return store;
      }
    }
  }

  // Fallback: get first owned or member store
  const stores = await getUserStores(userId);
  return stores[0] || null;
}

/**
 * Get all stores for a user (owned + member).
 */
export async function getUserStores(userId: string) {
  const adminDb = createServiceSupabase();

  // Get owned stores
  const { data: ownedStores } = await adminDb
    .from('stores')
    .select('id, store_name, logo_url, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  // Get member stores
  const { data: memberships } = await adminDb
    .from('store_members')
    .select('store_id')
    .eq('user_id', userId);

  const memberStoreIds = (memberships || []).map(m => m.store_id);

  let memberStores: typeof ownedStores = [];
  if (memberStoreIds.length > 0) {
    const { data } = await adminDb
      .from('stores')
      .select('id, store_name, logo_url, created_at')
      .in('id', memberStoreIds)
      .order('created_at', { ascending: true });
    memberStores = data;
  }

  // Combine and dedupe (owner takes precedence)
  const ownedIds = new Set((ownedStores || []).map(s => s.id));
  const combined = [
    ...(ownedStores || []),
    ...(memberStores || []).filter(s => !ownedIds.has(s.id)),
  ];

  return combined;
}
