import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

export const maxDuration = 60;

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

    // Normalize MIME type
    let mimeType = file.type || '';
    const fileName = file.name.toLowerCase();

    if (!mimeType || mimeType === 'application/octet-stream') {
      if (fileName.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (fileName.endsWith('.png')) mimeType = 'image/png';
      else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (fileName.endsWith('.webp')) mimeType = 'image/webp';
      else mimeType = 'application/pdf'; // default guess
    }

    // .docx.pdf → still a PDF
    if (fileName.endsWith('.pdf')) mimeType = 'application/pdf';

    console.log(`Survey parse: file=${fileName}, type=${mimeType}, size=${file.size}`);

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

FeedBites 支援的問題類型：
- "emoji-rating": 表情評分 1-5 分
- "rating": 星級評分 1-5 分
- "radio": 單選題（需 options 陣列）
- "checkbox": 多選題（需 options 陣列）
- "text": 短文字
- "textarea": 長文字回饋
- "number": 數字
- "radio-with-reason": 單選 + 原因文字框

回覆 JSON（不要 markdown 標記）：
{"title":"問卷標題","questions":[{"id":"q1","type":"類型","label":"問題","required":true,"options":["選項"]}],"notes":"說明","suggestedTemplate":"fine-dining"}

規則：保留所有問題、評分轉 emoji-rating、選擇轉 radio/checkbox、開放轉 textarea、id 從 q1 遞增。`,
      },
    ]);

    const text = result.response.text();
    console.log('Survey parse response length:', text.length);

    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('Survey parse: no JSON found:', cleaned.substring(0, 500));
      return NextResponse.json({ error: '無法解析問卷內容，請試試拍照上傳或換一份文件' }, { status: 422 });
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const qCount = parsed.questions?.length || 0;
      console.log(`Survey parse success: ${qCount} questions, title="${parsed.title}"`);
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
    if (errMsg.includes('Could not') || errMsg.includes('Unable to')) {
      return NextResponse.json({ error: '無法讀取此檔案格式，請試試截圖後上傳圖片' }, { status: 422 });
    }
    if (errMsg.includes('too large') || errMsg.includes('size')) {
      return NextResponse.json({ error: '檔案太大，請壓縮或截圖後上傳' }, { status: 413 });
    }
    return NextResponse.json({ error: `解析失敗：${errMsg.substring(0, 80)}` }, { status: 500 });
  }
}
