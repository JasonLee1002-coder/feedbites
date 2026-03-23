'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  MessageCircle, BarChart3, Loader2, RefreshCw, Send, Star,
  ChevronDown, ChevronRight, Zap, Target, Bell,
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

interface SelfReview {
  what_worked: string;
  what_failed: string;
  improvement_plan: string;
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
  self_review: SelfReview;
  recommendations: Recommendation[];
  kpi: KPI;
}

interface Insight {
  id: string;
  period_start: string;
  period_end: string;
  summary: string;
  issues: Issue[];
  self_review: SelfReview;
  recommendations: Recommendation[];
  conversation_count: number;
  avg_sentiment: number;
  created_at: string;
}

const SEVERITY_CONFIG = {
  critical: { color: '#DC2626', bg: '#FEF2F2', label: '嚴重', icon: AlertTriangle },
  high: { color: '#EF4444', bg: '#FEF2F2', label: '高', icon: AlertTriangle },
  medium: { color: '#F59E0B', bg: '#FFFBEB', label: '中', icon: Target },
  low: { color: '#6B7280', bg: '#F3F4F6', label: '低', icon: Target },
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
  const [generating, setGenerating] = useState(false);
  const [reportMd, setReportMd] = useState('');
  const [days, setDays] = useState(7);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'review'>('overview');

  useEffect(() => { fetchInsights(); }, []);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/feedback-analyze');
      if (res.ok) setInsights(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  // 執行 AI 分析
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
        setActiveTab('overview');
        fetchInsights(); // 更新歷史列表
      }
    } catch { /* ignore */ } finally {
      setAnalyzing(false);
    }
  }

  // 產出報告 + LINE 通知
  async function generateReport(notifyLine: boolean = false) {
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/feedback-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyLine }),
      });
      if (res.ok) {
        const data = await res.json();
        setReportMd(data.report);
      }
    } catch { /* ignore */ } finally {
      setGenerating(false);
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
      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#E8E2D8] rounded w-64" />
          <div className="h-40 bg-[#E8E2D8] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#3A3A3A] flex items-center gap-2" style={{ fontFamily: "'Noto Serif TC', serif" }}>
            <Brain className="w-7 h-7 text-[#C5A55A]" />
            回報精靈
          </h1>
          <p className="text-sm text-[#8A8585] mt-1">
            AI 自動分析客戶回饋，找出問題、發現亮點、提出改善方案
          </p>
        </div>
      </div>

      {/* 分析控制區 */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-[#3A3A3A]">分析期間</label>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm bg-[#FAF7F2] outline-none focus:border-[#FF8C00]"
            >
              <option value={3}>近 3 天</option>
              <option value={7}>近 7 天</option>
              <option value={14}>近 14 天</option>
              <option value={30}>近 30 天</option>
            </select>
          </div>

          <motion.button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#FF8C00]/20 hover:shadow-xl disabled:opacity-50 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {analyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin" />AI 分析中...</>
            ) : (
              <><Brain className="w-4 h-4" />執行 AI 分析</>
            )}
          </motion.button>

          {currentReport && (
            <>
              <motion.button
                onClick={() => generateReport(false)}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#FAF7F2] text-[#3A3A3A] rounded-xl text-sm font-medium border border-[#E8E2D8] hover:border-[#C5A55A] transition-all"
                whileTap={{ scale: 0.98 }}
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                產出報告
              </motion.button>
              <motion.button
                onClick={() => generateReport(true)}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-medium border border-green-200 hover:border-green-400 transition-all"
                whileTap={{ scale: 0.98 }}
              >
                <Bell className="w-4 h-4" />
                報告 + LINE 通知
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* 分析結果 */}
      {currentReport && (
        <>
          {/* KPI 卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-4">
              <div className="flex items-center gap-2 text-[#8A8585] text-xs mb-2">
                <MessageCircle className="w-3.5 h-3.5" />
                對話總數
              </div>
              <div className="text-2xl font-bold text-[#3A3A3A]">
                {currentReport.kpi?.total_conversations || 0}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-4">
              <div className="flex items-center gap-2 text-[#8A8585] text-xs mb-2">
                <BarChart3 className="w-3.5 h-3.5" />
                平均情緒
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold" style={{ color: sentimentColor(currentReport.kpi?.avg_sentiment || 0.5) }}>
                  {((currentReport.kpi?.avg_sentiment || 0.5) * 100).toFixed(0)}%
                </span>
                <span className="text-xl">{sentimentEmoji(currentReport.kpi?.avg_sentiment || 0.5)}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-4">
              <div className="flex items-center gap-2 text-[#8A8585] text-xs mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                問題數
              </div>
              <div className="text-2xl font-bold text-[#EF4444]">
                {currentReport.issues?.length || 0}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-4">
              <div className="flex items-center gap-2 text-[#8A8585] text-xs mb-2">
                <Star className="w-3.5 h-3.5" />
                亮點數
              </div>
              <div className="text-2xl font-bold text-[#10B981]">
                {currentReport.highlights?.length || 0}
              </div>
            </div>
          </div>

          {/* Tab 切換 */}
          <div className="flex gap-1 bg-[#FAF7F2] p-1 rounded-xl">
            {[
              { id: 'overview' as const, label: '摘要', icon: BarChart3 },
              { id: 'issues' as const, label: '問題 & 亮點', icon: AlertTriangle },
              { id: 'review' as const, label: '自我檢討', icon: RefreshCw },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-[#FF8C00] shadow-sm'
                      : 'text-[#8A8585] hover:text-[#3A3A3A]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab 內容 */}
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* 摘要 */}
                <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
                  <h3 className="font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#FF8C00]" />
                    AI 摘要
                  </h3>
                  <p className="text-sm text-[#3A3A3A] leading-relaxed">{currentReport.summary}</p>
                </div>

                {/* 熱門話題 */}
                {currentReport.kpi?.top_topics && (
                  <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
                    <h3 className="font-bold text-[#3A3A3A] mb-3">熱門話題</h3>
                    <div className="flex flex-wrap gap-2">
                      {currentReport.kpi.top_topics.map((topic, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-[#FF8C00]/10 text-[#FF8C00] rounded-full text-xs font-medium"
                        >
                          {topic}
                        </span>
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
                    <div className="space-y-3">
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
                                預期效果：{rec.expected_impact} · 難度：{rec.effort}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'issues' && (
              <motion.div
                key="issues"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* 問題列表 */}
                {currentReport.issues?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
                    <h3 className="font-bold text-[#3A3A3A] mb-4 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-[#EF4444]" />
                      待解決問題 ({currentReport.issues.length})
                    </h3>
                    <div className="space-y-3">
                      {currentReport.issues.map((issue, i) => {
                        const sConfig = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;
                        const isExpanded = expandedIssue === i;
                        return (
                          <div key={i} className="border border-[#E8E2D8] rounded-xl overflow-hidden">
                            <button
                              onClick={() => setExpandedIssue(isExpanded ? null : i)}
                              className="w-full p-4 flex items-center gap-3 text-left hover:bg-[#FAF7F2]/50"
                            >
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                                style={{ background: sConfig.color }}
                              >
                                {sConfig.label}
                              </span>
                              <span className="flex-1 text-sm font-medium text-[#3A3A3A]">{issue.title}</span>
                              <span className="text-xs text-[#8A8585]">x{issue.frequency}</span>
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
                    <div className="space-y-3">
                      {currentReport.highlights.map((hl, i) => (
                        <div key={i} className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-medium text-emerald-700">{hl.title}</span>
                            <span className="text-xs text-emerald-500">x{hl.frequency}</span>
                          </div>
                          {hl.customer_quotes?.map((q, qi) => (
                            <p key={qi} className="text-xs text-emerald-600 italic pl-6">「{q}」</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
                  <h3 className="font-bold text-[#3A3A3A] mb-4 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#C5A55A]" />
                    回報精靈自我檢討
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-bold text-emerald-700">做得好的地方</span>
                      </div>
                      <p className="text-sm text-emerald-700 leading-relaxed">{currentReport.self_review?.what_worked}</p>
                    </div>

                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-bold text-red-700">需要改善的地方</span>
                      </div>
                      <p className="text-sm text-red-700 leading-relaxed">{currentReport.self_review?.what_failed}</p>
                    </div>

                    <div className="p-4 bg-[#FF8C00]/5 rounded-xl border border-[#FF8C00]/15">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-[#FF8C00]" />
                        <span className="text-sm font-bold text-[#FF8C00]">下期改善計畫</span>
                      </div>
                      <p className="text-sm text-[#3A3A3A] leading-relaxed">{currentReport.self_review?.improvement_plan}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* 報告輸出 */}
      <AnimatePresence>
        {reportMd && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#E8E2D8] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#3A3A3A] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#C5A55A]" />
                結構化報告
              </h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(reportMd);
                }}
                className="text-xs text-[#FF8C00] hover:underline"
              >
                複製報告
              </button>
            </div>
            <pre className="text-xs text-[#3A3A3A] bg-[#FAF7F2] p-4 rounded-xl overflow-auto max-h-[400px] whitespace-pre-wrap font-mono leading-relaxed">
              {reportMd}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 歷史報告 */}
      {insights.length > 0 && !currentReport && (
        <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
          <h3 className="font-bold text-[#3A3A3A] mb-4">歷史分析報告</h3>
          <div className="space-y-2">
            {insights.map(insight => (
              <div key={insight.id} className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl">
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#3A3A3A]">
                    {new Date(insight.period_start).toLocaleDateString('zh-TW')} ~ {new Date(insight.period_end).toLocaleDateString('zh-TW')}
                  </div>
                  <div className="text-xs text-[#8A8585] mt-0.5 line-clamp-1">{insight.summary}</div>
                </div>
                <div className="text-xs text-[#8A8585]">{insight.conversation_count} 對話</div>
                <div className="text-lg">{sentimentEmoji(insight.avg_sentiment || 0.5)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空狀態 */}
      {!currentReport && insights.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E8E2D8] p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FF8C00]/10 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-[#FF8C00]" />
          </div>
          <h2 className="text-lg font-bold text-[#3A3A3A] mb-2">還沒有分析報告</h2>
          <p className="text-sm text-[#8A8585] mb-4">
            收集到客戶回饋後，點擊「執行 AI 分析」產出情報報告
          </p>
        </div>
      )}
    </div>
  );
}
