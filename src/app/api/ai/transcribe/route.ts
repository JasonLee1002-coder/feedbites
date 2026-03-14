import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// POST: Transcribe audio + generate dish description
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio') as File | null;
    const mode = formData.get('mode') as string; // 'transcribe' or 'describe'
    const dishName = formData.get('dishName') as string | null;

    if (!audio) {
      return NextResponse.json({ error: '缺少音檔' }, { status: 400 });
    }

    // Convert audio to base64
    const bytes = await audio.arrayBuffer();
    const base64Audio = Buffer.from(bytes).toString('base64');

    // Determine MIME type
    const mimeType = audio.type || 'audio/webm';

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    if (mode === 'describe') {
      // Step 1: Transcribe + generate dish description
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: base64Audio,
          },
        },
        {
          text: `你是餐廳菜單編輯助手。請聽這段錄音，店長正在描述一道菜品${dishName ? `「${dishName}」` : ''}。

請完成以下任務：
1. 先把店長說的話轉成文字（原始語音內容）
2. 根據店長的描述，生成一段適合放在菜單上的精練菜品描述（30-60字，有吸引力、專業感）

回覆 JSON 格式：
{
  "transcript": "店長原始語音內容",
  "description": "生成的菜品描述",
  "suggestedName": "如果店長提到了菜名，填在這裡，否則留空"
}

只回覆 JSON，不要其他文字。`,
        },
      ]);

      const text = result.response.text();

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed);
      }

      return NextResponse.json({
        transcript: text,
        description: text,
        suggestedName: '',
      });
    } else {
      // Simple transcription
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: base64Audio,
          },
        },
        {
          text: '請把這段語音轉成文字，只回覆轉錄的文字內容，不要加其他說明。如果是中文就用中文回覆。',
        },
      ]);

      const transcript = result.response.text().trim();
      return NextResponse.json({ transcript });
    }
  } catch (err) {
    console.error('Transcription error:', err);
    return NextResponse.json({ error: '語音處理失敗' }, { status: 500 });
  }
}
