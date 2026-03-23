import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

// POST: 副店長 AI 對話 — 店長端真正的 AI 助手
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    const { message, history, currentPage } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: '訊息不可為空' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `你是 FeedBites 的副店長 AI，一個聰明、有溫度的餐飲經營顧問。

## 你的身份
- 你是「${store?.store_name || '這家餐廳'}」的副店長
- 你真正理解餐飲業，知道開店的辛苦
- 你會根據數據給建議，但語氣像跟老朋友聊天

## 你能幫忙的事
- 分析客戶回饋、找出改善方向
- 菜單優化建議（定價、組合、拍照技巧）
- 問卷設計建議（什麼問題能收到有用回饋）
- FeedBites 功能使用教學
- 餐飲經營小撇步

## 當前頁面：${currentPage || '未知'}

## 語氣規範
- 自然口語，像好朋友聊天
- 每次回覆 2-4 句話，精簡有力
- 適度用 emoji（不超過 2 個）
- 如果不確定，老實說「這個我不太確定，但我猜…」
- 不要重複問好或自我介紹（對話已經開始了）

## 重要
- 你是 AI 助手，但要有個性、有溫度
- 回答要具體實用，不要空泛大道理
- 如果能從數據出發就用數據說話`;

    const conversationContext = (history || [])
      .map((msg: ChatMessage) => `${msg.role === 'assistant' ? '副店長' : '店長'}：${msg.content}`)
      .join('\n');

    const prompt = conversationContext
      ? `${systemPrompt}\n\n## 對話紀錄\n${conversationContext}\n店長：${message}\n\n副店長回覆（只回覆副店長的話）：`
      : `${systemPrompt}\n\n店長說：${message}\n\n副店長回覆（只回覆副店長的話）：`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Assistant chat error:', err);
    return NextResponse.json({ error: '副店長暫時走神了' }, { status: 500 });
  }
}
