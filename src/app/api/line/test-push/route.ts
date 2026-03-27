import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { pushTextMessage } from '@/lib/line/push';

// POST: Send test push notification to verify LINE binding
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const { line_user_id } = await request.json();
    if (!line_user_id?.trim()) {
      return NextResponse.json({ error: '請提供 LINE User ID' }, { status: 400 });
    }

    const ok = await pushTextMessage(
      line_user_id.trim(),
      '🍽️ FeedBites 通知測試\n\n恭喜！LINE 通知綁定成功 ✅\n之後有問題回報的處理進度，會即時通知你。',
    );

    if (!ok) {
      return NextResponse.json({ error: '發送失敗' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
