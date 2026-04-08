import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const { description } = await request.json();
    if (!description?.trim()) {
      return NextResponse.json({ error: '請輸入模板描述' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `你是一個 UI 設計師，根據店長的描述，產生問卷頁面的配色方案。

店長描述：${description}

請輸出一個 JSON 物件，包含以下欄位（全部為 hex 色碼字串）：
- primary：主要按鈕、強調元素的顏色
- primaryLight：主色的淺色版（hover/淡底效果）
- primaryDark：主色的深色版（陰影/加深）
- background：頁面整體背景色
- surface：卡片/面板的背景色
- text：主要文字顏色
- textLight：次要/說明文字顏色
- border：邊框、分隔線顏色
- accent：點綴色（用於特殊強調、badge）

規則：
1. 必須符合店長描述的風格感受
2. 文字顏色必須與背景形成足夠對比（可讀性）
3. 如果描述是深色背景，surface 比 background 略淺；如果是淺色背景，surface 比 background 略深
4. 只輸出純 JSON，不要有 markdown、說明文字或換行符號以外的內容

範例輸出格式：
{"primary":"#C5A55A","primaryLight":"#E8D5A3","primaryDark":"#A08735","background":"#FAF7F2","surface":"#FFFFFF","text":"#4A4545","textLight":"#8A8585","border":"#E8E2D8","accent":"#B8926A"}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 無法產生配色，請重新描述' }, { status: 500 });
    }

    const colors = JSON.parse(jsonMatch[0]);

    // Validate required fields
    const required = ['primary', 'primaryLight', 'primaryDark', 'background', 'surface', 'text', 'textLight', 'border', 'accent'];
    for (const field of required) {
      if (!colors[field] || !/^#[0-9A-Fa-f]{6}$/.test(colors[field])) {
        return NextResponse.json({ error: 'AI 產生的配色格式有誤，請重試' }, { status: 500 });
      }
    }

    return NextResponse.json({ colors });
  } catch (err) {
    console.error('generate-template error:', err);
    return NextResponse.json({ error: '伺服器錯誤，請稍後再試' }, { status: 500 });
  }
}
