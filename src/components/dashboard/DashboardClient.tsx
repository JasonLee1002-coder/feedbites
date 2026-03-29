'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Plus, ArrowRight, Sparkles, Brain, ClipboardList,
  MessageCircle, TrendingUp, TrendingDown,
} from 'lucide-react';
import WhatsNew from './WhatsNew';

interface DashboardData {
  storeName: string;
  greeting: string;
  responseCount: number;
  todayResponses: number;
  weekResponses: number;
  weekTrend: number;
  overallAvg: number | null;
  surveyCount: number;
  activeSurveyCount: number;
  dishCount: number;
  dailyCounts: { label: string; count: number }[];
  maxDailyCount: number;
  recentResponses: Array<{
    id: string;
    respondent_name: string | null;
    submitted_at: string;
    survey_title?: string;
    answers?: Record<string, string | string[]>;
    xp_earned?: number | null;
    avg?: number | null;
  }>;
}

const ratingEmoji = (v: number) =>
  v >= 4.5 ? '😍' : v >= 3.5 ? '😊' : v >= 2.5 ? '😐' : v >= 1.5 ? '😕' : '😢';

const ratingWord = (v: number) =>
  v >= 4.5 ? '超棒！顧客很滿意' : v >= 3.5 ? '不錯！還有進步空間' : v >= 2.5 ? '普通，需要關注' : '需要改善了';

// Generate a consultant tip based on data
function getConsultantTip(data: DashboardData): { emoji: string; tip: string; action: string; href: string } {
  const { responseCount, todayResponses, weekTrend, overallAvg, surveyCount, activeSurveyCount } = data;

  if (surveyCount === 0) return {
    emoji: '🚀', tip: '還沒有問卷！建立第一份問卷，開始聽顧客的聲音吧。', action: '建立問卷', href: '/dashboard/surveys/new',
  };
  if (activeSurveyCount === 0) return {
    emoji: '⚠️', tip: '你的問卷都還沒啟用喔！啟用後客人才能填寫。', action: '管理問卷', href: '/dashboard/surveys',
  };
  if (responseCount === 0) return {
    emoji: '📋', tip: '問卷已就緒！把 QR Code 印出來放在桌上或收銀台旁，讓客人掃碼填寫。', action: '查看 QR Code', href: '/dashboard/surveys',
  };
  if (todayResponses > 3) return {
    emoji: '🔥', tip: `今天已經收到 ${todayResponses} 則回覆！建議到 AI 洞察看看顧客最在意什麼，趁熱調整。`, action: '看 AI 洞察', href: '/dashboard/insights',
  };
  if (todayResponses > 0) return {
    emoji: '📬', tip: `今天有 ${todayResponses} 則新回覆，去看看顧客說了什麼吧！每一則回饋都是改進的機會。`, action: '查看回覆', href: '/dashboard/surveys',
  };
  if (weekTrend < 0) return {
    emoji: '📉', tip: '這週回覆比上週少了，試試在送餐時口頭邀請客人掃碼填問卷，回覆率會明顯提升。', action: '看趨勢', href: '/dashboard/insights',
  };
  if (overallAvg && overallAvg < 3.5) return {
    emoji: '💡', tip: `平均評分 ${overallAvg.toFixed(1)} 分，建議重點改善評分最低的項目。到 AI 洞察看看顧客具體的不滿在哪裡。`, action: '看 AI 分析', href: '/dashboard/insights',
  };
  if (overallAvg && overallAvg >= 4.5) return {
    emoji: '🏆', tip: `平均 ${overallAvg.toFixed(1)} 分！太厲害了！這麼好的口碑，可以考慮把好評截圖放到 Google 地圖或社群，吸引更多客人。`, action: '看詳細分析', href: '/dashboard/insights',
  };
  return {
    emoji: '☀️', tip: '持續收集回饋是好習慣！定期查看 AI 洞察，讓數據幫你做更好的決策。', action: '看 AI 洞察', href: '/dashboard/insights',
  };
}

