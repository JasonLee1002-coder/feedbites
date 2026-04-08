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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `你是一位頂尖的品牌設計師，專門為餐廳設計高質感問卷頁面配色。

店長的風格描述：${description}

請根據描述產生「3 套」不同詮釋的配色方案，每套各有獨特個性但都符合描述精神。
例如描述「木紋質感金框」→ 方案一偏深沉、方案二偏溫暖明亮、方案三偏現代簡約。

每套方案包含以下 hex 色碼欄位：
- primary：主色（按鈕、CTA、強調）
- primaryLight：主色淺版（hover 效果、淡底）
- primaryDark：主色深版（陰影、按下效果）
- background：頁面整體底色
- surface：卡片 / 面板底色（與 background 有層次感）
- text：主要文字（需與背景高對比，可讀性佳）
- textLight：次要說明文字（稍淺）
- border：邊框 / 分隔線（帶風格）
- accent：點綴色（badge、特效、星號）
- name：這套方案的中文名稱（2-4 字，有意境）
- vibe：一句話形容這套的氛圍感（8 字以內）

設計原則：
1. 深色背景 → surface 比 background 亮 10–15%；淺色背景 → surface 比 background 深 5%
2. text 與 background 的對比度至少 4.5:1（WCAG AA）
3. border 顏色要有層次感，不能與 background 一樣
4. primary 與 background 要形成視覺焦點
5. 三套之間要有明顯差異（不能只是微調）
6. 風格要有質感，避免俗氣的純色組合

只輸出純 JSON 陣列，不要 markdown 或說明文字：
[
  {"name":"...","vibe":"...","primary":"#...","primaryLight":"#...","primaryDark":"#...","background":"#...","surface":"#...","text":"#...","textLight":"#...","border":"#...","accent":"#..."},
  {...},
  {...}
]`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Extract JSON array
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 無法產生配色，請重新描述' }, { status: 500 });
    }

    const variants = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json({ error: 'AI 回傳格式有誤，請重試' }, { status: 500 });
    }

    // Validate each variant
    const required = ['primary', 'primaryLight', 'primaryDark', 'background', 'surface', 'text', 'textLight', 'border', 'accent'];
    const validated = variants.slice(0, 3).filter(v => {
      return required.every(f => v[f] && /^#[0-9A-Fa-f]{6}$/.test(v[f]));
    });

    if (validated.length === 0) {
      return NextResponse.json({ error: 'AI 產生的配色格式有誤，請重試' }, { status: 500 });
    }

    return NextResponse.json({ variants: validated });
  } catch (err) {
    console.error('generate-template error:', err);
    return NextResponse.json({ error: '伺服器錯誤，請稍後再試' }, { status: 500 });
  }
}
