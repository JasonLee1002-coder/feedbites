import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const adminDb = createServiceSupabase();
    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;
    if (!file) return NextResponse.json({ error: '請選擇圖片' }, { status: 400 });

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: '檔案太大，最大 2MB' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '僅支援 PNG / JPG / WebP' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'png';
    const filePath = `avatars/${user.id}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await adminDb.storage
      .from('store-assets')
      .upload(filePath, bytes, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return NextResponse.json({ error: '上傳失敗' }, { status: 500 });
    }

    const { data: urlData } = adminDb.storage
      .from('store-assets')
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl;

    // Update store
    await adminDb
      .from('stores')
      .update({ owner_avatar_url: avatarUrl })
      .eq('id', store.id);

    return NextResponse.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
