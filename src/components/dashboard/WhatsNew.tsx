'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Gift } from 'lucide-react';
import Link from 'next/link';
import { CURRENT_VERSION, changelog } from '@/lib/changelog';

export default function WhatsNew() {
  const [show, setShow] = useState(false);

  const latest = changelog[0];

  useEffect(() => {
    const lastSeen = localStorage.getItem('feedbites_whats_new');
    if (lastSeen !== CURRENT_VERSION) {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleClose() {
    localStorage.setItem('feedbites_whats_new', CURRENT_VERSION);
    setShow(false);
  }

  if (!latest) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />

          <motion.div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] px-6 py-6 text-center overflow-hidden">
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="absolute text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0], y: [0, -30], x: (i - 2) * 40 }}
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

              <h2 className="text-xl font-bold text-white mb-1">FeedBites 又進步了！</h2>
              <p className="text-xs text-white/50">{latest.date} — {latest.title}</p>
            </div>

            {/* Updates list */}
            <div className="px-5 py-4 max-h-[50vh] overflow-y-auto space-y-2.5">
              {latest.items.map((item, i) => (
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
              <Link
                href="/dashboard/updates"
                onClick={handleClose}
                className="block text-center text-[11px] text-[#C5A55A] mt-3 hover:underline"
              >
                查看所有更新紀錄 →
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
