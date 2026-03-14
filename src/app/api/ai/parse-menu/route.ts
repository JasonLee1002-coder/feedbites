import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// POST: Parse a menu image into individual dishes
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const formData = await request.formData();
    const image = formData.get('image') as File | null;

    if (!image) {
      return NextResponse.json({ error: '請上傳菜單圖片' }, { status: 400 });
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString('base64');
    const mimeType = image.type || 'image/jpeg';

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
      {
        text: `你是餐廳菜單辨識 AI。請仔細分析這張菜單圖片，辨識出所有菜品。

對每道菜品，請提供：
1. name: 菜品名稱
2. description: 簡短描述（根據圖片上的文字或你對這道菜的了解，20-40字）
3. category: 分類（從以下選擇：主食、前菜、湯品、甜點、飲品、小吃、套餐、其他）
4. price: 如果圖片上有價格就填寫，沒有就留空

回覆 JSON 格式：
{
  "dishes": [
    { "name": "菜名", "description": "描述", "category": "分類", "price": "價格或空" }
  ],
  "total": 辨識到的菜品數量,
  "notes": "任何額外說明（例如：部分文字模糊無法辨識）"
}

只回覆 JSON，不要其他文字。盡可能辨識所有菜品，即使文字不完全清楚也嘗試猜測。`,
      },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ error: '無法辨識菜單內容' }, { status: 422 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Menu parse error:', err);
    return NextResponse.json({ error: '菜單辨識失敗，請重試' }, { status: 500 });
  }
}
