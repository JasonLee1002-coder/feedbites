// src/lib/gap-analysis.ts
// v7.0 Mode C — 進化引擎 1：知識空白分析
// fire-and-forget：不阻塞主要 AI 回應

import { SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface KnowledgeGap {
  gap_topic: string;
  priority: number;
  reason: string;
}

/**
 * 分析 AI 回答中的知識空白，寫入 knowledge_gaps 表。
 * fire-and-forget：呼叫後不等待結果，不影響主要回應。
 */
export async function analyzeKnowledgeGaps(
  userQuery: string,
  aiResponse: string,
  domain: string,
  project: string,
  db: SupabaseClient
): Promise<void> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `你是一個知識品質分析師，專門分析 AI 回答中的知識空白。

店長問題：${userQuery}
AI 副店長回答：${aiResponse}
領域：${domain}（台灣餐飲業）

請分析這個 AI 回答，找出以下情況：
1. AI 說「不確定」、「我猜」、「可能」等不確定語氣的主題
2. AI 回答太模糊、缺乏具體數據或案例的主題
3. 問題涉及但 AI 完全沒回答到的面向
4. 需要最新資訊才能回答更好的主題（如法規、市場數據）

輸出 JSON 陣列（無空白則回傳 []），每筆包含：
- gap_topic：知識空白主題（一句話，中文）
- priority：重要程度 1-5（5最高）
- reason：為何是空白（一句話）

只輸出 JSON，不要其他文字。最多 3 筆。`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });

    const raw = result.response.text().trim();
    const gaps: KnowledgeGap[] = JSON.parse(raw);

    if (!Array.isArray(gaps) || gaps.length === 0) return;

    const rows = gaps
      .filter((g) => g.gap_topic && g.gap_topic.length >= 3)
      .map((g) => ({
        project,
        domain,
        gap_topic: g.gap_topic,
        discovery_context: `Q: ${userQuery.slice(0, 200)} | A: ${aiResponse.slice(0, 200)}`,
        priority: Math.min(5, Math.max(1, Math.floor(g.priority || 1))),
        status: 'pending',
      }));

    if (rows.length > 0) {
      await db.from('knowledge_gaps').insert(rows);
    }
  } catch {
    // 空白分析失敗不影響主流程
  }
}
