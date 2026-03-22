import { createServiceSupabase } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import MenuClient from './MenuClient';

interface Props {
  params: Promise<{ storeId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeId } = await params;
  const db = createServiceSupabase();
  const { data: store } = await db
    .from('stores')
    .select('store_name')
    .eq('id', storeId)
    .single();

  if (!store) {
    return { title: '菜單不存在 | FeedBites' };
  }

  return {
    title: `${store.store_name} 菜單 | FeedBites`,
    description: `瀏覽 ${store.store_name} 的精選菜單`,
  };
}

export default async function PublicMenuPage({ params }: Props) {
  const { storeId } = await params;
  const db = createServiceSupabase();

  // Fetch store info
  const { data: store } = await db
    .from('stores')
    .select('id, store_name, logo_url, template_id, frame_id')
    .eq('id', storeId)
    .single();

  if (!store) {
    notFound();
  }

  // Fetch active dishes
  const { data: dishes } = await db
    .from('dishes')
    .select('id, name, description, category, photo_url, price, is_active')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('category')
    .order('created_at', { ascending: false });

  return <MenuClient store={store} dishes={dishes || []} />;
}
