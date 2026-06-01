import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { stores, store_members } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

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
  const storeId = await getSelectedStoreId();

  if (storeId) {
    // Check if the store exists
    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);

    if (store) {
      const isOwner = store.user_id === userId;
      if (isOwner) {
        return store;
      }

      // Check membership
      const [membership] = await db
        .select({ id: store_members.id })
        .from(store_members)
        .where(eq(store_members.store_id, storeId))
        .limit(1);

      if (membership) {
        return store;
      }
      // Not owner or member, fall through to find a valid store
    }
  }

  // Fallback: get first owned or member store
  const allStores = await getUserStores(userId);
  return allStores[0] || null;
}

/**
 * Get all stores for a user (owned + member).
 */
export async function getUserStores(userId: string) {
  // Get owned stores (all fields)
  const ownedStores = await db
    .select()
    .from(stores)
    .where(eq(stores.user_id, userId))
    .orderBy(stores.created_at);

  // Get member store IDs
  const memberships = await db
    .select({ store_id: store_members.store_id })
    .from(store_members)
    .where(eq(store_members.user_id, userId));

  const memberStoreIds = memberships.map(m => m.store_id);

  let memberStores: typeof ownedStores = [];
  if (memberStoreIds.length > 0) {
    memberStores = await db
      .select()
      .from(stores)
      .where(inArray(stores.id, memberStoreIds))
      .orderBy(stores.created_at);
  }

  // Combine and dedupe, mark role
  const ownedIds = new Set(ownedStores.map(s => s.id));
  const combined = [
    ...ownedStores.map(s => ({ ...s, role: 'owner' as const })),
    ...memberStores.filter(s => !ownedIds.has(s.id)).map(s => ({ ...s, role: 'member' as const })),
  ];

  return combined;
}
