import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// POST: Customer voice feedback — transcribe + AI understand + polish
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio') as File | null;
    const questionLabel = formData.get('questionLabel') as string | null;
    const surveyTitle = formData.get('surveyTitle') as string | null;

    if (!audio) {
      return NextResponse.json({ error: '缺少音檔' }, { status: 400 });
    }

    const bytes = await audio.arrayBuffer();
    const base64Audio = Buffer.from(bytes).toString('base64');
    const mimeType = audio.type || 'audio/webm';

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Audio,
        },
      },
      {
        text: `你是餐廳問卷回饋助手。客人正在用語音回答問卷問題。

問卷標題：${surveyTitle || '餐廳問卷'}
問題：${questionLabel || '開放回饋'}

請完成以下任務：
1. 把客人說的話轉成文字（原始內容）
2. 理解客人的意圖，整理成精練、有禮貌的回饋文字（保留客人原意，去除口語贅字，語氣自然）
3. 如果客人提到具體菜品，標註出來

回覆 JSON 格式：
{
  "transcript": "原始語音內容",
  "polished": "整理後的精練回饋文字",
  "mentioned_dishes": ["客人提到的菜品名稱"],
  "sentiment": "positive/neutral/negative"
}

只回覆 JSON，不要其他文字。`,
      },
    ]);

    const text = result.response.text();
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json(parsed);
    }

    return NextResponse.json({
      transcript: text.trim(),
      polished: text.trim(),
      mentioned_dishes: [],
      sentiment: 'neutral',
    });
  } catch (err) {
    console.error('Voice feedback error:', err);
    return NextResponse.json({ error: '語音處理失敗' }, { status: 500 });
  }
}
