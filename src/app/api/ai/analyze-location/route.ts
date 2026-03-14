import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// POST: Analyze a store address and suggest metadata
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const { address, storeName } = await request.json();
    if (!address) return NextResponse.json({ error: '請輸入地址' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      {
        text: `你是台灣餐飲商圈分析 AI。請根據以下店家資訊分析並推薦：

店家名稱：${storeName || '未提供'}
地址：${address}

請分析並回覆 JSON：
{
  "city": "城市名（例如：高雄市、台北市、台中市）",
  "district": "商圈或區域名（例如：駁二特區、信義商圈、一中街、逢甲商圈、東區、西門町）",
  "suggested_audience": "根據商圈特性推薦的主要客群（從以下選一個：上班族/學生/家庭/觀光客/商務/約會情侶/銀髮族）",
  "suggested_price_range": "根據商圈消費水平推薦的客單價範圍（從以下選一個：100 以下/100-300/300-600/600-1000/1000 以上）",
  "area_insight": "一句話描述這個商圈的特色和客群（20-40字，例如：駁二特區以觀光客和文青為主，適合特色料理和輕食）"
}

只回覆 JSON，不要其他文字。如果無法辨識地址，根據店名猜測合理的值。`,
      },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: '無法分析此地址' }, { status: 422 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Location analysis error:', err);
    return NextResponse.json({ error: '分析失敗，請重試' }, { status: 500 });
  }
}
