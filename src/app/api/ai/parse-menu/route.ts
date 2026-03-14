import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

// Allow longer execution for large menus
export const maxDuration = 30;

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

    // Normalize MIME type — Gemini supports jpeg, png, webp, gif
    let mimeType = image.type || 'image/jpeg';
    // Some browsers send empty or wrong MIME for webp
    if (!mimeType.startsWith('image/')) {
      const name = image.name.toLowerCase();
      if (name.endsWith('.webp')) mimeType = 'image/webp';
      else if (name.endsWith('.png')) mimeType = 'image/png';
      else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else mimeType = 'image/jpeg';
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
      {
        text: `你是餐廳菜單辨識 AI。請分析這張菜單圖片。

重要規則：
- 最多辨識 30 道菜（挑最重要/招牌的）
- 如果菜單很大，優先挑：套餐、招牌、主食、人氣推薦
- 回覆要簡潔，每道菜的 description 控制在 15 字以內
- 如果是英文菜名，請翻譯成中文

格式：
{"dishes":[{"name":"菜名","description":"簡短描述","category":"分類","price":"價格"}],"total":數量,"notes":"說明"}

category 從以下選：主食、前菜、湯品、甜點、飲品、小吃、套餐、其他
price 沒有就填空字串

只回覆 JSON，不要 markdown，不要 \`\`\`。`,
      },
    ]);

    const text = result.response.text();
    // Try to extract JSON from response (may be wrapped in ```json blocks)
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('Menu parse: no JSON found in response:', text.substring(0, 500));
      return NextResponse.json({ error: '無法辨識菜單內容，請換一張更清晰的圖片' }, { status: 422 });
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json(parsed);
    } catch (parseErr) {
      console.error('Menu parse: JSON parse error:', parseErr, 'raw:', jsonMatch[0].substring(0, 300));
      return NextResponse.json({ error: 'AI 回傳格式異常，請重試' }, { status: 422 });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Menu parse error:', errMsg);

    if (errMsg.includes('SAFETY') || errMsg.includes('blocked')) {
      return NextResponse.json({ error: '圖片內容無法處理，請換一張菜單圖片' }, { status: 422 });
    }
    if (errMsg.includes('too large') || errMsg.includes('size')) {
      return NextResponse.json({ error: '圖片太大，請壓縮後再試（建議 5MB 以下）' }, { status: 413 });
    }

    return NextResponse.json({ error: '菜單辨識失敗，請重試' }, { status: 500 });
  }
}
