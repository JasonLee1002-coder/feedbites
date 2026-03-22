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

    // Frontend already compresses to ~800px JPEG. Just convert to base64.
    const bytes = await image.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString('base64');
    console.log(`Menu image received: ${bytes.byteLength} bytes (${(bytes.byteLength / 1024).toFixed(0)}KB)`);

    // Detect MIME type
    const name = (image.name || '').toLowerCase();
    const mimeType = image.type && image.type.startsWith('image/')
      ? image.type
      : name.endsWith('.png') ? 'image/png'
      : name.endsWith('.webp') ? 'image/webp'
      : 'image/jpeg';

    // Use Gemini 2.0 Flash for speed (2.5 Flash thinking mode is too slow for 60s timeout)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 4096,
      },
    });

    const contentParts = [
      { inlineData: { mimeType, data: base64Image } },
      { text: `辨識圖中所有食品（菜單、展示櫃、價格板皆可）。最多20項，菜名用中文（英文翻譯），看不到名字就根據外觀推斷。description中文15字內。每項提供bbox[y_min,x_min,y_max,x_max]（0-1000正規化座標，框選該食品位置）。只回JSON不要markdown：
{"dishes":[{"name":"中文名","description":"描述","category":"分類","price":"NT$xx","bbox":[0,0,0,0]}],"total":數量,"notes":""}
category：主食/前菜/湯品/甜點/飲品/小吃/套餐/其他` },
    ];

    // Single attempt (retries eat into the 60s timeout)
    let text = '';
    try {
      const result = await model.generateContent(contentParts);
      text = result.response.text();
    } catch (genErr) {
      console.error('Menu parse Gemini error:', genErr instanceof Error ? genErr.message : genErr);
      throw genErr;
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
