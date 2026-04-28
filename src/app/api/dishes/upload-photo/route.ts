import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';
import { uploadToS3 } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    const dishId = formData.get('dishId') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '檔案過大（最大 5MB）' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '僅支援 PNG / JPG / WebP' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const key = `feedbites/dishes/${store.id}/${dishId || Date.now()}.${ext}`;
    const publicUrl = await uploadToS3(await file.arrayBuffer(), key, file.type);

    if (dishId) {
      const adminDb = createServiceSupabase();
      const { error: updateErr } = await adminDb
        .from('dishes')
        .update({ photo_url: publicUrl })
        .eq('id', dishId)
        .eq('store_id', store.id);
      if (updateErr) console.error('Failed to update dish photo_url:', updateErr.message);
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('Dish photo upload error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