export default function DashboardClient(props: DashboardData) {
  const {
    storeName, greeting, responseCount, todayResponses,
    weekTrend, overallAvg, recentResponses, activeSurveyCount,
    dailyCounts, maxDailyCount,
  } = props;

  const tip = getConsultantTip(props);
  const latestResponse = recentResponses[0] || null;

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      <WhatsNew />

      {/* ═══ Store Hero Banner ═══ */}
      <motion.div
        className="mb-6 rounded-2xl p-6 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Decorative glow */}
        <motion.div
          className="absolute top-0 right-0 w-32 h-32 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(197,165,90,0.15), transparent 70%)' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-24 h-24 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(197,165,90,0.1), transparent 70%)' }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        />

        <div className="relative">
          <motion.div
            className="text-4xl mb-2"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🍽️
          </motion.div>
          <motion.h1
            className="text-2xl font-bold font-serif text-white mb-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {storeName}
          </motion.h1>
          <motion.p
            className="text-sm text-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {greeting}
            <motion.span
              className="inline-block ml-1"
              animate={{ rotate: [0, 14, -8, 14, 0] }}
              transition={{ duration: 1.5, delay: 1, repeat: Infinity, repeatDelay: 4 }}
            >
              👋
            </motion.span>
          </motion.p>
        </div>
      </motion.div>

      {/* ═══ Consultant Tip — the most important card ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Link href={tip.href}>
          <motion.div
            className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-6 text-white overflow-hidden mb-5 cursor-pointer"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.div
              className="absolute top-0 right-0 w-32 h-32 bg-[#C5A55A]/10 rounded-full blur-2xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <div className="relative">
              <div className="flex items-start gap-3 mb-3">
                <motion.span
                  className="text-3xl shrink-0"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {tip.emoji}
                </motion.span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C5A55A]" />
                    <span className="text-[11px] font-bold text-[#C5A55A]">FeedBites 餐飲顧問</span>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed">{tip.tip}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1.5 text-[#C5A55A] text-xs font-bold">
                {tip.action} <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* ═══ Status Cards — simple, glanceable ═══ */}
      <motion.div
        className="grid grid-cols-3 gap-3 mb-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Rating */}
        <Link href="/dashboard/insights">
          <motion.div
            className="bg-white rounded-2xl p-4 border border-[#E8E2D8] text-center cursor-pointer yuzu-card"
            whileTap={{ scale: 0.97 }}
          >
            <motion.div
              className="text-4xl mb-1"
              animate={overallAvg ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] } : {}}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              {overallAvg ? ratingEmoji(overallAvg) : '—'}
            </motion.div>
            <div className="text-lg font-bold text-[#3A3A3A]">
              {overallAvg ? overallAvg.toFixed(1) : '—'}
            </div>
            <div className="text-[10px] text-[#8A8585]">顧客滿意度</div>
          </motion.div>
        </Link>

        {/* Today responses */}
        <Link href="/dashboard/surveys">
          <motion.div
            className={`rounded-2xl p-4 border text-center cursor-pointer hover:shadow-lg transition-all ${
              todayResponses > 0
                ? 'bg-green-50/50 border-green-200/50 hover:border-green-300'
                : 'bg-white border-[#E8E2D8] hover:border-[#C5A55A]/30'
            }`}
            whileTap={{ scale: 0.97 }}
          >
            <motion.div
              className="text-4xl mb-1"
              animate={todayResponses > 0 ? { y: [0, -4, 0] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {todayResponses > 0 ? '📬' : '📭'}
            </motion.div>
            <div className="text-lg font-bold text-[#3A3A3A]">{todayResponses}</div>
            <div className="text-[10px] text-[#8A8585]">今日新回覆</div>
          </motion.div>
        </Link>

        {/* Trend */}
        <Link href="/dashboard/insights">
          <motion.div
            className="bg-white rounded-2xl p-4 border border-[#E8E2D8] text-center cursor-pointer yuzu-card"
            whileTap={{ scale: 0.97 }}
          >
            <motion.div
              className="text-4xl mb-1"
              animate={weekTrend !== 0 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {weekTrend > 0 ? '📈' : weekTrend < 0 ? '📉' : '➡️'}
            </motion.div>
            <div className={`text-lg font-bold flex items-center justify-center gap-1 ${
              weekTrend > 0 ? 'text-green-600' : weekTrend < 0 ? 'text-red-400' : 'text-[#3A3A3A]'
            }`}>
              {weekTrend > 0 ? <TrendingUp className="w-4 h-4" /> : weekTrend < 0 ? <TrendingDown className="w-4 h-4" /> : null}
              {weekTrend > 0 ? `+${weekTrend}` : weekTrend}
            </div>
            <div className="text-[10px] text-[#8A8585]">vs 上週</div>
          </motion.div>
        </Link>
      </motion.div>

      {/* ═══ Rating summary line ═══ */}
      {overallAvg && (
        <motion.div
          className="mb-5 px-4 py-3 rounded-xl bg-[#FAF7F2] border border-[#E8E2D8] text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-sm text-[#3A3A3A]">
            {ratingEmoji(overallAvg)} 顧客整體評價：<strong>{ratingWord(overallAvg)}</strong>
          </span>
        </motion.div>
      )}

      {/* ═══ Latest customer voice ═══ */}
      {latestResponse && (
        <motion.div
          className="mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Link href="/dashboard/surveys">
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5 cursor-pointer yuzu-card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-[#3A3A3A] flex items-center gap-2">
                  <motion.span
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    💬
                  </motion.span>
                  最新顧客心聲
                </h2>
                <span className="text-[10px] text-[#8A8585]">
                  {new Date(latestResponse.submitted_at).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {latestResponse.avg != null && (
                  <div className="text-center shrink-0">
                    <div className="text-3xl">{ratingEmoji(latestResponse.avg)}</div>
                    <div className={`text-xs font-bold mt-0.5 ${
                      latestResponse.avg >= 4 ? 'text-green-600' : latestResponse.avg >= 3 ? 'text-yellow-600' : 'text-red-500'
                    }`}>{latestResponse.avg.toFixed(1)}</div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#3A3A3A] font-medium">
                    {latestResponse.respondent_name || '匿名顧客'}
                  </p>
                  <p className="text-xs text-[#8A8585] mt-0.5">{latestResponse.survey_title}</p>
                  {/* Show a text answer if available */}
                  {latestResponse.answers && (() => {
                    const textAnswer = Object.values(latestResponse.answers).find(
                      v => typeof v === 'string' && v.length > 5 && isNaN(Number(v))
                    );
                    return textAnswer ? (
                      <p className="text-xs text-[#3A3A3A] mt-2 p-2 bg-[#FAF7F2] rounded-lg line-clamp-2 italic">
                        &ldquo;{textAnswer}&rdquo;
                      </p>
                    ) : null;
                  })()}
                </div>
                <ArrowRight className="w-4 h-4 text-[#8A8585] shrink-0" />
              </div>

              {recentResponses.length > 1 && (
                <div className="mt-3 pt-3 border-t border-[#E8E2D8] text-center">
                  <span className="text-xs text-[#C5A55A] font-medium">
                    還有 {recentResponses.length - 1} 則回覆 →
                  </span>
                </div>
              )}
            </div>
          </Link>
        </motion.div>
      )}

      {/* ═══ 7-day mini chart ═══ */}
      {dailyCounts.length > 0 && responseCount > 0 && (
        <motion.div
          className="bg-white rounded-2xl border border-[#E8E2D8] p-5 mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-sm font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
            <span>📊</span> 這週的回覆量
          </h2>
          <div className="flex items-end gap-2 h-20">
            {dailyCounts.map((d, i) => {
              const isToday = i === dailyCounts.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  {d.count > 0 && (
                    <span className="text-[10px] font-bold text-[#C5A55A]">{d.count}</span>
                  )}
                  <div className="w-full">
                    <motion.div
                      className={`w-full rounded-lg ${
                        isToday
                          ? 'bg-gradient-to-t from-[#FF8C00] to-[#FFB347]'
                          : d.count > 0
                            ? 'bg-gradient-to-t from-[#C5A55A] to-[#E8D5A0]'
                            : 'bg-[#E8E2D8]/50'
                      }`}
                      initial={{ height: 4 }}
                      animate={{ height: Math.max((d.count / maxDailyCount) * 50, 4) }}
                      transition={{ delay: 0.5 + i * 0.08, duration: 0.6 }}
                    />
                  </div>
                  <span className={`text-[9px] ${isToday ? 'text-[#FF8C00] font-bold' : 'text-[#8A8585]'}`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ Quick Actions — clear next steps ═══ */}
      <motion.div
        className="space-y-2.5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-sm font-bold text-[#8A8585] flex items-center gap-1.5">
          ⚡ 下一步
        </h2>

        {todayResponses > 0 && (
          <Link href="/dashboard/surveys">
            <motion.div
              className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200 cursor-pointer yuzu-health-card"
              whileHover={{ scale: 1.01, x: 3 }}
              whileTap={{ scale: 0.99 }}
            >
              <motion.span className="text-3xl" animate={{ y: [0, -3, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>📬</motion.span>
              <div className="flex-1">
                <p className="text-sm font-bold text-green-700">查看 {todayResponses} 則新回覆</p>
                <p className="text-[11px] text-green-600/70">看看今天顧客怎麼說</p>
              </div>
              <ArrowRight className="w-4 h-4 text-green-400" />
            </motion.div>
          </Link>
        )}

        <Link href="/dashboard/insights">
          <motion.div
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#E8E2D8] cursor-pointer yuzu-health-card"
            whileHover={{ scale: 1.01, x: 3 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.span className="text-3xl" animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>🧠</motion.span>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#3A3A3A]">AI 洞察分析</p>
              <p className="text-[11px] text-[#8A8585]">讓 AI 幫你讀懂顧客在想什麼</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#8A8585]" />
          </motion.div>
        </Link>

        <Link href="/dashboard/surveys/new">
          <motion.div
            className="flex items-center gap-3 p-4 bg-[#C5A55A]/5 rounded-xl border border-[#C5A55A]/20 cursor-pointer yuzu-health-card"
            whileHover={{ scale: 1.01, x: 3 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.span className="text-3xl" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>📝</motion.span>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#3A3A3A]">建立新問卷</p>
              <p className="text-[11px] text-[#8A8585]">節慶活動、新菜試吃、日常滿意度都有模板</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#C5A55A]" />
          </motion.div>
        </Link>

        <Link href="/dashboard/feedback">
          <motion.div
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#E8E2D8] cursor-pointer yuzu-health-card"
            whileHover={{ scale: 1.01, x: 3 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.span className="text-3xl" animate={{ y: [0, -2, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}>🛡️</motion.span>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#3A3A3A]">問題回報</p>
              <p className="text-[11px] text-[#8A8585]">有問題隨時跟餐飲顧問說</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#8A8585]" />
          </motion.div>
        </Link>
      </motion.div>

      {/* ═══ Invite team ═══ */}
      <motion.div
        className="mt-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Link href="/dashboard/settings#members">
          <motion.div
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] rounded-xl cursor-pointer overflow-hidden relative"
            whileHover={{ scale: 1.01, x: 3 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.span
              className="text-3xl"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              🤝
            </motion.span>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">邀請夥伴一起管理</p>
              <p className="text-[11px] text-white/50">產生邀請連結，傳給同事就能加入</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#C5A55A]" />
          </motion.div>
        </Link>
      </motion.div>

      {/* ═══ Updates link ═══ */}
      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Link href="/dashboard/updates" className="text-[11px] text-[#8A8585] hover:text-[#C5A55A] transition-colors">
          查看更新紀錄 →
        </Link>
      </motion.div>
    </div>
  );
}
