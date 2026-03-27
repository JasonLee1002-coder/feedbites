'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Gift } from 'lucide-react';
import { changelog, CURRENT_VERSION } from '@/lib/changelog';

export default function UpdatesPage() {
  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-[#8A8585] hover:text-[#3A3A3A] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#3A3A3A] flex items-center gap-2" style={{ fontFamily: "'Noto Serif TC', serif" }}>
            <motion.div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C5A55A] to-[#A08735] flex items-center justify-center"
              whileHover={{ rotate: 10, scale: 1.1 }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            更新紀錄
          </h1>
          <p className="text-sm text-[#8A8585] mt-1">每一次更新，都是為了讓你用得更順手</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-[#E8E2D8]" />

        <div className="space-y-8">
          {changelog.map((release, ri) => {
            const isLatest = release.version === CURRENT_VERSION;
            return (
              <motion.div
                key={release.version}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ri * 0.1 }}
              >
                {/* Version dot + date */}
                <div className="flex items-center gap-3 mb-3 relative">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    isLatest
                      ? 'bg-gradient-to-br from-[#C5A55A] to-[#A08735] shadow-lg shadow-[#C5A55A]/30'
                      : 'bg-white border-2 border-[#E8E2D8]'
                  }`}>
                    {isLatest ? (
                      <Gift className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-xs text-[#8A8585]">{release.date.split('/')[1]}/{release.date.split('/')[2]}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#3A3A3A]">{release.title}</span>
                      {isLatest && (
                        <motion.span
                          className="px-2 py-0.5 bg-[#C5A55A]/10 text-[#C5A55A] text-[10px] font-bold rounded-full"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          最新
                        </motion.span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#8A8585]">{release.date}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="ml-[46px] space-y-2">
                  {release.items.map((item, i) => (
                    <motion.div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${
                        isLatest
                          ? 'bg-[#FAF7F2] border-[#E8E2D8]'
                          : 'bg-white border-[#E8E2D8]/60'
                      }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: ri * 0.1 + i * 0.05 }}
                    >
                      <span className="text-xl shrink-0">{item.emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-[#3A3A3A]">{item.title}</p>
                        <p className="text-[11px] text-[#8A8585] mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* End of timeline */}
        <div className="flex items-center gap-3 mt-8 relative">
          <div className="w-9 h-9 rounded-full bg-[#FAF7F2] border-2 border-dashed border-[#E8E2D8] flex items-center justify-center shrink-0 z-10">
            <span className="text-sm">🚀</span>
          </div>
          <p className="text-sm text-[#8A8585]">FeedBites 的故事，從這裡開始...</p>
        </div>
      </div>
    </div>
  );
}
