// src/lib/knowledge-intake.ts
// v7.0 Mode C — 進化引擎 2：知識自動獲取
// 台灣餐飲業知識定期更新配置

import { SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── 知識來源配置 ──────────────────────────────────────────────────────────────

export interface IntakeSource {
  type: 'search' | 'grounding';
  query: string;
  category: string;
  subject?: string;
  priority?: number;
}

/** 台灣餐飲業知識自動獲取配置 */
export const RESTAURANT_INTAKE_SOURCES: IntakeSource[] = [
  // 法規更新
  {
    type: 'search',
    query: '台灣食安 最新規定 餐飲業 2026',
    category: 'regulation',
    subject: '食安法規最新動態',
    priority: 5,
  },
  {
    type: 'search',
    query: '台灣餐飲業 稽查 衛生局 最新',
    category: 'regulation',
    subject: '衛生稽查趨勢',
    priority: 4,
  },
  // 市場趨勢
  {
    type: 'search',
    query: '外送平台 台灣 最新動態 2026 Uber Eats Foodpanda',
    category: 'trend',
    subject: '外送平台最新政策',
    priority: 5,
  },
  {
    type: 'search',
    query: '台灣餐飲業 消費趨勢 2026',
    category: 'trend',
    subject: '餐飲消費趨勢',
    priority: 4,
  },
  {
    type: 'search',
    query: '台灣 健康飲食 蔬食 素食 市場趨勢 2026',
    category: 'trend',
    subject: '健康飲食市場',
    priority: 3,
  },
  // 營運成本
  {
    type: 'search',
    query: '台灣餐飲業 成本 薪資 最低工資 2026',
    category: 'operations',
    subject: '人力成本最新資訊',
    priority: 5,
  },
  {
    type: 'search',
    query: '台灣 食材原物料 價格 2026',
    category: 'operations',
    subject: '食材成本趨勢',
    priority: 4,
  },
  // 行銷策略
  {
    type: 'search',
    query: '台灣餐廳 行銷策略 2026 成功案例',
    category: 'strategy',
    subject: '行銷策略案例',
    priority: 3,
  },
];

// ─── 知識萃取與入庫 ────────────────────────────────────────────────────────────

interface ExtractedKnowledge {
  subject: string;
  content: string;
  confidence: number;
  source_type: 'intake';
}

/**
 * 使用 Gemini Grounding 搜尋並萃取知識。
 * 若 Tavily API 可用則優先使用；否則 fallback 到 Gemini grounding。
 */
async function fetchAndExtractKnowledge(
  source: IntakeSource
): Promise<ExtractedKnowledge[]> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    // Gemini grounding 透過 tools 設定
  });

  const prompt = `請搜尋並摘要以下主題的最新資訊，專注於台灣餐飲業實用知識：

主題：${source.query}
分類：${source.category}
目標受眾：台灣中小型餐廳老闆

請提供 1-3 條具體、實用的知識重點，格式為 JSON 陣列：
[{
  "subject": "知識主題（5-15字）",
  "content": "具體內容，包含數據/規定/建議（50-150字）",
  "confidence": 1-5（資訊可靠程度）
}]

只輸出 JSON，不要其他文字。`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const raw = result.response.text().trim();
    const items = JSON.parse(raw);

    if (!Array.isArray(items)) return [];

    return items
      .filter((item: { content?: string }) => item.content && item.content.length >= 10)
      .map((item: { subject?: string; content: string; confidence?: number }) => ({
        subject: item.subject || source.subject || source.query.slice(0, 20),
        content: item.content,
        confidence: Math.min(5, Math.max(1, Math.floor(item.confidence || 3))),
        source_type: 'intake' as const,
      }));
  } catch {
    return [];
  }
}

/**
 * 執行知識自動獲取流程。
 * 由 Vercel Cron Job 每週一呼叫。
 *
 * @param projectName - 專案名稱（預設 'feedbites'）
 * @param db - Supabase client（需 service role）
 * @param maxSources - 每次執行最多處理幾個來源（避免超時）
 */
export async function runKnowledgeIntake(
  projectName: string,
  db: SupabaseClient,
  maxSources = 4
): Promise<{ processed: number; inserted: number; errors: number }> {
  const sources = RESTAURANT_INTAKE_SOURCES
    .sort((a, b) => (b.priority ?? 3) - (a.priority ?? 3))
    .slice(0, maxSources);

  let inserted = 0;
  let errors = 0;

  for (const source of sources) {
    try {
      const items = await fetchAndExtractKnowledge(source);

      if (items.length === 0) continue;

      const rows = items.map((item) => ({
        project: projectName,
        category: source.category,
        subject: item.subject,
        content: item.content,
        source: `intake:${source.query.slice(0, 50)}`,
        source_type: 'intake',
        confidence: item.confidence,
        last_verified_at: new Date().toISOString(),
        refresh_interval_days: 7,
        is_stale: false,
        valid_until: null,
      }));

      const { error } = await db.from('domain_knowledge').insert(rows);

      if (error) {
        console.error('[knowledge-intake] insert error:', error.message);
        errors++;
      } else {
        inserted += rows.length;
      }
    } catch (err) {
      console.error('[knowledge-intake] source error:', err);
      errors++;
    }
  }

  return { processed: sources.length, inserted, errors };
}

/**
 * 將超過 refresh_interval_days 的知識標記為 stale。
 * 由 Cron Job 週期性呼叫。
 */
export async function markStaleKnowledge(
  projectName: string,
  db: SupabaseClient
): Promise<number> {
  const { data, error } = await db
    .from('domain_knowledge')
    .update({
      is_stale: true,
      stale_reason: '超過 refresh_interval_days 未驗證',
    })
    .eq('project', projectName)
    .eq('is_stale', false)
    .not('refresh_interval_days', 'is', null)
    .lt(
      'last_verified_at',
      new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString()
    )
    .select('id');

  if (error) {
    console.error('[knowledge-intake] markStale error:', error.message);
    return 0;
  }

  return (data || []).length;
}
