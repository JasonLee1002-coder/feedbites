import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';

// GET: List surveys for authenticated store owner
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const adminDb = createServiceSupabase();

    // Get store for user
    const { data: store, error: storeError } = await adminDb
      .from('stores')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: '找不到店家' }, { status: 404 });
    }

    // Get surveys for this store
    const { data: surveys, error: surveysError } = await adminDb
      .from('surveys')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });

    if (surveysError) {
      return NextResponse.json({ error: surveysError.message }, { status: 500 });
    }

    return NextResponse.json(surveys);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// POST: Create new survey
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const adminDb = createServiceSupabase();

    // Get store for user
    const { data: store, error: storeError } = await adminDb
      .from('stores')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: '找不到店家' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      template_id,
      custom_colors,
      questions,
      discount_type = 'percentage',
      discount_value = '10',
      discount_expiry_days = 30,
      discount_enabled = true,
    } = body;

    if (!title || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }

    const { data: survey, error: createError } = await adminDb
      .from('surveys')
      .insert({
        store_id: store.id,
        title,
        template_id: template_id || 'fine-dining',
        custom_colors: custom_colors || null,
        questions,
        is_active: true,
        discount_type,
        discount_value,
        discount_expiry_days,
        discount_enabled,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json(survey, { status: 201 });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
