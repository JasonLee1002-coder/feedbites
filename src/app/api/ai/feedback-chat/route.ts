import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServiceSupabase } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ChatMessage {
  role: 'genie' | 'customer';
  content: string;
}

// POST: 對話式回饋收集 — AI 引導客戶表達意見
export async function POST(request: NextRequest) {
  try {
    const { storeId, storeName, conversationId, sessionId, message, history, source } = await request.json();

    if (!storeId || !message?.trim()) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    const db = createServiceSupabase();
    let convId = conversationId;

    // 建立新對話（首次訊息）
    if (!convId) {
      const { data: conv, error } = await db
        .from('feedback_conversations')
        .insert({
          store_id: storeId,
          session_id: sessionId || crypto.randomUUID(),
          source: source || 'chat',
          metadata: {},
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      convId = conv.id;
    }

    // 儲存客戶訊息
    await db.from('feedback_messages').insert({
      conversation_id: convId,
      role: 'customer',
      content: message.trim(),
    });

    // 用 AI 產生回應
    const chatHistory: ChatMessage[] = history || [];
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `你是「${storeName || '這家餐廳'}」的回報精靈，一個溫暖、有同理心的回饋收集助手。

## 你的核心任務
透過自然對話，智慧收集客戶的真實感受和建議。你不是冷冰冰的問卷機器人，而是真正關心客戶體驗的傾聽者。

## 對話策略（RAG 原則：按需引導，不要一次問太多）
1. **開場**：感謝 + 一個開放式問題（不要問「有什麼問題嗎」這種封閉式問題）
2. **傾聽**：客戶說什麼就順著深入，不要急著轉話題
3. **追問**：根據客戶回答，自然追問 1-2 個關鍵細節（時間、地點、頻率、對比）
4. **共情**：對負面回饋表達理解，對正面回饋表達感謝，語氣真誠不敷衍
5. **收網**：3-5 輪對話後，溫和收尾，感謝並告知會改善

## 收集維度（內部分析用，不要直接問客戶這些）
- 情緒：正面/中性/負面，強度
- 主題：餐點品質、服務速度、環境、價格、其他
- 具體細節：菜名、時間、人員、場景
- 再訪意願：暗示性的了解

## 語氣規範
- 像朋友聊天，不像客服機器人
- 用口語化中文，適度使用 emoji（不超過 2 個/訊息）
- 每次回覆控制在 2-3 句話，不要長篇大論
- 如果客戶說「沒了」或「就這樣」，就優雅收尾

## 自我改善意識
- 如果客戶答非所問或明顯不耐煩，立即調整策略
- 不要重複問已經回答過的問題
- 記住對話脈絡，展現你真的在聽`;

    const conversationContext = chatHistory
      .map((msg: ChatMessage) => `${msg.role === 'genie' ? '精靈' : '客戶'}：${msg.content}`)
      .join('\n');

    const prompt = conversationContext
      ? `${systemPrompt}\n\n## 目前的對話紀錄\n${conversationContext}\n客戶：${message}\n\n請以精靈身份回覆（只回覆精靈的話，不要加角色標籤）：`
      : `${systemPrompt}\n\n客戶剛剛說：${message}\n\n請以精靈身份回覆（只回覆精靈的話，不要加角色標籤）：`;

    const result = await model.generateContent(prompt);
    const genieReply = result.response.text().trim();

    // 儲存精靈回應
    await db.from('feedback_messages').insert({
      conversation_id: convId,
      role: 'genie',
      content: genieReply,
    });

    // 即時情緒分析（輕量，不阻塞）
    analyzeSentimentAsync(db, convId, message, chatHistory);

    return NextResponse.json({
      conversationId: convId,
      reply: genieReply,
    });
  } catch (err) {
    console.error('Feedback chat error:', err);
    return NextResponse.json({ error: '對話處理失敗' }, { status: 500 });
  }
}

// 非同步情緒分析 — 不阻塞回應
async function analyzeSentimentAsync(
  db: ReturnType<typeof createServiceSupabase>,
  conversationId: string,
  latestMessage: string,
  history: ChatMessage[]
) {
  try {
    const allCustomerMessages = [
      ...history.filter((m: ChatMessage) => m.role === 'customer').map((m: ChatMessage) => m.content),
      latestMessage,
    ].join(' ');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(
      `分析以下客戶回饋的情緒和主題，回覆 JSON：
{"sentiment": 0.0到1.0的數字(0=非常負面, 0.5=中性, 1=非常正面), "topics": ["主題1","主題2"], "severity": "low/medium/high/critical"}

客戶說：${allCustomerMessages}

只回覆 JSON。`
    );

    const text = result.response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const analysis = JSON.parse(match[0]);
      await db.from('feedback_conversations').update({
        sentiment_score: analysis.sentiment,
        topics: analysis.topics,
        severity: analysis.severity,
        updated_at: new Date().toISOString(),
      }).eq('id', conversationId);
    }
  } catch {
    // 分析失敗不影響主流程
  }
}
