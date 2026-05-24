import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';
import {
  loadStoreContext,
  buildAdvisorPrompt,
  extractMemories,
  persistChatTurn,
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

    // Step-by-step to surface exact error location
    let context;
    try {
      context = await loadStoreContext(store.id, db);
    } catch (e) {
      console.error('[1] loadStoreContext failed:', e);
      return NextResponse.json({ error: '副店長暫時走神了', _debug: 'loadStoreContext: ' + String(e) }, { status: 500 });
    }

    let prompt;
    try {
      prompt = buildAdvisorPrompt(
        store.store_name || '這家餐廳',
        context,
        (history || []) as ChatMessage[],
        currentPage || '',
        message.trim()
      );
    } catch (e) {
      console.error('[2] buildAdvisorPrompt failed:', e);
      return NextResponse.json({ error: '副店長暫時走神了', _debug: 'buildAdvisorPrompt: ' + String(e) }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (e) {
      console.error('[3] Gemini failed:', e);
      return NextResponse.json({ error: '副店長暫時走神了', _debug: 'Gemini: ' + String(e) }, { status: 500 });
    }
    const reply = result.response.text().trim();

    Promise.all([
      extractMemories(message.trim(), reply, store.id, db),
      persistChatTurn(store.id, message.trim(), reply, db),
    ]).catch((err) => { console.error('Assistant background task error:', err); });

    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Assistant chat error:', msg);
    return NextResponse.json({ error: '副店長暫時走神了', _debug: msg }, { status: 500 });
  }
}
