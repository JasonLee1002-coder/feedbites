import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { feedback_attachments } from '@/lib/db/schema';
import { saveToLocal } from '@/lib/local-upload';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 });

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

    const ext = file.name.split('.').pop() || 'jpg';
    const key = `feedbites/feedback/${reportId}/${crypto.randomUUID()}.${ext}`;
    const publicUrl = await saveToLocal(await file.arrayBuffer(), key);

    try {
      await db.insert(feedback_attachments).values({
        report_id: reportId,
        file_url: publicUrl,
        file_name: file.name,
      });
    } catch (insertError) {
      console.error('Feedback attachment insert error:', insertError);
    }

    return NextResponse.json({ url: publicUrl, file_name: file.name });
  } catch (err) {
    console.error('Feedback upload error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
