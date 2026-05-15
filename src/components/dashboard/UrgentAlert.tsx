'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

interface UrgentAlertProps {
  keywords: { keyword: string; count: number; samples: string[] }[];
  todayResponses: number;
  overallAvg: number | null;
  pendingCount: number;
}

export default function UrgentAlert({ keywords, todayResponses, overallAvg, pendingCount }: UrgentAlertProps) {
  const hasUrgent = keywords.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-5 space-y-3"
    >
      {hasUrgent && (
        <motion.div
          className="rounded-2xl p-4 border border-red-200 bg-red-50"
          animate={{ boxShadow: ['0 0 0 0 rgba(239,68,68,0)', '0 0 0 6px rgba(239,68,68,0.1)', '0 0 0 0 rgba(239,68,68,0)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Image src="/icons/alert.png" alt="alert" width={24} height={24} />
            <span className="text-sm font-bold text-red-700">今日需要注意</span>
          </div>
          <div className="space-y-1.5">
            {keywords.map((kw) => (
              <Link key={kw.keyword} href="/dashboard/surveys" className="block">
                <div className="flex items-start gap-2 bg-white rounded-xl px-3 py-2 border border-red-100 hover:border-red-300 transition-colors">
                  <span className="text-red-500 font-bold text-xs mt-0.5 shrink-0">「{kw.keyword}」×{kw.count}</span>
                  <span className="text-[11px] text-[#666] leading-relaxed flex-1 line-clamp-1">
                    {kw.samples[0]?.slice(0, 30)}{(kw.samples[0]?.length ?? 0) > 30 ? '...' : ''}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/surveys">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="bg-white rounded-2xl p-4 border border-[#E8E2D8] flex items-center gap-3"
          >
            <Image src="/icons/feedback.png" alt="feedback" width={36} height={36} />
            <div>
              <div className="text-2xl font-bold text-[#3A3A3A]">{todayResponses}</div>
              <div className="text-[11px] text-[#8A8585]">今日回饋</div>
            </div>
          </motion.div>
        </Link>

        <Link href="/dashboard/insights">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="bg-white rounded-2xl p-4 border border-[#E8E2D8] flex items-center gap-3"
          >
            <Image src="/icons/star.png" alt="star" width={36} height={36} />
            <div>
              <div className="text-2xl font-bold text-[#3A3A3A]">
                {overallAvg ? overallAvg.toFixed(1) : '--'}
              </div>
              <div className="text-[11px] text-[#8A8585]">平均評分</div>
            </div>
          </motion.div>
        </Link>
      </div>

      {pendingCount > 0 && (
        <Link href="/dashboard/surveys">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="bg-[#FFF8F0] rounded-2xl p-4 border border-[#FF8C00]/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📬</span>
              <span className="text-sm text-[#3A3A3A]">有 <b>{pendingCount}</b> 筆回饋等你看</span>
            </div>
            <span className="text-[#FF8C00] text-xs font-bold">查看 →</span>
          </motion.div>
        </Link>
      )}
    </motion.div>
  );
}
