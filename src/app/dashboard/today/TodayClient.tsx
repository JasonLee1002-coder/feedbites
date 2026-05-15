'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface ResponseItem {
  id: string;
  respondent_name: string | null;
  submitted_at: string;
  survey_id: string;
  survey_title: string;
  answers: Record<string, string | string[] | number> | null;
  xp_earned: number | null;
  avg: number | null;
  firstTextAnswer: string | null;
}

interface TodayClientProps {
  responses: ResponseItem[];
  dateLabel: string;
  avgScore: number | null;
}

function StarDisplay({ score }: { score: number | null }) {
  if (score === null) return null;
  const rounded = Math.round(score * 10) / 10;
  const fullStars = Math.floor(rounded);
  const hasHalf = rounded - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            className="text-sm"
            style={{
              color: s <= fullStars ? '#FF8C00' : s === fullStars + 1 && hasHalf ? '#FF8C00' : '#D1C7BB',
              opacity: s === fullStars + 1 && hasHalf ? 0.5 : 1,
            }}
          >
            ★
          </span>
        ))}
      </div>
      <span className="text-xs font-bold text-[#FF8C00]">{rounded.toFixed(1)}</span>
    </div>
  );
}

function ResponseCard({ item, index }: { item: ResponseItem; index: number }) {
  const time = new Date(item.submitted_at).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Taipei',
  });

  const displayName = item.respondent_name?.trim() || '匿名顧客';
  const avatarEmoji = item.avg !== null
    ? item.avg >= 4 ? '😊' : item.avg >= 3 ? '😐' : '😞'
    : '😊';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.07, duration: 0.35, ease: 'easeOut' }}
      className="bg-white rounded-2xl border border-[#E8E2D8] p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Top row: avatar + name + score */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl leading-none">{avatarEmoji}</span>
          <div>
            <p className="text-sm font-semibold text-[#3A3A3A] leading-tight">{displayName}</p>
            <p className="text-[11px] text-[#8A8585] mt-0.5">{item.survey_title}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {item.avg !== null && <StarDisplay score={item.avg} />}
          <span className="text-[11px] text-[#8A8585]">{time}</span>
        </div>
      </div>

      {/* Quote */}
      {item.firstTextAnswer && (
        <div className="mt-2.5 px-3 py-2 bg-[#FAF7F2] rounded-xl border-l-2 border-[#FF8C00]/40">
          <p className="text-sm text-[#5A5555] leading-relaxed line-clamp-2">
            &ldquo;{item.firstTextAnswer}&rdquo;
          </p>
        </div>
      )}

      {/* XP badge */}
      {item.xp_earned !== null && item.xp_earned > 0 && (
        <div className="mt-2 flex justify-end">
          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full border border-amber-200">
            +{item.xp_earned} XP
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default function TodayClient({ responses, dateLabel, avgScore }: TodayClientProps) {
  const latestTime = responses.length > 0
    ? new Date(responses[0].submitted_at).toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Taipei',
      })
    : null;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FAF7F2]/95 backdrop-blur-sm border-b border-[#E8E2D8] px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#E8E2D8] text-[#3A3A3A] hover:bg-[#FAF7F2] transition-colors shadow-sm text-lg font-medium"
          >
            ←
          </Link>
          <h1 className="text-base font-bold text-[#3A3A3A]">今日回饋</h1>
        </div>
        <span className="text-sm text-[#8A8585] font-medium">{dateLabel}</span>
      </div>

      <div className="px-4 pt-4 pb-24 max-w-lg mx-auto">
        {/* Quick stats */}
        <motion.div
          className="grid grid-cols-3 gap-3 mb-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Count */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-3.5 text-center shadow-sm">
            <div className="text-2xl font-bold text-[#FF8C00]">{responses.length}</div>
            <div className="text-[11px] text-[#8A8585] mt-0.5">筆回饋</div>
          </div>

          {/* Avg score */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-3.5 text-center shadow-sm">
            {avgScore !== null ? (
              <>
                <div className="text-2xl font-bold text-[#FF8C00]">{avgScore.toFixed(1)}</div>
                <div className="text-[11px] text-[#8A8585] mt-0.5">平均評分</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-[#C8C0B8]">—</div>
                <div className="text-[11px] text-[#8A8585] mt-0.5">平均評分</div>
              </>
            )}
          </div>

          {/* Latest */}
          <div className="bg-white rounded-2xl border border-[#E8E2D8] p-3.5 text-center shadow-sm">
            {latestTime ? (
              <>
                <div className="text-lg font-bold text-[#FF8C00] leading-tight pt-1">{latestTime}</div>
                <div className="text-[11px] text-[#8A8585] mt-0.5">最新回饋</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-[#C8C0B8]">—</div>
                <div className="text-[11px] text-[#8A8585] mt-0.5">最新回饋</div>
              </>
            )}
          </div>
        </motion.div>

        {/* Feed */}
        {responses.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-20 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-6xl mb-4 block">😴</span>
            <p className="text-base font-bold text-[#3A3A3A] mb-1">今天還沒有回饋</p>
            <p className="text-sm text-[#8A8585] mb-6">分享問卷給顧客，收集第一筆回饋吧！</p>
            <Link
              href="/dashboard/surveys"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF8C00] text-white text-sm font-bold rounded-xl shadow-md shadow-[#FF8C00]/20 hover:bg-[#E07A00] transition-colors"
            >
              前往問卷管理 →
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {responses.map((item, index) => (
              <ResponseCard key={item.id} item={item} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
