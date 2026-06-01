# 副店長 AI Advisor 升級 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 升級副店長成為真正「越用越聰明」的 AI 顧問 — 跨 session 累積店家洞察記憶、主動關心業績/問卷/回饋趨勢，並在每 3~4 輪自動提出建議。

**Architecture:** 新增 `ai_memories`（每家店獨立長期記憶）與 `assistant_chat_history`（持久化對話）兩張 Supabase table。新的 `src/lib/ai-advisor.ts` 統一負責 context 載入、Gemini prompt 組裝、記憶萃取三件事。`assistant-chat` route 呼叫這些函式並非同步儲存記憶，前端在 `isOpen` 時載入歷史對話記錄。

**Tech Stack:** Next.js 16 App Router, Supabase JS v2, Google Gemini 2.0 Flash, TypeScript

---

## File Map

| 動作 | 路徑 | 責任 |
|------|------|------|
| 新增 | `supabase/migrations/016_ai_advisor.sql` | ai_memories + assistant_chat_history schema |
| 新增 | `src/lib/ai-advisor.ts` | loadStoreContext, extractMemories, buildAdvisorPrompt |
| 修改 | `src/app/api/ai/assistant-chat/route.ts` | 接入 ai-advisor functions |
| 新增 | `src/app/api/ai/assistant-history/route.ts` | GET 最近 20 筆對話記錄 |
| 修改 | `src/components/dashboard/AiAssistant.tsx` | isOpen 時載入歷史，清 messages 邏輯調整 |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/016_ai_advisor.sql`

- [ ] **Step 1: 寫 migration SQL**

```sql
-- 016: AI Advisor — 副店長長期記憶 + 跨 session 對話記錄

-- ai_memories: 每家店獨立學習，越用越聰明
CREATE TABLE ai_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  -- 'customer'（顧客偏好）| 'performance'（業績洞察）
  -- | 'survey'（問卷趨勢）| 'preference'（店長習慣）| 'general'
  subject TEXT,       -- 相關主題（如「午餐時段」「滷肉飯」）
  content TEXT NOT NULL, -- 一句話事實
  confidence INT NOT NULL DEFAULT 1  -- 被不同對話確認次數
);
CREATE INDEX ON ai_memories (store_id, confidence DESC, updated_at DESC);

-- assistant_chat_history: 跨 session 對話記錄（每店保留最近 50 筆）
CREATE TABLE assistant_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  role TEXT NOT NULL,     -- 'user' | 'assistant'
  content TEXT NOT NULL
);
CREATE INDEX ON assistant_chat_history (store_id, created_at DESC);

-- RLS: 只有 store owner/member 可讀寫
ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_chat_history ENABLE ROW LEVEL SECURITY;

-- service role bypass（API routes 用 service client）
CREATE POLICY "service_all_ai_memories" ON ai_memories
  USING (true) WITH CHECK (true);
CREATE POLICY "service_all_chat_history" ON assistant_chat_history
  USING (true) WITH CHECK (true);
```

- [ ] **Step 2: 在 Supabase Dashboard 執行這個 SQL**

登入 Supabase → SQL Editor → 貼上並執行 → 確認兩張 table 都出現在 Table Editor。

---

## Task 2: `src/lib/ai-advisor.ts`

**Files:**
- Create: `src/lib/ai-advisor.ts`

- [ ] **Step 1: 建立檔案，寫 loadStoreContext**

```typescript
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
  knowledgeSnippets: string[];   // store_knowledge content
  recentTrend: {
    last7DaysCount: number;
    avgRating: number | null;
    lowScoreTopics: string[];    // questions with avg < 3.5
  };
  unresolvedReportCount: number;
}

// ─── loadStoreContext ────────────────────────────────────────────────────────

