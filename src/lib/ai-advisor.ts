// src/lib/ai-advisor.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Memory {
  category: string;
  subject: string | null;
  content: string;
  confidence: number;
}

export interface StoreContext {
  memories: Memory[];
  knowledgeSnippets: string[];
  domainKnowledge: string[];  // Mode B — 行業知識庫
  recentTrend: {
    last7DaysCount: number;
    avgRating: number | null;
    lowScoreTopics: string[];
  };
  unresolvedReportCount: number;
}

// ─── Mode B: Domain Knowledge（行業知識庫）───────────────────────────────────

/**
 * 初始化種子知識（第一次執行後跳過）
 */
export async function initDomainKnowledge(db: SupabaseClient): Promise<void> {
  const { count } = await db
    .from('domain_knowledge')
    .select('*', { count: 'exact', head: true })
    .eq('project', 'feedbites');

  if ((count ?? 0) > 0) return; // 已初始化

  const { seeds } = await import('./domain-knowledge-seed');
  await db.from('domain_knowledge').insert(seeds);
}

/**
 * 載入行業知識（依月份優先排序，最多 15 筆）
 */
export async function loadDomainKnowledge(db: SupabaseClient): Promise<string[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from('domain_knowledge')
    .select('category, subject, content')
    .eq('project', 'feedbites')
    .or(`valid_until.is.null,valid_until.gte.${today}`)
    .order('confidence', { ascending: false })
    .limit(15);

  return (data || []).map(
    (d: { category: string; subject: string | null; content: string }) =>
      `[${d.category}] ${d.subject ? d.subject + '：' : ''}${d.content}`
  );
}

// ─── loadStoreContext ────────────────────────────────────────────────────────

export async function loadStoreContext(
  storeId: string,
  db: SupabaseClient
): Promise<StoreContext> {
  const [memoriesRes, knowledgeRes, surveysRes, reportsRes, domainKnowledge] = await Promise.all([
    db
      .from('ai_memories')
      .select('category, subject, content, confidence')
      .eq('store_id', storeId)
      .order('confidence', { ascending: false })
      .limit(30),
    db
      .from('store_knowledge')
      .select('content')
      .eq('store_id', storeId)
      .limit(8),
    db
      .from('surveys')
      .select('id, questions')
      .eq('store_id', storeId),
    db
      .from('feedback_reports')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'open'),
    loadDomainKnowledge(db),
  ]);

  const memories: Memory[] = (memoriesRes.data || []).map((m) => ({
    category: m.category,
    subject: m.subject,
    content: m.content,
    confidence: m.confidence,
  }));

  const knowledgeSnippets = (knowledgeRes.data || [])
    .map((k: { content: unknown }) => String(k.content).slice(0, 200));

  const surveyIds = (surveysRes.data || []).map((s: { id: string }) => s.id);
  const qMap = new Map(
    (surveysRes.data || []).map((s: { id: string; questions: unknown }) => [
      s.id,
      (s.questions as Array<{ id: string; text: string; type: string }>) || [],
    ])
  );

  let last7DaysCount = 0;
  let avgRating: number | null = null;
  const lowScoreTopics: string[] = [];

  if (surveyIds.length > 0) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [recentCountRes, recentResponsesRes] = await Promise.all([
      db
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .in('survey_id', surveyIds)
        .gte('submitted_at', sevenDaysAgo),
      db
        .from('responses')
        .select('answers, survey_id')
        .in('survey_id', surveyIds)
        .order('submitted_at', { ascending: false })
        .limit(50),
    ]);

    last7DaysCount = recentCountRes.count || 0;

    const qSums: Record<string, { sum: number; cnt: number; text: string }> = {};
    for (const r of (recentResponsesRes.data || []) as Array<{ answers: Record<string, unknown>; survey_id: string }>) {
      const qs = qMap.get(r.survey_id) || [];
      for (const q of qs) {
        if (q.type === 'rating' || q.type === 'emoji-rating') {
          const v = Number(r.answers?.[q.id]);
          if (!isNaN(v) && v >= 1 && v <= 5) {
            if (!qSums[q.id]) qSums[q.id] = { sum: 0, cnt: 0, text: q.text };
            qSums[q.id].sum += v;
            qSums[q.id].cnt += 1;
          }
        }
      }
    }

    let totalSum = 0, totalCnt = 0;
    for (const [, val] of Object.entries(qSums)) {
      const qAvg = val.sum / val.cnt;
      totalSum += val.sum;
      totalCnt += val.cnt;
      if (qAvg < 3.5 && val.cnt >= 3) {
        lowScoreTopics.push(`「${val.text}」(平均 ${qAvg.toFixed(1)} 分)`);
      }
    }
    if (totalCnt > 0) avgRating = Math.round((totalSum / totalCnt) * 10) / 10;
  }

  return {
    memories,
    knowledgeSnippets,
    domainKnowledge,
    recentTrend: { last7DaysCount, avgRating, lowScoreTopics },
    unresolvedReportCount: reportsRes.count || 0,
  };
}

// ─── buildAdvisorPrompt ──────────────────────────────────────────────────────

