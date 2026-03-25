import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase/server';

// POST: Public screenshot upload for feedback genie widget
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const storeId = formData.get('storeId') as string | null;

    if (!file || !storeId) {
      return NextResponse.json({ error: '缺少檔案或店家 ID' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '檔案太大（最大 5MB）' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '僅支援 PNG / JPG / WebP' }, { status: 400 });
    }

    const db = createServiceSupabase();
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `feedback-genie/${storeId}/${crypto.randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await db.storage
      .from('store-assets')
      .upload(fileName, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Feedback genie upload error:', uploadError);
      return NextResponse.json({ error: '上傳失敗' }, { status: 500 });
    }

    const { data: { publicUrl } } = db.storage
      .from('store-assets')
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('Feedback genie upload error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
