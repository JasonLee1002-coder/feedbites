'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  MessageSquare, Star, ClipboardList, Plus,
  TrendingUp, TrendingDown, CalendarDays,
  Sparkles, BarChart3, Brain, Zap, ArrowRight,
} from 'lucide-react';

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

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

// Floating sparkle particles
const particles = [
  { x: '5%', y: '10%', delay: 0, dur: 3 },
  { x: '92%', y: '15%', delay: 1.2, dur: 3.5 },
  { x: '88%', y: '60%', delay: 0.6, dur: 2.8 },
  { x: '8%', y: '70%', delay: 1.8, dur: 3.2 },
  { x: '50%', y: '5%', delay: 0.3, dur: 4 },
];

export default function DashboardClient(props: DashboardData) {
  const {
    storeName, greeting, responseCount, todayResponses, weekResponses,
    weekTrend, overallAvg, surveyCount, activeSurveyCount,
    dailyCounts, maxDailyCount, recentResponses,
  } = props;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto relative overflow-hidden">
      {/* Background sparkles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none text-[#C5A55A]/20"
          style={{ left: p.x, top: p.y }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0.5, 1.3, 0.5],
            y: [0, -15, 0],
          }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Sparkles className="w-4 h-4" />
        </motion.div>
      ))}

      {/* Welcome — animated */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl font-bold text-[#3A3A3A] font-serif flex items-center gap-2">
          {greeting}，{storeName}
          <motion.span
            animate={{ rotate: [0, 14, -8, 14, 0] }}
            transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, repeatDelay: 4 }}
            className="inline-block origin-bottom-right"
          >
            👋
          </motion.span>
        </h1>
        <p className="text-sm text-[#8A8585] mt-1 flex items-center gap-1.5">
          {todayResponses > 0 ? (
            <>
              <motion.span
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-xs font-medium"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-3 h-3" />
                {todayResponses} 筆新回覆
              </motion.span>
              今天的成績不錯！
            </>
          ) : (
            '今天還沒有新的回覆，把 QR Code 放到桌上試試看'
          )}
        </p>
      </motion.div>

      {/* KPI Cards — staggered animation */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Total responses */}
        <motion.div
          variants={fadeUp}
          className="group relative bg-white rounded-2xl p-5 border border-[#E8E2D8] hover:border-[#C5A55A]/40 transition-all hover:shadow-lg hover:shadow-[#C5A55A]/5 overflow-hidden"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-gradient-to-br from-[#C5A55A]/5 to-transparent rounded-full" />
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C5A55A]/20 to-[#C5A55A]/5 flex items-center justify-center"
              whileHover={{ rotate: 10, scale: 1.1 }}
            >
              <MessageSquare className="w-4.5 h-4.5 text-[#C5A55A]" />
            </motion.div>
            <span className="text-xs text-[#8A8585]">總回覆</span>
          </div>
          <p className="text-3xl font-bold text-[#3A3A3A]">{responseCount}</p>
          <div className="flex items-center gap-1 mt-1">
            {weekTrend > 0 ? (
              <motion.span
                className="flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
              >
                <TrendingUp className="w-3 h-3" />+{weekTrend} vs 上週
              </motion.span>
            ) : weekTrend < 0 ? (
              <span className="flex items-center gap-0.5 text-[10px] text-red-400 bg-red-50 px-1.5 py-0.5 rounded-full">
                <TrendingDown className="w-3 h-3" />{weekTrend} vs 上週
              </span>
            ) : (
              <span className="text-[10px] text-[#8A8585]">本週 {weekResponses} 筆</span>
            )}
          </div>
        </motion.div>

        {/* Average rating */}
        <motion.div
          variants={fadeUp}
          className="group relative bg-white rounded-2xl p-5 border border-[#E8E2D8] hover:border-yellow-300/40 transition-all hover:shadow-lg hover:shadow-yellow-100/50 overflow-hidden"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-gradient-to-br from-yellow-400/5 to-transparent rounded-full" />
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400/20 to-yellow-400/5 flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Star className="w-4.5 h-4.5 text-yellow-500" />
            </motion.div>
            <span className="text-xs text-[#8A8585]">平均評分</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-[#3A3A3A]">{overallAvg ? overallAvg.toFixed(1) : '-'}</span>
            {overallAvg && <span className="text-sm text-[#8A8585]">/ 5</span>}
          </div>
          {overallAvg && (
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(s => (
                <motion.span
                  key={s}
                  className={`text-xs ${s <= Math.round(overallAvg!) ? 'text-yellow-400' : 'text-gray-200'}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + s * 0.1, type: 'spring' }}
                >
                  ★
                </motion.span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Survey count */}
        <motion.div
          variants={fadeUp}
          className="group relative bg-white rounded-2xl p-5 border border-[#E8E2D8] hover:border-blue-300/40 transition-all hover:shadow-lg hover:shadow-blue-50 overflow-hidden"
        >
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-gradient-to-br from-blue-400/5 to-transparent rounded-full" />
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400/20 to-blue-400/5 flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: -10 }}
            >
              <ClipboardList className="w-4.5 h-4.5 text-blue-500" />
            </motion.div>
            <span className="text-xs text-[#8A8585]">問卷</span>
          </div>
          <p className="text-3xl font-bold text-[#3A3A3A]">{surveyCount}</p>
          <motion.p
            className="text-[10px] text-[#8A8585] mt-1 flex items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            {activeSurveyCount} 份啟用中
          </motion.p>
        </motion.div>

        {/* Today summary */}
        <motion.div
          variants={fadeUp}
          className="relative bg-gradient-to-br from-[#C5A55A] to-[#8B7332] rounded-2xl p-5 text-white overflow-hidden"
        >
          {/* Animated glow */}
          <motion.div
            className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="flex items-center gap-2 mb-2 relative">
            <motion.div
              className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <CalendarDays className="w-4.5 h-4.5" />
            </motion.div>
            <span className="text-xs opacity-80">今日摘要</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2 relative">
            <div>
              <motion.div
                className="text-2xl font-bold"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              >
                {todayResponses}
              </motion.div>
              <div className="text-[10px] opacity-70">新回覆</div>
            </div>
            <div>
              <motion.div
                className="text-2xl font-bold"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
              >
                {activeSurveyCount}
              </motion.div>
              <div className="text-[10px] opacity-70">進行中</div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* 7-day chart — animated bars */}
          {dailyCounts.length > 0 && (
            <motion.div
              className="bg-white rounded-2xl border border-[#E8E2D8] p-6 hover:shadow-lg hover:shadow-[#C5A55A]/5 transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[#3A3A3A] flex items-center gap-2">
                  <motion.span
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🔥
                  </motion.span>
                  7 日回覆趨勢
                </h2>
                {weekTrend > 0 && (
                  <motion.span
                    className="text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-medium"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    +{weekTrend} vs 上週
                  </motion.span>
                )}
              </div>
              <div className="flex items-end gap-2 h-28">
                {dailyCounts.map((d, i) => {
                  const isToday = i === dailyCounts.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <motion.span
                        className="text-[10px] font-bold text-[#C5A55A]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: d.count > 0 ? 1 : 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                      >
                        {d.count > 0 ? d.count : ''}
                      </motion.span>
                      <div className="w-full">
                        <motion.div
                          className={`w-full rounded-t-lg ${
                            isToday
                              ? 'bg-gradient-to-t from-[#FF8C00] to-[#FFB347]'
                              : 'bg-gradient-to-t from-[#C5A55A] to-[#E8D5A0]'
                          }`}
                          initial={{ height: 2 }}
                          animate={{
                            height: Math.max((d.count / maxDailyCount) * 70, d.count > 0 ? 8 : 2),
                          }}
                          transition={{ delay: 0.3 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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

          {/* Recent responses */}
          <motion.div
            className="bg-white rounded-2xl border border-[#E8E2D8] hover:shadow-lg hover:shadow-[#C5A55A]/5 transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="px-5 py-4 border-b border-[#E8E2D8] flex items-center justify-between">
              <h2 className="font-bold text-[#3A3A3A] flex items-center gap-2">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  💬
                </motion.span>
                最近回覆
              </h2>
              {recentResponses.length > 0 && (
                <Link
                  href="/dashboard/surveys"
                  className="text-xs text-[#C5A55A] hover:text-[#A08735] transition-colors flex items-center gap-1"
                >
                  查看全部 <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
            {recentResponses.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <motion.div
                  className="text-4xl mb-3"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  📭
                </motion.div>
                <p className="text-sm text-[#3A3A3A] font-medium">尚無回覆</p>
                <p className="text-xs text-[#8A8585] mt-1">建立問卷並分享給客人，回覆會顯示在這裡</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E2D8]">
                {recentResponses.map((r, i) => (
                  <motion.div
                    key={r.id}
                    className="px-5 py-3 flex items-center justify-between hover:bg-[#FAF7F2]/50 transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#3A3A3A] font-medium">
                            {r.respondent_name || '匿名'}
                          </p>
                          {r.avg != null && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              r.avg >= 4 ? 'bg-green-50 text-green-600'
                              : r.avg >= 3 ? 'bg-yellow-50 text-yellow-600'
                              : 'bg-red-50 text-red-500'
                            }`}>
                              {r.avg.toFixed(1)} ★
                            </span>
                          )}
                          {r.xp_earned != null && r.xp_earned > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#FFD700]/10 text-[#A08735] rounded-full font-medium">
                              +{r.xp_earned} XP
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8A8585]">{r.survey_title}</p>
                      </div>
                    </div>
                    <span className="text-xs text-[#8A8585] shrink-0">
                      {new Date(r.submitted_at).toLocaleDateString('zh-TW', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
            <h2 className="font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FF8C00]" />
              快速操作
            </h2>
            <div className="space-y-2">
              <Link href="/dashboard/surveys?action=create">
                <motion.span
                  className="flex items-center gap-3 w-full px-4 py-3 bg-gradient-to-r from-[#C5A55A] to-[#A08735] text-white text-sm font-medium rounded-xl shadow-md shadow-[#C5A55A]/15 cursor-pointer"
                  whileHover={{ scale: 1.02, y: -1, boxShadow: '0 8px 25px rgba(197,165,90,0.25)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-4 h-4" />
                  建立新問卷
                </motion.span>
              </Link>
              <Link href="/dashboard/surveys">
                <motion.span
                  className="flex items-center gap-3 w-full px-4 py-3 bg-[#FAF7F2] text-[#3A3A3A] text-sm rounded-xl border border-[#E8E2D8] cursor-pointer mt-2"
                  whileHover={{ scale: 1.02, borderColor: '#C5A55A' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ClipboardList className="w-4 h-4 text-[#C5A55A]" />
                  管理問卷
                </motion.span>
              </Link>
              <Link href="/dashboard/insights">
                <motion.span
                  className="flex items-center gap-3 w-full px-4 py-3 bg-[#FAF7F2] text-[#3A3A3A] text-sm rounded-xl border border-[#E8E2D8] cursor-pointer mt-2"
                  whileHover={{ scale: 1.02, borderColor: '#C5A55A' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Brain className="w-4 h-4 text-[#C5A55A]" />
                  AI 洞察分析
                </motion.span>
              </Link>
            </div>
          </div>

          {/* AI Tip — dynamic */}
          <motion.div
            className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-5 text-white overflow-hidden"
            whileHover={{ scale: 1.01 }}
          >
            {/* Animated circuit lines */}
            <motion.div
              className="absolute top-0 left-0 w-full h-full opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(197,165,90,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,140,0,0.2) 0%, transparent 50%)',
              }}
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <motion.div
                  className="w-8 h-8 rounded-lg bg-[#C5A55A]/20 flex items-center justify-center"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-4 h-4 text-[#C5A55A]" />
                </motion.div>
                <span className="text-xs font-bold text-[#C5A55A]">AI 小提示</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                {responseCount === 0
                  ? '建立你的第一份問卷，開始收集顧客的真實想法吧！'
                  : todayResponses > 0
                    ? '今天有新回覆進來了！到「AI 洞察分析」看看顧客在想什麼。'
                    : '定期查看文字回饋，這是最有價值的改進依據。試試把 QR Code 放在桌上立牌。'
                }
              </p>
            </div>
          </motion.div>

          {/* Stats mini */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5">
            <h2 className="font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#C5A55A]" />
              數據一覽
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8A8585]">菜品數量</span>
                <span className="text-sm font-bold text-[#3A3A3A]">{props.dishCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8A8585]">本週回覆</span>
                <span className="text-sm font-bold text-[#3A3A3A]">{weekResponses}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8A8585]">啟用問卷</span>
                <span className="text-sm font-bold text-[#3A3A3A]">{activeSurveyCount}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
