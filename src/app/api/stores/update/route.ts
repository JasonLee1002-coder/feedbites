import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminDb = createServiceSupabase();

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      'store_name', 'frame_id', 'logo_url',
      'cuisine_type', 'city', 'district', 'price_range',
      'seating_capacity', 'opening_year', 'target_audience', 'service_type',
    ];
    const updates: Record<string, string | number | null> = {};
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await adminDb
      .from('stores')
      .update(updates)
      .eq('id', store.id);

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Store update error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
