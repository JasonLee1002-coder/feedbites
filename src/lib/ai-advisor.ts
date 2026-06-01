// src/lib/ai-advisor.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { db as DbType } from '@/lib/db';
import {
  ai_memories,
  store_knowledge,
  surveys,
  feedback_reports,
  dishes,
  responses,
  assistant_chat_history,
  domain_knowledge,
} from '@/lib/db/schema';
import { eq, and, desc, gte, inArray, count } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

type DB = typeof DbType;

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
  dishes: string[];           // 店家菜單摘要
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
export async function initDomainKnowledge(db: DB): Promise<void> {
  const [row] = await db
    .select({ count: count() })
    .from(domain_knowledge)
    .where(eq(domain_knowledge.project, 'feedbites'));

  if ((row?.count ?? 0) > 0) return; // 已初始化

  const { seeds } = await import('./domain-knowledge-seed');
  await db.insert(domain_knowledge).values(seeds);
}

/**
 * 載入行業知識（依月份優先排序，最多 15 筆）
 */
export async function loadDomainKnowledge(db: DB): Promise<string[]> {
  const today = new Date().toISOString().slice(0, 10);
  const data = await db
    .select({
      category: domain_knowledge.category,
      subject: domain_knowledge.subject,
      content: domain_knowledge.content,
    })
    .from(domain_knowledge)
    .where(
      sql`${domain_knowledge.project} = 'feedbites'
        AND ${domain_knowledge.is_stale} = false
        AND (${domain_knowledge.valid_until} IS NULL OR ${domain_knowledge.valid_until} >= ${today})`
    )
    .orderBy(desc(domain_knowledge.confidence))
    .limit(15);

  return data.map(
    (d) => `[${d.category}] ${d.subject ? d.subject + '：' : ''}${d.content}`
  );
}

// ─── loadStoreContext ────────────────────────────────────────────────────────

