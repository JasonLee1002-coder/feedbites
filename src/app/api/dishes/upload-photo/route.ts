import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

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

    // Validate
    const maxSize = 5 * 1024 * 1024; // 5MB for food photos
    if (file.size > maxSize) {
      return NextResponse.json({ error: '檔案過大（最大 5MB）' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '僅支援 PNG / JPG / WebP' }, { status: 400 });
    }

    const adminDb = createServiceSupabase();
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `dishes/${store.id}/${dishId || Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await adminDb.storage
      .from('store-assets')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: '上傳失敗' }, { status: 500 });
    }

    const { data: { publicUrl } } = adminDb.storage
      .from('store-assets')
      .getPublicUrl(fileName);

    // If dishId provided, update the dish record
    if (dishId) {
      await adminDb
        .from('dishes')
        .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', dishId)
        .eq('store_id', store.id);
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('Dish photo upload error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
