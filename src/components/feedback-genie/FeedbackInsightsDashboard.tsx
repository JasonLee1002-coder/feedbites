'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2,
  Loader2, Star, ChevronRight, Zap, Target, BarChart3,
} from 'lucide-react';

interface Issue {
  title: string;
  frequency: number;
  severity: string;
  sentiment_avg: number;
  root_cause_guess: string;
  affected_areas: string[];
  customer_quotes: string[];
  proposed_fix: string;
}

interface Highlight {
  title: string;
  frequency: number;
  customer_quotes: string[];
}

interface Recommendation {
  priority: string;
  action: string;
  expected_impact: string;
  effort: string;
}

interface KPI {
  total_conversations: number;
  avg_sentiment: number;
  top_topics: string[];
  response_rate_change: string;
}

interface AnalysisReport {
  summary: string;
  issues: Issue[];
  highlights: Highlight[];
  recommendations: Recommendation[];
  kpi: KPI;
}

interface Insight {
  id: string;
  period_start: string;
  period_end: string;
  summary: string;
  conversation_count: number;
  avg_sentiment: number;
  created_at: string;
}

const SEVERITY_CONFIG = {
  critical: { color: '#DC2626', label: '嚴重' },
  high: { color: '#EF4444', label: '高' },
  medium: { color: '#F59E0B', label: '中' },
  low: { color: '#6B7280', label: '低' },
};

const PRIORITY_CONFIG = {
  high: { color: '#EF4444', label: '高優先' },
  medium: { color: '#F59E0B', label: '中優先' },
  low: { color: '#6B7280', label: '低優先' },
};

