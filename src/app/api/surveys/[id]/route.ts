import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

// GET: Get single survey (public if active, or owner)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminDb = createServiceSupabase();

    const { data: survey, error } = await adminDb
      .from('surveys')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !survey) {
      return NextResponse.json({ error: '找不到問卷' }, { status: 404 });
    }

    // If survey is active, allow public access
    if (survey.is_active) {
      return NextResponse.json(survey);
    }

    // If not active, only owner can view
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const store = await getSelectedStore(user.id);

    if (!store || survey.store_id !== store.id) {
      return NextResponse.json({ error: '未授權' }, { status: 403 });
    }

    return NextResponse.json(survey);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// PUT: Update survey (owner only)
export async function PUT(
  request: NextRequest,
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

    // Verify ownership
    const store = await getSelectedStore(user.id);

    if (!store) {
      return NextResponse.json({ error: '找不到店家' }, { status: 404 });
    }

    const { data: existingSurvey } = await adminDb
      .from('surveys')
      .select('store_id')
      .eq('id', id)
      .single();

    if (!existingSurvey || existingSurvey.store_id !== store.id) {
      return NextResponse.json({ error: '未授權' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      template_id,
      custom_colors,
      questions,
      is_active,
      discount_type,
      discount_value,
      discount_expiry_days,
      discount_enabled,
      discount_mode,
      discount_tiers,
      prize_items,
      prize_same_day_valid,
    } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (template_id !== undefined) updateData.template_id = template_id;
    if (custom_colors !== undefined) updateData.custom_colors = custom_colors;
    if (questions !== undefined) updateData.questions = questions;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (discount_type !== undefined) updateData.discount_type = discount_type;
    if (discount_value !== undefined) updateData.discount_value = discount_value;
    if (discount_expiry_days !== undefined) updateData.discount_expiry_days = discount_expiry_days;
    if (discount_enabled !== undefined) updateData.discount_enabled = discount_enabled;
    if (discount_mode !== undefined) updateData.discount_mode = discount_mode;
    if (discount_tiers !== undefined) updateData.discount_tiers = discount_tiers;
    if (prize_items !== undefined) updateData.prize_items = prize_items;
    if (prize_same_day_valid !== undefined) updateData.prize_same_day_valid = prize_same_day_valid;

    const { data: survey, error: updateError } = await adminDb
      .from('surveys')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(survey);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// PATCH: Partial update (e.g. toggle active status)
export async function PATCH(
  request: NextRequest,
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

    // Verify ownership
    const store = await getSelectedStore(user.id);

    if (!store) {
      return NextResponse.json({ error: '找不到店家' }, { status: 404 });
    }

    const { data: existingSurvey } = await adminDb
      .from('surveys')
      .select('store_id')
      .eq('id', id)
      .single();

    if (!existingSurvey || existingSurvey.store_id !== store.id) {
      return NextResponse.json({ error: '未授權' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.title !== undefined) updateData.title = body.title;

    const { data: survey, error: updateError } = await adminDb
      .from('surveys')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(survey);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// DELETE: Delete survey (owner only)
export async function DELETE(
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

    // Verify ownership
    const store = await getSelectedStore(user.id);

    if (!store) {
      return NextResponse.json({ error: '找不到店家' }, { status: 404 });
    }

    const { data: existingSurvey } = await adminDb
      .from('surveys')
      .select('store_id')
      .eq('id', id)
      .single();

    if (!existingSurvey || existingSurvey.store_id !== store.id) {
      return NextResponse.json({ error: '未授權' }, { status: 403 });
    }

    const { error: deleteError } = await adminDb
      .from('surveys')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
