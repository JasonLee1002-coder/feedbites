import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

// Allow longer execution for large menus
export const maxDuration = 60;

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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const contentParts = [
      { inlineData: { mimeType, data: base64Image } },
      { text: `你是餐廳菜單與食品辨識 AI。你正在分析的圖片可能是：傳統菜單、展示櫃/陳列櫃、價格板/黑板、或任何顯示食品項目與價格的格式。請辨識圖中所有食品項目。

圖片類型判斷與處理：
- **傳統菜單**：依照菜單排版辨識菜名、價格
- **展示櫃/陳列櫃**（如麵包店、蛋糕店、熟食櫃）：辨識每個獨立的食品項目，讀取其價格標籤，並為每個食品項目提供精確的 bounding box
- **價格板/黑板**：擷取品項名稱與對應價格
- **其他格式**（傳單、海報、看板等）：盡力辨識所有食品項目與價格

規則：
1. 最多辨識 30 道菜（優先招牌/主食）
2. **菜名一律用中文**。如果原文是英文，翻譯成中文
3. description 用中文，15 字以內
4. **如果食品項目名稱在圖中不清楚或沒有標示**，請根據食物外觀推斷合理的中文名稱（例如看起來像巧克力馬芬就寫「巧克力馬芬」，看起來像原味司康就寫「原味司康」）
5. **每個在圖片中可見的食品項目都必須提供 bbox**（不限於有照片的菜品）

bbox 說明：
- 格式：[y_min, x_min, y_max, x_max]
- 數值為 0~1000 的整數，代表該食品項目在整張圖片中的正規化位置
- 請精確框選每個「個別食品項目」本身，盡量貼合食物邊緣
- 展示櫃場景：每個麵包/蛋糕/食品分別給一個獨立的 bbox，不要把多個品項框在一起
- 傳統菜單場景：如果有餐點照片就框選照片區域
- 數值必須合理：y_min < y_max, x_min < x_max，且都在 0~1000 範圍內
- 沒有視覺上可辨識位置的品項（如純文字價格板）不需要 bbox

回覆格式（只回覆 JSON，不要 markdown）：
{"dishes":[{"name":"中文菜名","description":"中文描述","category":"分類","price":"NT$xxx","bbox":[y_min,x_min,y_max,x_max]}],"total":數量,"notes":"說明"}

category 從以下選擇：主食/前菜/湯品/甜點/飲品/小吃/套餐/其他` },
    ];

    // Retry up to 2 times
    let text = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(contentParts);
        text = result.response.text();
        break;
      } catch (retryErr) {
        console.error(`Menu parse attempt ${attempt + 1} failed:`, retryErr instanceof Error ? retryErr.message : retryErr);
        if (attempt === 2) throw retryErr;
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    // Try to extract JSON from response (may be wrapped in ```json blocks)
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('Menu parse: no JSON found in response:', text.substring(0, 500));
      return NextResponse.json({ error: '無法辨識菜單內容，請換一張更清晰的圖片' }, { status: 422 });
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      // Log bbox stats for debugging
      const bboxCount = parsed.dishes?.filter((d: { bbox?: number[] }) => d.bbox && Array.isArray(d.bbox) && d.bbox.length === 4).length || 0;
      console.log(`Menu parse: ${parsed.dishes?.length || 0} dishes, ${bboxCount} with bbox`);
      if (bboxCount > 0) {
        console.log('Sample bbox:', JSON.stringify(parsed.dishes.find((d: { bbox?: number[] }) => d.bbox)?.bbox));
      }
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
