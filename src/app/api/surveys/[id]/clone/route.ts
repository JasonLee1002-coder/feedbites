import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

// POST: Clone a survey
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const adminDb = createServiceSupabase();

    const store = await getSelectedStore(user.id);
    if (!store) {
      return NextResponse.json({ error: '找不到店家' }, { status: 404 });
    }

    // Get the original survey
    const { data: original } = await adminDb
      .from('surveys')
      .select('*')
      .eq('id', id)
      .eq('store_id', store.id)
      .single();

    if (!original) {
      return NextResponse.json({ error: '找不到問卷' }, { status: 404 });
    }

    // Create clone
    const { data: clone, error } = await adminDb
      .from('surveys')
      .insert({
        store_id: store.id,
        title: `${original.title} (複製)`,
        template_id: original.template_id,
        custom_colors: original.custom_colors,
        questions: original.questions,
        is_active: false,
        discount_type: original.discount_type,
        discount_value: original.discount_value,
        discount_expiry_days: original.discount_expiry_days,
        discount_enabled: original.discount_enabled,
        discount_mode: original.discount_mode,
        discount_tiers: original.discount_tiers,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(clone, { status: 201 });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
