import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';

// POST: Upload screenshot for a feedback report
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const reportId = formData.get('report_id') as string | null;

    if (!file || !reportId) {
      return NextResponse.json({ error: '缺少檔案或回報 ID' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '檔案太大（最大 5MB）' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '僅支援 PNG / JPG / WebP' }, { status: 400 });
    }

    const adminDb = createServiceSupabase();
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `feedback/${reportId}/${crypto.randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await adminDb.storage
      .from('store-assets')
      .upload(fileName, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Feedback upload error:', uploadError);
      return NextResponse.json({ error: '上傳失敗' }, { status: 500 });
    }

    const { data: { publicUrl } } = adminDb.storage
      .from('store-assets')
      .getPublicUrl(fileName);

    // Save attachment record
    const { error: insertError } = await adminDb
      .from('feedback_attachments')
      .insert({
        report_id: reportId,
        file_url: publicUrl,
        file_name: file.name,
      });

    if (insertError) {
      console.error('Feedback attachment insert error:', insertError);
    }

    return NextResponse.json({ url: publicUrl, file_name: file.name });
  } catch (err) {
    console.error('Feedback upload error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
