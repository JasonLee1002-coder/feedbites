import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// POST: Analyze a store address/name and suggest metadata
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const { address, storeName } = await request.json();
    if (!address) return NextResponse.json({ error: '請輸入地址或店名' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      {
        text: `你是台灣餐飲商圈分析 AI。用戶輸入了以下資訊，可能是地址、店名、或兩者皆有。
請根據你的知識分析這家店可能的位置和商圈特性。

用戶輸入：${address}
店家名稱：${storeName || '未提供'}

請分析並回覆 JSON：
{
  "city": "城市名（例如：高雄市、台北市）",
  "district": "商圈或區域名（例如：駁二特區、六合夜市、信義商圈）",
  "suggested_audience": "推薦的主要客群（從以下選一個：上班族/白領族/學生/家庭/觀光客/外國人/商務/約會情侶/銀髮族/親子）",
  "suggested_price_range": "推薦的客單價（從以下選一個：100 以下/100-300/300-600/600-1000/1000 以上）",
  "suggested_cuisine": "推薦的料理類型（從以下選一個：日料/中餐/西餐/韓式/泰式/咖啡廳/餐酒館/酒吧/甜點/海鮮/夜市小吃/早午餐/火鍋/燒烤/素食/其他）",
  "area_insight": "一句話描述這個地區或這家店的特色（20-40字）"
}

只回覆 JSON，不要 markdown 標記。即使資訊不完整也盡量給出合理推測。`,
      },
    ]);

    const text = result.response.text();
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('Location analysis: no JSON:', text.substring(0, 300));
      return NextResponse.json({ error: '無法分析，請輸入更完整的地址' }, { status: 422 });
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json(parsed);
    } catch {
      console.error('Location analysis: JSON parse error');
      return NextResponse.json({ error: '分析結果異常，請重試' }, { status: 422 });
    }
  } catch (err) {
    console.error('Location analysis error:', err);
    return NextResponse.json({ error: '分析失敗，請重試' }, { status: 500 });
  }
}
