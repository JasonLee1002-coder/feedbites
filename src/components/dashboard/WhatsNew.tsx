'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Gift, ArrowRight } from 'lucide-react';

// ══ Update this on each release ══
const CURRENT_VERSION = '2026.03.27';

const UPDATES = [
  {
    emoji: '🎰',
    title: '輪盤獎品自訂',
    desc: '編輯問卷時可以自訂轉盤上的獎品內容了',
  },
  {
    emoji: '😄',
    title: '滿意度動畫升級',
    desc: '笑臉評分更生動，選擇時會跳動發光',
  },
  {
    emoji: '💬',
    title: '回報系統雙向對話',
    desc: '問題回報可以來回對話了，不再只能等',
  },
  {
    emoji: '📊',
    title: '服務統計 + 進度時間軸',
    desc: '回報頁新增解決率統計與處理進度追蹤',
  },
  {
    emoji: '🔗',
    title: '邀請連結分享',
    desc: '一鍵產生邀請連結，傳給夥伴就能加入管理',
  },
  {
    emoji: '🎄',
    title: '6 套節慶問卷模板',
    desc: '情人節、春節、母親節、聖誕節等活動專屬問卷',
  },
];

export default function WhatsNew() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem('feedbites_whats_new');
    if (lastSeen !== CURRENT_VERSION) {
      // Delay a bit so dashboard loads first
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleClose() {
    localStorage.setItem('feedbites_whats_new', CURRENT_VERSION);
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] px-6 py-6 text-center overflow-hidden">
              {/* Sparkle particles */}
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="absolute text-sm"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    y: [0, -30],
                    x: (i - 2) * 40,
                  }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
                  style={{ left: '50%', bottom: '20%' }}
                >
                  {['✨', '🎉', '⭐', '🌟', '💫'][i]}
                </motion.div>
              ))}

              <button
                onClick={handleClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <motion.div
                className="inline-flex items-center gap-2 px-3 py-1 bg-[#C5A55A]/20 rounded-full mb-3"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Gift className="w-3.5 h-3.5 text-[#C5A55A]" />
                <span className="text-xs font-bold text-[#C5A55A]">新版本上線</span>
              </motion.div>

              <h2 className="text-xl font-bold text-white mb-1">
                FeedBites 又進步了！
              </h2>
              <p className="text-xs text-white/50">
                {CURRENT_VERSION} 更新內容
              </p>
            </div>

            {/* Updates list */}
            <div className="px-5 py-4 max-h-[50vh] overflow-y-auto space-y-2.5">
              {UPDATES.map((item, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E8E2D8]"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <span className="text-2xl shrink-0">{item.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-[#3A3A3A]">{item.title}</p>
                    <p className="text-[11px] text-[#8A8585] mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-2">
              <button
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#C5A55A] to-[#A08735] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#C5A55A]/20 hover:shadow-xl transition-all"
              >
                <Sparkles className="w-4 h-4" />
                太棒了，開始使用！
              </button>
              <p className="text-center text-[10px] text-[#8A8585] mt-2">
                感謝你的回饋，每一次更新都是為了讓你用得更順手
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
