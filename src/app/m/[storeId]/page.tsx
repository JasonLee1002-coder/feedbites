import { db } from '@/lib/db';
import { stores, dishes } from '@/lib/db/schema';
import { and, eq, asc, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import MenuClient from './MenuClient';

interface Props {
  params: Promise<{ storeId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeId } = await params;

  const [store] = await db
    .select({ store_name: stores.store_name })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);

  if (!store) {
    return { title: '菜單不存在 | FeedBites' };
  }

  return {
    title: `${store.store_name} 菜單 | FeedBites`,
    description: `瀏覽 ${store.store_name} 的精選菜單`,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicMenuPage({ params }: Props) {
  const { storeId } = await params;

  if (!UUID_RE.test(storeId)) notFound();

  // Fetch store info
  const [store] = await db
    .select({
      id: stores.id,
      store_name: stores.store_name,
      logo_url: stores.logo_url,
      frame_id: stores.frame_id,
    })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);

  if (!store) {
    notFound();
  }

  // Fetch active dishes
  const dishList = await db
    .select({
      id: dishes.id,
      name: dishes.name,
      description: dishes.description,
      category: dishes.category,
      photo_url: dishes.photo_url,
      price: dishes.price,
      is_active: dishes.is_active,
    })
    .from(dishes)
    .where(and(eq(dishes.store_id, storeId), eq(dishes.is_active, true)))
    .orderBy(asc(dishes.category), desc(dishes.created_at));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <MenuClient store={store as any} dishes={dishList.map(d => ({ ...d, is_active: d.is_active ?? true, created_at: null }))} />;
}
