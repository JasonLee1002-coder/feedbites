import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ history: [] });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ history: [] });

    const db = createServiceSupabase();
    const { data } = await db
      .from('assistant_chat_history')
      .select('role, content, created_at')
      .eq('store_id', store.id)
      .order('created_at', { ascending: true })
      .limit(20);

    return NextResponse.json({ history: data || [] });
  } catch {
    return NextResponse.json({ history: [] });
  }
}
