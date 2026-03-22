import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';

// POST: Reset (clear) specific data categories for a store
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const { storeId } = await params;

    // Verify ownership
    const db = createServiceSupabase();
    const { data: store } = await db
      .from('stores')
      .select('id, user_id')
      .eq('id', storeId)
      .single();

    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });
    if (store.user_id !== user.id) return NextResponse.json({ error: '只有店長可以清空資料' }, { status: 403 });

    const body = await request.json();
    const targets: string[] = body.targets || [];
    const results: Record<string, number> = {};

    // Clear surveys (cascades to responses + discount_codes via FK)
    if (targets.includes('surveys')) {
      const { data: deleted } = await db
        .from('surveys')
        .delete()
        .eq('store_id', storeId)
        .select('id');
      results.surveys = deleted?.length || 0;
    }

    // Clear responses only (keep surveys)
    if (targets.includes('responses')) {
      // Get all survey IDs for this store
      const { data: surveys } = await db
        .from('surveys')
        .select('id')
        .eq('store_id', storeId);

      if (surveys && surveys.length > 0) {
        const surveyIds = surveys.map(s => s.id);

        // Delete discount codes first (FK dependency)
        await db
          .from('discount_codes')
          .delete()
          .in('survey_id', surveyIds);

        // Delete responses
        const { data: deleted } = await db
          .from('responses')
          .delete()
          .in('survey_id', surveyIds)
          .select('id');
        results.responses = deleted?.length || 0;
      }
    }

    // Clear dishes + their photos
    if (targets.includes('dishes')) {
      // Clean up storage
      const { data: dishPhotos } = await db
        .from('dishes')
        .select('photo_url')
        .eq('store_id', storeId)
        .not('photo_url', 'is', null);

      const { data: deleted } = await db
        .from('dishes')
        .delete()
        .eq('store_id', storeId)
        .select('id');
      results.dishes = deleted?.length || 0;

      // Try to clean up storage files
      if (dishPhotos && dishPhotos.length > 0) {
        try {
          const paths = dishPhotos
            .map(d => d.photo_url)
            .filter(Boolean)
            .map(url => {
              const match = url!.match(/dishes\/(.+)$/);
              return match ? `dishes/${match[1]}` : null;
            })
            .filter(Boolean) as string[];

          if (paths.length > 0) {
            await db.storage.from('store-assets').remove(paths);
          }
        } catch { /* storage cleanup is best effort */ }
      }
    }

    // Clear feedback reports
    if (targets.includes('feedback')) {
      const { data: deleted } = await db
        .from('feedback_reports')
        .delete()
        .eq('store_id', storeId)
        .select('id');
      results.feedback = deleted?.length || 0;
    }

    return NextResponse.json({ ok: true, cleared: results });
  } catch (err) {
    console.error('Store reset error:', err);
    return NextResponse.json({ error: '清空失敗，請重試' }, { status: 500 });
  }
}
