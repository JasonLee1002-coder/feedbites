import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase/server';

// GET: Public endpoint — fetch store info and active dishes
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const adminDb = createServiceSupabase();

    // Fetch store info
    const { data: store, error: storeError } = await adminDb
      .from('stores')
      .select('store_name, logo_url')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: '找不到店家' }, { status: 404 });
    }

    // Fetch active dishes
    const { data: dishes, error: dishesError } = await adminDb
      .from('dishes')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('category')
      .order('created_at', { ascending: false });

    if (dishesError) {
      return NextResponse.json({ error: dishesError.message }, { status: 500 });
    }

    return NextResponse.json({
      store,
      dishes: dishes || [],
    });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