export async function loadStoreContext(
  storeId: string,
  db: SupabaseClient
): Promise<StoreContext> {
  // Parallel fetch all context
  const [memoriesRes, knowledgeRes, surveysRes, reportsRes] = await Promise.all([
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
  ]);

  const memories: Memory[] = (memoriesRes.data || []).map((m) => ({
    category: m.category,
    subject: m.subject,
    content: m.content,
    confidence: m.confidence,
  }));

  const knowledgeSnippets = (knowledgeRes.data || [])
    .map((k) => String(k.content).slice(0, 200));

  // Survey-based trend analysis
  const surveyIds = (surveysRes.data || []).map((s) => s.id);
  const qMap = new Map(
    (surveysRes.data || []).map((s) => [
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

    // Calculate per-question averages
    const qSums: Record<string, { sum: number; cnt: number; text: string }> = {};
    for (const r of recentResponsesRes.data || []) {
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
    recentTrend: { last7DaysCount, avgRating, lowScoreTopics },
    unresolvedReportCount: reportsRes.count || 0,
  };
}
```

- [ ] **Step 2: 加 buildAdvisorPrompt**

加在同一檔案，`loadStoreContext` 之後：

```typescript
// ─── buildAdvisorPrompt ──────────────────────────────────────────────────────

export function buildAdvisorPrompt(
  storeName: string,
  context: StoreContext,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentPage: string,
  message: string
): string {
  // Memories block
  const memoriesBlock = context.memories.length > 0
    ? `\n## 你記得的事（過去對話累積）\n${context.memories
        .map((m) => `- [${m.category}] ${m.subject ? m.subject + '：' : ''}${m.content}`)
        .join('\n')}`
    : '';

  // Knowledge block
  const knowledgeBlock = context.knowledgeSnippets.length > 0
    ? `\n## 店家資料\n${context.knowledgeSnippets.join('\n')}`
    : '';

  // Trend block
  const { last7DaysCount, avgRating, lowScoreTopics } = context.recentTrend;
  let trendBlock = `\n## 近況數據\n- 過去 7 天收到 ${last7DaysCount} 筆回饋`;
  if (avgRating !== null) trendBlock += `，平均評分 ${avgRating} 分`;
  if (lowScoreTopics.length > 0) trendBlock += `\n- 低分項目：${lowScoreTopics.join('、')}`;
  if (context.unresolvedReportCount > 0)
    trendBlock += `\n- 有 ${context.unresolvedReportCount} 筆回報未處理`;

  // Conversation history
  const historyBlock = history.length > 0
    ? `\n## 對話紀錄\n${history
        .slice(-10)
        .map((h) => `${h.role === 'user' ? '店長' : '副店長'}：${h.content}`)
        .join('\n')}`
    : '';

  // Turn count — proactive question every 4 turns
  const turnCount = history.filter((h) => h.role === 'user').length;
  const proactiveInstruction = turnCount > 0 && turnCount % 4 === 0
    ? '\n## 這一輪請主動提出一個業績相關問題或建議（不要每次問，只這一輪）。'
    : '';

  return `你是 FeedBites 的副店長 AI，是「${storeName}」的餐飲經營顧問老朋友。

## 你的身份
- 認識這家店很久了，熟悉他們的客戶群和問題
- 真正懂餐飲業，知道開店的辛苦
- 根據數據給具體建議，語氣像跟老朋友聊天
- 關心業績、顧客喜好、問卷狀況、未處理回報${memoriesBlock}${knowledgeBlock}${trendBlock}

## 當前頁面：${currentPage || '未知'}${historyBlock}${proactiveInstruction}

## 語氣規範
- 自然口語，2-4 句話，精簡有力
- 適度用 emoji（不超過 2 個）
- 從數據出發說話，不要空泛大道理
- 不確定就說「我猜...」，不要硬掰

店長：${message}

副店長回覆（只回覆副店長的話，不要重複店長說的）：`;
}
```

- [ ] **Step 3: 加 extractMemories（非同步記憶萃取）**

加在同一檔案結尾：

```typescript
// ─── extractMemories ─────────────────────────────────────────────────────────

export async function extractMemories(
  userMessage: string,
  aiReply: string,
  storeId: string,
  db: SupabaseClient
): Promise<void> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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

      // Check if similar memory exists → confidence++
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
          .update({ confidence: existing[0].confidence + 1, updated_at: new Date().toISOString() })
          .eq('id', existing[0].id);
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
    // 記憶萃取失敗不影響主流程，靜默忽略
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

  // 保留最近 50 筆，超過自動清理
  const { data: old } = await db
    .from('assistant_chat_history')
    .select('id')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .range(50, 200);

  if (old && old.length > 0) {
    await db.from('assistant_chat_history').delete().in('id', old.map((r) => r.id));
  }
}
```

---

## Task 3: 修改 `assistant-chat/route.ts`

**Files:**
- Modify: `src/app/api/ai/assistant-chat/route.ts`

- [ ] **Step 1: 整個換掉 route.ts**

```typescript
// src/app/api/ai/assistant-chat/route.ts
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

    // 載入店家 context（記憶 + 知識 + 趨勢）
    const context = await loadStoreContext(store.id, db);

    const prompt = buildAdvisorPrompt(
      store.store_name || '這家餐廳',
      context,
      (history || []) as ChatMessage[],
      currentPage || '',
      message.trim()
    );

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();

    // 非同步儲存（不阻塞回應）
    Promise.all([
      extractMemories(message.trim(), reply, store.id, db),
      persistChatTurn(store.id, message.trim(), reply, db),
    ]).catch(() => {});

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Assistant chat error:', err);
    return NextResponse.json({ error: '副店長暫時走神了' }, { status: 500 });
  }
}
```

---

## Task 4: 新增 `assistant-history` route

**Files:**
- Create: `src/app/api/ai/assistant-history/route.ts`

- [ ] **Step 1: 建立新 route**

```typescript
// src/app/api/ai/assistant-history/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ history: [] });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ history: [] });

    const db = createServiceSupabase();
    const { data } = await db
      .from('assistant_chat_history')
      .select('role, content, created_at')
      .eq('store_id', store.id)
      .order('created_at', { ascending: true })
      .limit(20);

    return NextResponse.json({ history: data || [] });
  } catch {
    return NextResponse.json({ history: [] });
  }
}
```

---

## Task 5: 修改 `AiAssistant.tsx` — 載入歷史記錄

**Files:**
- Modify: `src/components/dashboard/AiAssistant.tsx:68-85` (state 區段)
- Modify: `src/components/dashboard/AiAssistant.tsx:113-118` (useEffect 區段)
- Modify: `src/components/dashboard/AiAssistant.tsx:321-324` (pathname change reset)

- [ ] **Step 1: 在 `isOpen` 狀態旁加 `historyLoaded` flag**

找到這行（約 line 68）：
```typescript
const [isOpen, setIsOpen] = useState(false);
```
改成：
```typescript
const [isOpen, setIsOpen] = useState(false);
const [historyLoaded, setHistoryLoaded] = useState(false);
```

- [ ] **Step 2: 加載歷史的 useEffect（加在 assistant-stats fetch 的 useEffect 後面，約 line 118）**

在 `}, []);` 後面加：

```typescript
  // 第一次打開聊天面板時，載入歷史對話記錄
  useEffect(() => {
    if (!isOpen || historyLoaded) return;
    fetch('/api/ai/assistant-history')
      .then((r) => r.ok ? r.json() : { history: [] })
      .then(({ history }) => {
        if (history.length > 0) {
          // 轉換格式：DB role/content → BubbleMessage + chatHistory
          const bubbles = history.map((h: { role: string; content: string }) => ({
            text: h.content,
            role: h.role as 'user' | 'assistant',
          }));
          const chatH = history.map((h: { role: string; content: string }) => ({
            role: h.role as 'user' | 'assistant',
            content: h.content,
          }));
          setMessages(bubbles);
          setChatHistory(chatH);
        }
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, [isOpen, historyLoaded]);
```

- [ ] **Step 3: 路徑切換時不再清空 messages（讓歷史保留）**

找到這段（約 line 321）：
```typescript
  useEffect(() => {
    // Reset messages when page changes (so next open gets fresh context)
    setMessages([]);
  }, [pathname]);
```
改成：
```typescript
  useEffect(() => {
    // 路徑切換時，若還沒互動過就清空頁面提示（不清歷史對話）
    if (!historyLoaded || chatHistory.length === 0) {
      setMessages([]);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
```

---

## Task 6: 驗證 + Commit

- [ ] **Step 1: TypeScript 檢查**

```bash
cd C:\Users\JasonLee\claude_code_projects\Feedbites
npx tsc --noEmit
```
預期：0 errors

- [ ] **Step 2: 手動測試流程**

1. 在 Supabase Dashboard 跑 migration SQL
2. `git push` 等 Vercel 部署
3. 開副店長，傳「我最近午餐客流比較少，有什麼建議？」
4. 換頁面再回來，重開副店長 → 應看到歷史記錄
5. 檢查 Supabase `ai_memories` table → 應有新記錄
6. 再傳一條訊息 → `confidence` 應遞增

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/016_ai_advisor.sql \
        src/lib/ai-advisor.ts \
        src/app/api/ai/assistant-chat/route.ts \
        src/app/api/ai/assistant-history/route.ts \
        src/components/dashboard/AiAssistant.tsx
git commit -m "feat: 副店長升級 — ai_memories 長期記憶 + 跨 session 歷史 + 趨勢洞察主動建議"
```
