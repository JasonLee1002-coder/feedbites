import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// POST: Parse survey image(s) into FeedBites questions
// Frontend converts PDF to images before uploading
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const formData = await request.formData();

    // Support multiple images (one per PDF page)
    const images: { mimeType: string; data: string }[] = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image') && value instanceof File) {
        const bytes = await value.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');
        images.push({
          mimeType: value.type || 'image/png',
          data: base64,
        });
      }
    }

    // Fallback: single file upload
    if (images.length === 0) {
      const file = formData.get('file') as File | null;
      if (!file) return NextResponse.json({ error: '請上傳問卷檔案' }, { status: 400 });
      const bytes = await file.arrayBuffer();
      images.push({
        mimeType: file.type || 'image/png',
        data: Buffer.from(bytes).toString('base64'),
      });
    }

    console.log(`Survey parse: ${images.length} image(s)`);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const parts = [
      ...images.map(img => ({ inlineData: img })),
      {
        text: `你是問卷分析 AI。請分析這些問卷圖片（可能有多頁），將所有問題轉換成 FeedBites 格式。

問題類型：emoji-rating(1-5分)、rating(1-5分)、radio(單選+options)、checkbox(多選+options)、text(短文字)、textarea(長文字)、number(數字)、radio-with-reason(單選+原因)

回覆 JSON（不要 markdown）：
{"title":"問卷標題","questions":[{"id":"q1","type":"類型","label":"問題","required":true,"options":["選項"],"min":1,"max":5}],"notes":"說明","suggestedTemplate":"fine-dining"}

規則：保留所有問題、評分轉 emoji-rating、選擇轉 radio/checkbox、開放轉 textarea、id 從 q1 遞增。`,
      },
    ];

    // Retry up to 2 times on failure
    let text = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(parts);
        text = result.response.text();
        break;
      } catch (retryErr) {
        console.error(`Survey parse attempt ${attempt + 1} failed:`, retryErr instanceof Error ? retryErr.message : retryErr);
        if (attempt === 2) throw retryErr;
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // 1s, 2s delay
      }
    }

    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('Survey parse: no JSON:', cleaned.substring(0, 300));
      return NextResponse.json({ error: '無法解析問卷內容，請重試' }, { status: 422 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`Survey parse success: ${parsed.questions?.length || 0} questions`);
    return NextResponse.json(parsed);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Survey parse error:', errMsg);
    return NextResponse.json({ error: `解析失敗：${errMsg.substring(0, 100)}` }, { status: 500 });
  }
}