export function buildAdvisorPrompt(
  storeName: string,
  context: StoreContext,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentPage: string,
  message: string
): string {
  const memoriesBlock = context.memories.length > 0
    ? `\n## 你記得的事（過去對話累積）\n${context.memories
        .map((m) => `- [${m.category}] ${m.subject ? m.subject + '：' : ''}${m.content}`)
        .join('\n')}`
    : '';

  const knowledgeBlock = context.knowledgeSnippets.length > 0
    ? `\n## 店家資料\n${context.knowledgeSnippets.join('\n')}`
    : '';

  const domainKnowledgeBlock = context.domainKnowledge.length > 0
    ? `\n## 行業知識庫（台灣餐飲業）\n${context.domainKnowledge.map((d) => `- ${d}`).join('\n')}`
    : '';

  const { last7DaysCount, avgRating, lowScoreTopics } = context.recentTrend;
  let trendBlock = `\n## 近況數據\n- 過去 7 天收到 ${last7DaysCount} 筆回饋`;
  if (avgRating !== null) trendBlock += `，平均評分 ${avgRating} 分`;
  if (lowScoreTopics.length > 0) trendBlock += `\n- 低分項目：${lowScoreTopics.join('、')}`;
  if (context.unresolvedReportCount > 0)
    trendBlock += `\n- 有 ${context.unresolvedReportCount} 筆回報未處理`;

  const historyBlock = history.length > 0
    ? `\n## 對話紀錄\n${history
        .slice(-10)
        .map((h) => `${h.role === 'user' ? '店長' : '副店長'}：${h.content}`)
        .join('\n')}`
    : '';

  const turnCount = history.filter((h) => h.role === 'user').length;
  const proactiveInstruction = turnCount > 0 && turnCount % 4 === 0
    ? '\n## 這一輪請主動提出一個業績相關問題或建議（不要每次問，只這一輪）。'
    : '';

  // 每 5 輪主動分享行業洞察
  const industryInsightInstruction = turnCount > 0 && turnCount % 5 === 0
    ? '\n## 行業洞察提醒：這一輪請從行業知識庫中挑一條與當前情境最相關的洞察，用「對了，根據...」的方式自然帶入對話。'
    : '';

  return `你是 FeedBites 的副店長 AI，是「${storeName}」的餐飲經營顧問老朋友。

## 你的身份
- 認識這家店很久了，熟悉他們的客戶群和問題
- 真正懂餐飲業，知道開店的辛苦
- 根據數據給具體建議，語氣像跟老朋友聊天
- 關心業績、顧客喜好、問卷狀況、未處理回報${memoriesBlock}${knowledgeBlock}${domainKnowledgeBlock}${trendBlock}

## 當前頁面：${currentPage || '未知'}${historyBlock}${proactiveInstruction}${industryInsightInstruction}

## 主動行為指示（Mode B — 行業智能）
- 對話中適時帶出相關行業知識，用「對了，根據台灣餐飲業的狀況...」等方式自然引入
- 若店家數據有異常（評分低、回饋少），對照行業知識給出有依據的解釋
- 不要只回答問題，要主動給出行業視角的補充建議

## 語氣規範
- 自然口語，2-4 句話，精簡有力
- 適度用 emoji（不超過 2 個）
- 從數據出發說話，不要空泛大道理
- 不確定就說「我猜...」，不要硬掰

店長：${message}

副店長回覆（只回覆副店長的話，不要重複店長說的）：`;
}

// ─── extractMemories ─────────────────────────────────────────────────────────

export async function extractMemories(
  userMessage: string,
  aiReply: string,
  storeId: string,
  db: SupabaseClient
): Promise<void> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `從以下對話中，萃取值得長期記憶的新事實（只要明確說出的事，不要推測）。
分類：customer（顧客偏好）、performance（業績）、survey（問卷趨勢）、preference（店長習慣）、general（其他）。

店長說：${userMessage}
副店長說：${aiReply}

輸出 JSON 陣列（無新事實回傳 []）：
[{"category":"...", "subject":"主題或null", "content":"一句話事實"}]
只輸出 JSON，不要其他文字。`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const raw = result.response.text().trim();
    const newMems: Array<{ category: string; subject: string | null; content: string }> =
      JSON.parse(raw);

    for (const mem of newMems) {
      if (!mem.content || mem.content.length < 5) continue;

      const { data: existing } = await db
        .from('ai_memories')
        .select('id, confidence')
        .eq('store_id', storeId)
        .eq('category', mem.category)
        .ilike('content', `%${mem.content.slice(0, 15)}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        await db
          .from('ai_memories')
          .update({
            confidence: (existing[0] as { id: string; confidence: number }).confidence + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (existing[0] as { id: string; confidence: number }).id);
      } else {
        await db.from('ai_memories').insert({
          store_id: storeId,
          category: mem.category,
          subject: mem.subject ?? null,
          content: mem.content,
          confidence: 1,
        });
      }
    }
  } catch {
    // 記憶萃取失敗不影響主流程
  }
}

// ─── persistChatTurn ─────────────────────────────────────────────────────────

export async function persistChatTurn(
  storeId: string,
  userMessage: string,
  aiReply: string,
  db: SupabaseClient
): Promise<void> {
  await db.from('assistant_chat_history').insert([
    { store_id: storeId, role: 'user', content: userMessage },
    { store_id: storeId, role: 'assistant', content: aiReply },
  ]);

  // 保留最近 50 筆
  const { data: old } = await db
    .from('assistant_chat_history')
    .select('id')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .range(50, 9999);

  if (old && old.length > 0) {
    await db
      .from('assistant_chat_history')
      .delete()
      .in('id', (old as Array<{ id: string }>).map((r) => r.id));
  }
}
