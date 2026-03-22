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

    const prompt = `辨識圖中食品，最多15項。規則：
- name：只要中文，不要英文
- description：中文10字內
- price：如"NT$140"或""
- bbox：[y_min,x_min,y_max,x_max] 0~1000座標
- category：主食/前菜/湯品/甜點/飲品/小吃/套餐/其他
只回JSON：{"dishes":[{"name":"","description":"","category":"","price":"","bbox":[0,0,0,0]}],"total":0}`;

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
          generationConfig: { maxOutputTokens: 8192 },
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

    // Basic cleanup
    jsonStr = jsonStr
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');

    // If JSON is truncated (no proper closing), try to fix it
    const openBraces = (jsonStr.match(/{/g) || []).length;
    const closeBraces = (jsonStr.match(/}/g) || []).length;
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/]/g) || []).length;

    if (openBraces > closeBraces || openBrackets > closeBrackets) {
      console.log(`JSON truncated: { ${openBraces}/${closeBraces}, [ ${openBrackets}/${closeBrackets}. Attempting repair...`);
      // Remove the last incomplete item (after last complete })
      const lastCompleteObj = jsonStr.lastIndexOf('}');
      if (lastCompleteObj > 0) {
        jsonStr = jsonStr.substring(0, lastCompleteObj + 1);
        // Close remaining brackets
        const remainingBrackets = openBrackets - (jsonStr.match(/]/g) || []).length;
        const remainingBraces = openBraces - (jsonStr.match(/}/g) || []).length;
        for (let i = 0; i < remainingBrackets; i++) jsonStr += ']';
        for (let i = 0; i < remainingBraces; i++) jsonStr += '}';
        // Clean trailing commas again
        jsonStr = jsonStr.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
      }
    }

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
      return NextResponse.json({ error: '辨識結果解析失敗，請重新上傳試試' }, { status: 422 });
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