export default function FeedbackInsightsDashboard() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [days, setDays] = useState(7);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
  const [responseCount, setResponseCount] = useState<number | null>(null);

  useEffect(() => { fetchInsights(); fetchResponseCount(); }, []);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/feedback-analyze');
      if (res.ok) setInsights(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  const fetchResponseCount = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/feedback-analyze?check=count');
      if (res.ok) {
        const data = await res.json();
        setResponseCount(data.count ?? 0);
      }
    } catch { /* ignore */ }
  }, []);

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/ai/feedback-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentReport(data);
        fetchInsights();
      }
    } catch { /* ignore */ } finally {
      setAnalyzing(false);
    }
  }

  const sentimentEmoji = (score: number) => {
    if (score >= 0.8) return '😊';
    if (score >= 0.6) return '🙂';
    if (score >= 0.4) return '😐';
    if (score >= 0.2) return '😕';
    return '😞';
  };

  const sentimentColor = (score: number) => {
    if (score >= 0.7) return '#10B981';
    if (score >= 0.4) return '#F59E0B';
    return '#EF4444';
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#E8E2D8] rounded w-64" />
          <div className="h-40 bg-[#E8E2D8] rounded-2xl" />
        </div>
      </div>
    );
  }

  const hasData = currentReport || insights.length > 0;

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#3A3A3A] flex items-center gap-2" style={{ fontFamily: "'Noto Serif TC', serif" }}>
          <Brain className="w-7 h-7 text-[#C5A55A]" />
          AI 洞察分析
        </h1>
        <p className="text-sm text-[#8A8585] mt-1">
          根據顧客回饋，AI 幫你找出問題與亮點
        </p>
      </div>

      {/* 分析控制 — 簡潔一行 */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="px-3 py-2.5 rounded-xl border border-[#E8E2D8] text-sm bg-[#FAF7F2] outline-none focus:border-[#C5A55A]"
          >
            <option value={3}>近 3 天</option>
            <option value={7}>近 7 天</option>
            <option value={14}>近 14 天</option>
            <option value={30}>近 30 天</option>
          </select>

          <motion.button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#C5A55A] to-[#A08735] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {analyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin" />分析中...</>
            ) : (
              <><Brain className="w-4 h-4" />開始分析</>
            )}
          </motion.button>
        </div>
      </div>

      {/* 空狀態 — 根據實際回覆數量顯示不同訊息 */}
      {!hasData && (
        <div className="bg-white rounded-2xl border border-[#E8E2D8] p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-[#C5A55A]/10 flex items-center justify-center mx-auto mb-5">
            <BarChart3 className="w-10 h-10 text-[#C5A55A]" />
          </div>
          {responseCount !== null && responseCount > 0 ? (
            <>
              <h2 className="text-lg font-bold text-[#3A3A3A] mb-2">
                已收到 {responseCount} 筆回覆，來分析看看！
              </h2>
              <p className="text-sm text-[#8A8585] max-w-sm mx-auto">
                選擇分析期間後，點擊「開始分析」，AI 會幫你整理顧客的想法、找出問題與亮點。
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[#3A3A3A] mb-2">還沒有顧客回饋</h2>
              <p className="text-sm text-[#8A8585] max-w-sm mx-auto">
                問卷收到回覆後，點擊「開始分析」，AI 會自動幫你整理顧客的想法與建議。
              </p>
            </>
          )}
        </div>
      )}

      {/* 分析結果 — 一頁式，不分 Tab */}
      {currentReport && (
        <div className="space-y-4">
          {/* AI 摘要 */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
            <h3 className="font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#C5A55A]" />
              AI 摘要
            </h3>
            <p className="text-sm text-[#3A3A3A] leading-relaxed">{currentReport.summary}</p>

            {/* 熱門話題 — 嵌在摘要裡 */}
            {currentReport.kpi?.top_topics?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {currentReport.kpi.top_topics.map((topic, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-[#C5A55A]/10 text-[#A08735] rounded-full text-xs font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}

            {/* KPI 小數字 — 輕量嵌入 */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-[#E8E2D8]">
              <div className="text-center">
                <div className="text-lg font-bold text-[#3A3A3A]">{currentReport.kpi?.total_conversations || 0}</div>
                <div className="text-[11px] text-[#8A8585]">回饋數</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold flex items-center gap-1" style={{ color: sentimentColor(currentReport.kpi?.avg_sentiment || 0.5) }}>
                  {((currentReport.kpi?.avg_sentiment || 0.5) * 100).toFixed(0)}%
                  <span className="text-base">{sentimentEmoji(currentReport.kpi?.avg_sentiment || 0.5)}</span>
                </div>
                <div className="text-[11px] text-[#8A8585]">平均情緒</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#EF4444]">{currentReport.issues?.length || 0}</div>
                <div className="text-[11px] text-[#8A8585]">問題</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#10B981]">{currentReport.highlights?.length || 0}</div>
                <div className="text-[11px] text-[#8A8585]">亮點</div>
              </div>
            </div>
          </div>

          {/* 問題列表 */}
          {currentReport.issues?.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
              <h3 className="font-bold text-[#3A3A3A] mb-4 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-[#EF4444]" />
                待改善 ({currentReport.issues.length})
              </h3>
              <div className="space-y-2">
                {currentReport.issues.map((issue, i) => {
                  const sConfig = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;
                  const isExpanded = expandedIssue === i;
                  return (
                    <div key={i} className="border border-[#E8E2D8] rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedIssue(isExpanded ? null : i)}
                        className="w-full p-3.5 flex items-center gap-3 text-left hover:bg-[#FAF7F2]/50 transition-colors"
                      >
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                          style={{ background: sConfig.color }}
                        >
                          {sConfig.label}
                        </span>
                        <span className="flex-1 text-sm font-medium text-[#3A3A3A]">{issue.title}</span>
                        <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                          <ChevronRight className="w-4 h-4 text-[#8A8585]" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3 border-t border-[#E8E2D8]">
                              <div className="mt-3">
                                <span className="text-xs font-bold text-[#8A8585]">根因推測</span>
                                <p className="text-sm text-[#3A3A3A] mt-1">{issue.root_cause_guess}</p>
                              </div>
                              <div>
                                <span className="text-xs font-bold text-[#8A8585]">建議改善</span>
                                <p className="text-sm text-[#3A3A3A] mt-1">{issue.proposed_fix}</p>
                              </div>
                              {issue.customer_quotes?.length > 0 && (
                                <div>
                                  <span className="text-xs font-bold text-[#8A8585]">客戶原話</span>
                                  <div className="mt-1 space-y-1">
                                    {issue.customer_quotes.map((q, qi) => (
                                      <p key={qi} className="text-xs text-[#8A8585] italic pl-3 border-l-2 border-[#E8E2D8]">
                                        「{q}」
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 亮點 */}
          {currentReport.highlights?.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
              <h3 className="font-bold text-[#3A3A3A] mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#10B981]" />
                正面亮點 ({currentReport.highlights.length})
              </h3>
              <div className="space-y-2">
                {currentReport.highlights.map((hl, i) => (
                  <div key={i} className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-700">{hl.title}</span>
                    </div>
                    {hl.customer_quotes?.map((q, qi) => (
                      <p key={qi} className="text-xs text-emerald-600 italic pl-6">「{q}」</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 改善建議 */}
          {currentReport.recommendations?.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
              <h3 className="font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#C5A55A]" />
                改善建議
              </h3>
              <div className="space-y-2">
                {currentReport.recommendations.map((rec, i) => {
                  const pConfig = PRIORITY_CONFIG[rec.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 bg-[#FAF7F2] rounded-xl">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0 mt-0.5"
                        style={{ background: pConfig.color }}
                      >
                        {pConfig.label}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#3A3A3A]">{rec.action}</p>
                        <p className="text-xs text-[#8A8585] mt-1">
                          預期效果：{rec.expected_impact}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 歷史報告 — 只在沒有當前分析時顯示 */}
      {insights.length > 0 && !currentReport && (
        <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
          <h3 className="font-bold text-[#3A3A3A] mb-4">過去的分析</h3>
          <div className="space-y-2">
            {insights.map(insight => (
              <div key={insight.id} className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl">
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#3A3A3A]">
                    {new Date(insight.period_start).toLocaleDateString('zh-TW')} ~ {new Date(insight.period_end).toLocaleDateString('zh-TW')}
                  </div>
                  <div className="text-xs text-[#8A8585] mt-0.5 line-clamp-1">{insight.summary}</div>
                </div>
                <div className="text-xs text-[#8A8585]">{insight.conversation_count} 則</div>
                <div className="text-lg">{sentimentEmoji(insight.avg_sentiment || 0.5)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
