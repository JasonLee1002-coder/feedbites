import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

export const maxDuration = 30;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// POST: Parse an existing survey document (PDF or image) into FeedBites questions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '請上傳問卷檔案' }, { status: 400 });
    }

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type || 'application/pdf';

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
      {
        text: `你是問卷分析 AI。請分析這份問卷文件，將所有問題轉換成 FeedBites 系統的格式。

FeedBites 支援以下問題類型：
- "emoji-rating": 表情評分（1-5分，用 😫😕😐😊🤩 表示）— 適合滿意度、評分類問題
- "rating": 星級評分（1-5分）— 適合打分類問題
- "radio": 單選題 — 需要提供 options 選項陣列
- "checkbox": 多選題 — 需要提供 options 選項陣列
- "text": 短文字輸入
- "textarea": 長文字輸入 — 適合開放回饋
- "number": 數字輸入
- "radio-with-reason": 單選 + 原因文字框

請將問卷中的每個問題轉換成以下格式：

{
  "title": "問卷標題（從文件中提取）",
  "questions": [
    {
      "id": "q1",
      "type": "問題類型",
      "label": "問題文字",
      "required": true或false,
      "options": ["選項1", "選項2"],
      "min": 1,
      "max": 5,
      "placeholder": "提示文字"
    }
  ],
  "notes": "任何額外說明",
  "suggestedTemplate": "建議使用的模板ID（fine-dining/japanese/industrial/cafe/chinese-classic）"
}

規則：
1. 保留原始問卷的所有問題，不要遺漏
2. 如果原問卷有評分類的（例如1-5分、非常滿意到不滿意），轉成 emoji-rating 或 rating
3. 如果是選擇題，轉成 radio 或 checkbox，保留所有選項
4. 如果是開放回答，轉成 text 或 textarea
5. id 從 q1 開始遞增
6. 根據問卷的風格推薦適合的模板

只回覆 JSON，不要其他文字。`,
      },
    ]);

    const text = result.response.text();
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('Survey parse: no JSON found:', text.substring(0, 500));
      return NextResponse.json({ error: '無法解析問卷內容，請換一張更清晰的圖片或 PDF' }, { status: 422 });
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json(parsed);
    } catch (parseErr) {
      console.error('Survey parse: JSON error:', parseErr);
      return NextResponse.json({ error: 'AI 回傳格式異常，請重試' }, { status: 422 });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Survey parse error:', errMsg);
    if (errMsg.includes('SAFETY') || errMsg.includes('blocked')) {
      return NextResponse.json({ error: '檔案內容無法處理，請換一份問卷' }, { status: 422 });
    }
    return NextResponse.json({ error: '問卷解析失敗，請重試' }, { status: 500 });
  }
}
