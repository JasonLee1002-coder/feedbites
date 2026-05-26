import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';
import {
  loadStoreContext,
  buildAdvisorPrompt,
  extractMemories,
  persistChatTurn,
  initDomainKnowledge,
} from '@/lib/ai-advisor';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { message, history, currentPage } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: '訊息不可為空' }, { status: 400 });
    }

    const db = createServiceSupabase();

    // 確保種子知識已初始化（async，不阻塞主流程）
    initDomainKnowledge(db).catch((e) => console.error('[domain] initDomainKnowledge failed:', e));

    // loadStoreContext 失敗時降級為空 context，AI 仍可正常回答
    const emptyContext: import('@/lib/ai-advisor').StoreContext = {
      memories: [],
      knowledgeSnippets: [],
      domainKnowledge: [],
      recentTrend: { last7DaysCount: 0, avgRating: null, lowScoreTopics: [] },
      unresolvedReportCount: 0,
    };

    const context = await loadStoreContext(store.id, db).catch((e) => {
      console.error('[ctx] loadStoreContext failed:', e);
      return emptyContext;
    });

    const prompt = buildAdvisorPrompt(
      store.store_name || '這家餐廳',
      context,
      (history || []) as ChatMessage[],
      currentPage || '',
      message.trim()
    );

    let reply: string;
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      reply = result.response.text().trim();
    } catch (geminiErr) {
      const msg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
      console.error('[gemini] generateContent failed:', msg);
      // Return a graceful fallback instead of 500
      return NextResponse.json({ reply: `抱歉，我的 AI 服務暫時有點問題（${msg.slice(0, 60)}），等等再問我吧！` });
    }

    if (!reply) {
      return NextResponse.json({ reply: '我剛剛沒想清楚，你再說一次？' });
    }

    Promise.all([
      extractMemories(message.trim(), reply, store.id, db),
      persistChatTurn(store.id, message.trim(), reply, db),
    ]).catch((err) => { console.error('Assistant background task error:', err); });

    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Assistant chat error (outer):', msg);
    return NextResponse.json({ error: '副店長暫時走神了', _debug: msg }, { status: 500 });
  }
}