export async function loadStoreContext(
  storeId: string,
  db: DB
): Promise<StoreContext> {
  const [memoriesData, knowledgeData, surveysData, dishesData, domainKnowledgeData] = await Promise.all([
    db
      .select({
        category: ai_memories.category,
        subject: ai_memories.subject,
        content: ai_memories.content,
        confidence: ai_memories.confidence,
      })
      .from(ai_memories)
      .where(eq(ai_memories.store_id, storeId))
      .orderBy(desc(ai_memories.confidence))
      .limit(30),
    db
      .select({ content: store_knowledge.content })
      .from(store_knowledge)
      .where(eq(store_knowledge.store_id, storeId))
      .limit(8),
    db
      .select({ id: surveys.id, questions: surveys.questions })
      .from(surveys)
      .where(eq(surveys.store_id, storeId)),
    db
      .select({
        name: dishes.name,
        category: dishes.category,
        price: dishes.price,
        description: dishes.description,
      })
      .from(dishes)
      .where(and(eq(dishes.store_id, storeId), eq(dishes.is_active, true)))
      .limit(30),
    loadDomainKnowledge(db),
  ]);

  // Unresolved report count
  const [reportsRow] = await db
    .select({ count: count() })
    .from(feedback_reports)
    .where(and(eq(feedback_reports.store_id, storeId), eq(feedback_reports.status, 'pending')));

  const memories: Memory[] = memoriesData.map((m) => ({
    category: m.category,
    subject: m.subject,
    content: m.content,
    confidence: m.confidence,
  }));

  const knowledgeSnippets = knowledgeData.map((k) =>
    String(k.content).slice(0, 200)
  );

  const surveyIds = surveysData.map((s) => s.id);
  const qMap = new Map(
    surveysData.map((s) => [
      s.id,
      (s.questions as unknown as Array<{ id: string; label?: string; text?: string; type: string }>) || [],
    ])
  );

  let last7DaysCount = 0;
  let avgRating: number | null = null;
  const lowScoreTopics: string[] = [];

  if (surveyIds.length > 0) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [recentCountRow, recentResponsesData] = await Promise.all([
      db
        .select({ count: count() })
        .from(responses)
        .where(and(inArray(responses.survey_id, surveyIds), gte(responses.submitted_at, new Date(sevenDaysAgo)))),
      db
        .select({ answers: responses.answers, survey_id: responses.survey_id })
        .from(responses)
        .where(inArray(responses.survey_id, surveyIds))
        .orderBy(desc(responses.submitted_at))
        .limit(50),
    ]);

    last7DaysCount = recentCountRow[0]?.count ?? 0;

    const qSums: Record<string, { sum: number; cnt: number; text: string }> = {};
    for (const r of recentResponsesData) {
      const qs = qMap.get(r.survey_id) || [];
      const answersObj = r.answers as unknown as Record<string, unknown>;
      for (const q of qs) {
        if (q.type === 'rating' || q.type === 'emoji-rating') {
          const v = Number(answersObj?.[q.id]);
          if (!isNaN(v) && v >= 1 && v <= 5) {
            if (!qSums[q.id]) qSums[q.id] = { sum: 0, cnt: 0, text: q.label || q.text || q.id };
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

  const dishList = dishesData.map(
    (d) =>
      `${d.name}${d.price ? `（$${d.price}）` : ''}${d.description ? `：${d.description.slice(0, 40)}` : ''}`
  );

  return {
    memories,
    knowledgeSnippets,
    domainKnowledge: domainKnowledgeData,
    dishes: dishList,
    recentTrend: { last7DaysCount, avgRating, lowScoreTopics },
    unresolvedReportCount: reportsRow?.count ?? 0,
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

  const dishesBlock = context.dishes && context.dishes.length > 0
    ? `\n## 店家菜單（${context.dishes.length} 道菜）\n${context.dishes.join('、')}`
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

  const industryInsightInstruction = turnCount > 0 && turnCount % 5 === 0
    ? '\n## 行業洞察提醒：這一輪請從行業知識庫中挑一條與當前情境最相關的洞察，用「對了，根據...」的方式自然帶入對話。'
    : '';

  return `你是 FeedBites 的副店長 AI，是「${storeName}」的餐飲經營顧問老朋友。

## 你的身份
- 認識這家店很久了，熟悉他們的客戶群和問題
- 真正懂餐飲業，知道開店的辛苦
- 根據數據給具體建議，語氣像跟老朋友聊天
- 關心業績、顧客喜好、問卷狀況、未處理回報${memoriesBlock}${knowledgeBlock}${dishesBlock}${domainKnowledgeBlock}${trendBlock}

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
  db: DB
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

      const existing = await db
        .select({ id: ai_memories.id, confidence: ai_memories.confidence })
        .from(ai_memories)
        .where(and(
          eq(ai_memories.store_id, storeId),
          eq(ai_memories.category, mem.category),
          sql`${ai_memories.content} ILIKE ${'%' + mem.content.slice(0, 15) + '%'}`
        ))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(ai_memories)
          .set({
            confidence: existing[0].confidence + 1,
            updated_at: new Date(),
          })
          .where(eq(ai_memories.id, existing[0].id));
      } else {
        await db.insert(ai_memories).values({
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
  db: DB
): Promise<void> {
  await db.insert(assistant_chat_history).values([
    { store_id: storeId, role: 'user', content: userMessage },
    { store_id: storeId, role: 'assistant', content: aiReply },
  ]);

  // 保留最近 50 筆 — fetch old rows beyond offset 50 and delete them
  const old = await db
    .select({ id: assistant_chat_history.id })
    .from(assistant_chat_history)
    .where(eq(assistant_chat_history.store_id, storeId))
    .orderBy(desc(assistant_chat_history.created_at))
    .offset(50);

  if (old.length > 0) {
    await db
      .delete(assistant_chat_history)
      .where(inArray(assistant_chat_history.id, old.map((r) => r.id)));
  }
}
