import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// POST: AI 情報分析 — 分析一段時間的回饋對話，產出洞察報告
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { days = 7 } = await request.json();
    const db = createServiceSupabase();

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);

    // 撈取這段期間的所有對話 + 訊息
    const { data: conversations } = await db
      .from('feedback_conversations')
      .select('*, feedback_messages(*)')
      .eq('store_id', store.id)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString())
      .order('created_at', { ascending: false });

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        summary: '這段期間沒有收到任何回饋對話',
        issues: [],
        self_review: { what_worked: '', what_failed: '', improvement_plan: '' },
        recommendations: [],
        conversation_count: 0,
      });
    }

    // 也撈取舊的回報（現有 feedback_reports 表）
    const { data: legacyReports } = await db
      .from('feedback_reports')
      .select('title, description, category, priority, status')
      .eq('store_id', store.id)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString());

    // 整理對話摘要（RAG 原則：只送必要片段給 AI）
    const conversationSummaries = conversations.map((conv: Record<string, unknown>) => {
      const messages = (conv.feedback_messages as Array<{ role: string; content: string }>) || [];
      const customerMsgs = messages
        .filter((m) => m.role === 'customer')
        .map((m) => m.content);
      return {
        id: conv.id,
        sentiment: conv.sentiment_score,
        topics: conv.topics,
        severity: conv.severity,
        customer_said: customerMsgs.join(' | '),
        date: conv.created_at,
      };
    });

    const legacySummaries = (legacyReports || []).map((r: Record<string, unknown>) => ({
      title: r.title,
      description: r.description,
      category: r.category,
      priority: r.priority,
    }));

    // AI 深度分析
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(
      `你是餐廳經營分析師。請分析以下客戶回饋資料，產出一份全面的情報報告。

## 分析期間
${periodStart.toLocaleDateString('zh-TW')} ~ ${periodEnd.toLocaleDateString('zh-TW')}

## 對話式回饋 (${conversationSummaries.length} 筆)
${JSON.stringify(conversationSummaries, null, 2)}

## 傳統回報 (${legacySummaries.length} 筆)
${JSON.stringify(legacySummaries, null, 2)}

## 請產出以下 JSON 格式的分析報告

{
  "summary": "一段話總結本期回饋狀況（包含數量、整體情緒、關鍵發現）",
  "issues": [
    {
      "title": "問題標題",
      "frequency": 被提及次數,
      "severity": "low/medium/high/critical",
      "sentiment_avg": 0.0~1.0,
      "root_cause_guess": "推測的根本原因",
      "affected_areas": ["受影響的區域"],
      "customer_quotes": ["具代表性的客戶原話（最多3句）"],
      "proposed_fix": "建議的改善方案"
    }
  ],
  "highlights": [
    {
      "title": "正面亮點",
      "frequency": 被提及次數,
      "customer_quotes": ["客戶原話"]
    }
  ],
  "self_review": {
    "what_worked": "回饋收集過程中哪些做得好（例如：對話式收集讓客戶更願意分享）",
    "what_failed": "哪些收集方式效果不佳或有盲點",
    "improvement_plan": "下一期的收集策略調整建議"
  },
  "recommendations": [
    {
      "priority": "high/medium/low",
      "action": "具體的改善行動",
      "expected_impact": "預期效果",
      "effort": "實施難度 easy/medium/hard"
    }
  ],
  "kpi": {
    "total_conversations": 總對話數,
    "avg_sentiment": 平均情緒分數,
    "top_topics": ["最常被提到的話題"],
    "response_rate_change": "與上期相比的變化描述"
  }
}

只回覆 JSON，不要其他文字。確保 JSON 合法。`
    );

    const text = result.response.text().replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return NextResponse.json({ error: '分析失敗：AI 回覆格式異常' }, { status: 500 });
    }

    const analysis = JSON.parse(match[0]);

    // 儲存洞察報告
    await db.from('feedback_insights').insert({
      store_id: store.id,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      summary: analysis.summary,
      issues: analysis.issues,
      self_review: analysis.self_review,
      recommendations: analysis.recommendations,
      conversation_count: conversations.length,
      avg_sentiment: analysis.kpi?.avg_sentiment,
    });

    // 標記已分析的對話
    const convIds = conversations.map((c: Record<string, unknown>) => c.id);
    await db.from('feedback_conversations')
      .update({ status: 'analyzed' })
      .in('id', convIds)
      .eq('status', 'new');

    return NextResponse.json(analysis);
  } catch (err) {
    console.error('Feedback analyze error:', err);
    return NextResponse.json({ error: '分析處理失敗' }, { status: 500 });
  }
}

// GET: 取得歷史洞察報告
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const db = createServiceSupabase();
    const { data: insights } = await db
      .from('feedback_insights')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json(insights || []);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
