import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// POST: AI 洞察分析 — 分析問卷回覆，產出洞察報告
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

    // 撈取店家的問卷
    const { data: surveys } = await db
      .from('surveys')
      .select('id, title, questions')
      .eq('store_id', store.id);

    if (!surveys || surveys.length === 0) {
      return NextResponse.json({
        summary: '尚未建立任何問卷',
        issues: [],
        highlights: [],
        recommendations: [],
        kpi: { total_conversations: 0, avg_sentiment: 0.5, top_topics: [], response_rate_change: '無資料' },
      });
    }

    const surveyIds = surveys.map(s => s.id);
    const surveyMap = new Map(surveys.map(s => [s.id, s]));

    // 撈取期間內的問卷回覆
    const { data: responses } = await db
      .from('responses')
      .select('id, survey_id, respondent_name, answers, submitted_at, xp_earned')
      .in('survey_id', surveyIds)
      .gte('submitted_at', periodStart.toISOString())
      .lte('submitted_at', periodEnd.toISOString())
      .order('submitted_at', { ascending: false });

    if (!responses || responses.length === 0) {
      return NextResponse.json({
        summary: '這段期間沒有收到任何問卷回覆',
        issues: [],
        highlights: [],
        recommendations: [],
        kpi: { total_conversations: 0, avg_sentiment: 0.5, top_topics: [], response_rate_change: '無資料' },
      });
    }

    // 整理回覆摘要給 AI 分析
    const responseSummaries = responses.map(r => {
      const survey = surveyMap.get(r.survey_id);
      const questions = (survey?.questions || []) as Array<{ id: string; type: string; title: string; options?: string[] }>;
      const answerDetails: Record<string, string> = {};

      for (const q of questions) {
        const val = r.answers?.[q.id];
        if (val !== undefined && val !== null && val !== '') {
          answerDetails[q.title] = Array.isArray(val) ? val.join(', ') : String(val);
        }
      }

      return {
        survey_title: survey?.title || '未知問卷',
        respondent: r.respondent_name || '匿名',
        date: r.submitted_at,
        answers: answerDetails,
      };
    });

    // 計算整體評分
    let totalScore = 0;
    let totalVotes = 0;
    for (const survey of surveys) {
      const qs = (survey.questions || []) as Array<{ id: string; type: string }>;
      const ratingQIds = qs.filter(q => q.type === 'rating' || q.type === 'emoji-rating').map(q => q.id);
      for (const r of responses) {
        if (r.survey_id !== survey.id) continue;
        for (const qId of ratingQIds) {
          const v = Number(r.answers?.[qId]);
          if (!isNaN(v) && v > 0) {
            totalScore += v;
            totalVotes++;
          }
        }
      }
    }
    const avgRating = totalVotes > 0 ? totalScore / totalVotes : 0;
    // Convert 1-5 rating to 0-1 sentiment
    const avgSentiment = totalVotes > 0 ? (avgRating - 1) / 4 : 0.5;

    // AI 深度分析
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(
      `你是餐廳經營分析師。請分析以下問卷回覆資料，產出洞察報告。

## 店家：${store.store_name}
## 分析期間：${periodStart.toLocaleDateString('zh-TW')} ~ ${periodEnd.toLocaleDateString('zh-TW')}
## 回覆數量：${responses.length} 筆
## 平均評分：${avgRating > 0 ? avgRating.toFixed(1) + ' / 5' : '無評分資料'}

## 問卷回覆明細
${JSON.stringify(responseSummaries, null, 2)}

## 請產出以下 JSON 格式的分析報告

{
  "summary": "一段話總結本期回覆狀況（包含數量、整體滿意度、關鍵發現）",
  "issues": [
    {
      "title": "問題標題",
      "frequency": 被提及次數,
      "severity": "low/medium/high/critical",
      "sentiment_avg": 0.0~1.0,
      "root_cause_guess": "推測的根本原因",
      "affected_areas": ["受影響的區域"],
      "customer_quotes": ["具代表性的客戶回答（最多3句）"],
      "proposed_fix": "建議的改善方案"
    }
  ],
  "highlights": [
    {
      "title": "正面亮點",
      "frequency": 被提及次數,
      "customer_quotes": ["客戶回答原文"]
    }
  ],
  "recommendations": [
    {
      "priority": "high/medium/low",
      "action": "具體的改善行動",
      "expected_impact": "預期效果",
      "effort": "實施難度 easy/medium/hard"
    }
  ],
  "kpi": {
    "total_conversations": ${responses.length},
    "avg_sentiment": ${avgSentiment.toFixed(2)},
    "top_topics": ["從回答中歸納出的熱門話題，最多5個"],
    "response_rate_change": "趨勢描述"
  }
}

注意：
- 如果回覆中有文字回答，仔細分析其中的正面/負面訊號
- 如果只有數字評分，根據分數高低判斷滿意/不滿意的面向
- issues 和 highlights 至少各列出一項（即使要從評分推斷）
- 只回覆 JSON，不要其他文字。確保 JSON 合法。`
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
      recommendations: analysis.recommendations,
      conversation_count: responses.length,
      avg_sentiment: analysis.kpi?.avg_sentiment ?? avgSentiment,
    });

    return NextResponse.json(analysis);
  } catch (err) {
    console.error('Feedback analyze error:', err);
    return NextResponse.json({ error: '分析處理失敗' }, { status: 500 });
  }
}

// GET: 取得歷史洞察報告，或查詢實際回覆數量
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const db = createServiceSupabase();
    const { searchParams } = new URL(request.url);

    // ?check=count → 回傳實際問卷回覆數量
    if (searchParams.get('check') === 'count') {
      const { data: surveys } = await db
        .from('surveys')
        .select('id')
        .eq('store_id', store.id);

      if (!surveys || surveys.length === 0) {
        return NextResponse.json({ count: 0 });
      }

      const { count } = await db
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .in('survey_id', surveys.map(s => s.id));

      return NextResponse.json({ count: count || 0 });
    }

    // 預設：取得歷史洞察報告
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
