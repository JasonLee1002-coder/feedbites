import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

// POST: 產出結構化報告（可寫入 REPORTS.md 格式 + 觸發 LINE 通知）
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { insightId, notifyLine = false } = await request.json();
    const db = createServiceSupabase();

    // 取得最新的洞察報告（或指定 ID）
    let insight;
    if (insightId) {
      const { data } = await db
        .from('feedback_insights')
        .select('*')
        .eq('id', insightId)
        .single();
      insight = data;
    } else {
      const { data } = await db
        .from('feedback_insights')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      insight = data;
    }

    if (!insight) {
      return NextResponse.json({ error: '找不到分析報告，請先執行分析' }, { status: 404 });
    }

    // 產出 Markdown 格式報告
    const issues = insight.issues as Array<{
      title: string;
      frequency: number;
      severity: string;
      root_cause_guess: string;
      proposed_fix: string;
      customer_quotes: string[];
    }>;
    const selfReview = insight.self_review as {
      what_worked: string;
      what_failed: string;
      improvement_plan: string;
    };
    const recommendations = insight.recommendations as Array<{
      priority: string;
      action: string;
      expected_impact: string;
      effort: string;
    }>;

    const periodStart = new Date(insight.period_start).toLocaleDateString('zh-TW');
    const periodEnd = new Date(insight.period_end).toLocaleDateString('zh-TW');

    const reportMd = `## 回報精靈情報報告
**期間**: ${periodStart} ~ ${periodEnd}
**對話數**: ${insight.conversation_count} | **平均情緒**: ${insight.avg_sentiment ? (insight.avg_sentiment * 100).toFixed(0) + '%' : 'N/A'} 正面

### 摘要
${insight.summary}

### 待解決問題
${issues.map((issue, i) => `
${i + 1}. **${issue.title}** (${issue.severity} / 提及 ${issue.frequency} 次)
   - 根因推測：${issue.root_cause_guess}
   - 建議改善：${issue.proposed_fix}
   - 客戶原話：${(issue.customer_quotes || []).map(q => `「${q}」`).join('、')}`).join('\n')}

### 自我檢討
- ✅ 做得好：${selfReview.what_worked}
- ❌ 待改善：${selfReview.what_failed}
- 📋 下期計畫：${selfReview.improvement_plan}

### 改善建議
${(recommendations || []).map((rec, i) =>
  `${i + 1}. [${rec.priority}] ${rec.action} → ${rec.expected_impact} (${rec.effort})`
).join('\n')}

---
*由回報精靈自動產出 · ${new Date().toLocaleDateString('zh-TW')}*
`;

    // LINE 通知（如果啟用）
    let lineNotified = false;
    if (notifyLine) {
      try {
        const highIssues = issues.filter(i => i.severity === 'high' || i.severity === 'critical');
        const lineMessage = [
          `🔔 回報精靈情報報告`,
          `📅 ${periodStart}~${periodEnd}`,
          `💬 ${insight.conversation_count} 筆對話`,
          `😊 情緒 ${insight.avg_sentiment ? (insight.avg_sentiment * 100).toFixed(0) + '%' : 'N/A'}`,
          '',
          highIssues.length > 0
            ? `⚠️ ${highIssues.length} 個重要問題：\n${highIssues.map(i => `• ${i.title}`).join('\n')}`
            : '✅ 無重大問題',
          '',
          `詳細報告請至 Dashboard 查看`,
        ].join('\n');

        // 呼叫 Yuzu-san LINE 通知 API（如果有設定）
        const yuzuWebhook = process.env.YUZU_LINE_WEBHOOK_URL;
        if (yuzuWebhook) {
          await fetch(yuzuWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: lineMessage }),
          });
          lineNotified = true;
        }
      } catch {
        // LINE 通知失敗不影響主流程
      }
    }

    return NextResponse.json({
      report: reportMd,
      lineNotified,
      insightId: insight.id,
    });
  } catch (err) {
    console.error('Feedback report error:', err);
    return NextResponse.json({ error: '報告產出失敗' }, { status: 500 });
  }
}
