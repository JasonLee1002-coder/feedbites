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
    console.log(`Menu image: ${(bytes.byteLength / 1024).toFixed(0)}KB, type=${image.type}, name=${image.name}`);

    // Detect MIME type
    const fileName = (image.name || '').toLowerCase();
    const mimeType = image.type && image.type.startsWith('image/')
      ? image.type
      : fileName.endsWith('.png') ? 'image/png'
      : fileName.endsWith('.webp') ? 'image/webp'
      : 'image/jpeg';

    // Try gemini-2.5-flash first, fallback to gemini-2.0-flash-001
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-1.5-flash'];

    const prompt = `辨識圖中所有食品（菜單、展示櫃、價格板皆可）。最多20項，菜名用中文（英文翻譯），看不到名字就根據外觀推斷。description中文15字內。每項提供bbox[y_min,x_min,y_max,x_max]（0-1000正規化座標，框選該食品位置）。只回JSON不要markdown：
{"dishes":[{"name":"中文名","description":"描述","category":"分類","price":"NT$xx","bbox":[0,0,0,0]}],"total":數量,"notes":""}
category：主食/前菜/湯品/甜點/飲品/小吃/套餐/其他`;

    const contentParts = [
      { inlineData: { mimeType, data: base64Image } },
      { text: prompt },
    ];

    let text = '';
    let lastError = '';

    for (const modelName of models) {
      try {
        console.log(`Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 4096 },
        });
        const result = await model.generateContent(contentParts);
        text = result.response.text();
        console.log(`Success with ${modelName}, response length: ${text.length}`);
        break;
      } catch (genErr) {
        lastError = genErr instanceof Error ? genErr.message : String(genErr);
        console.error(`Model ${modelName} failed:`, lastError);
        // Try next model
      }
    }

    if (!text) {
      console.error('All models failed. Last error:', lastError);
      return NextResponse.json({
        error: `AI 辨識失敗：${lastError.substring(0, 100)}`,
      }, { status: 500 });
    }

    // Extract JSON from response — handle various AI output formats
    console.log('Raw AI response (first 500):', text.substring(0, 500));

    // Strip markdown code blocks, thinking tags, and other wrappers
    let cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/<think>[\s\S]*?<\/think>/g, '')  // Gemini 2.5 thinking blocks
      .trim();

    // Find the outermost JSON object
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      console.error('Menu parse: no JSON found in response:', text.substring(0, 500));
      return NextResponse.json({ error: '無法辨識菜單內容，請換一張更清晰的圖片' }, { status: 422 });
    }

    let jsonStr = cleaned.substring(jsonStart, jsonEnd + 1);

    // Aggressive JSON repair
    jsonStr = jsonStr
      .replace(/\n/g, ' ')            // newlines → spaces
      .replace(/\r/g, '')             // carriage returns
      .replace(/\t/g, ' ')            // tabs → spaces
      .replace(/,\s*}/g, '}')         // trailing comma before }
      .replace(/,\s*]/g, ']')         // trailing comma before ]
      .replace(/(\d)\s+(\d)/g, '$1, $2')  // "123 456" → "123, 456" (bbox missing commas)
      .replace(/]\s*\[/g, '], [')     // "][" → "], [" (missing comma between arrays)
      .replace(/}\s*{/g, '}, {')      // "}{" → "}, {" (missing comma between objects)
      .replace(/"\s*"/g, '", "')      // "" "" → "", "" (missing comma between strings)
      .replace(/(\d)\s*"/g, '$1, "')  // '123"' → '123, "' (missing comma after number)
      .replace(/"\s*(\d)/g, '", $1')  // '"abc"123' → '"abc", 123'
      .replace(/"\s*\[/g, '": [')     // Fix missing colon (rare)
      .replace(/"\s*{/g, '": {');     // Fix missing colon (rare)

    // Don't blindly replace all single quotes (breaks apostrophes in text)

    // Try parsing
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Second attempt: try to extract just the dishes array
      console.log('First parse failed, trying dishes array extraction...');
      const dishesMatch = jsonStr.match(/"dishes"\s*:\s*\[([\s\S]*)\]/);
      if (dishesMatch) {
        try {
          // Wrap each {...} object individually
          const objMatches = dishesMatch[1].match(/\{[^{}]*\}/g);
          if (objMatches) {
            const dishes = objMatches.map(obj => {
              try { return JSON.parse(obj); }
              catch { return null; }
            }).filter(Boolean);
            if (dishes.length > 0) {
              parsed = { dishes, total: dishes.length, notes: '' };
              console.log(`Recovered ${dishes.length} dishes from broken JSON`);
            }
          }
        } catch { /* give up */ }
      }
    }

    if (!parsed) {
      console.error('JSON parse failed. jsonStr (first 500):', jsonStr.substring(0, 500));
      // Return raw AI response snippet so user can report it
      const snippet = text.substring(0, 300).replace(/\n/g, ' ');
      return NextResponse.json({ error: `DEBUG: AI原始回應：${snippet}` }, { status: 422 });
    }

    const bboxCount = parsed.dishes?.filter((d: { bbox?: number[] }) => d.bbox && Array.isArray(d.bbox) && d.bbox.length === 4).length || 0;
    console.log(`Menu parse OK: ${parsed.dishes?.length || 0} dishes, ${bboxCount} with bbox`);
    return NextResponse.json(parsed);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Menu parse error:', errMsg);

    if (errMsg.includes('SAFETY') || errMsg.includes('blocked')) {
      return NextResponse.json({ error: '圖片內容無法處理，請換一張菜單圖片' }, { status: 422 });
    }

    return NextResponse.json({ error: `菜單辨識失敗：${errMsg.substring(0, 80)}` }, { status: 500 });
  }
}
