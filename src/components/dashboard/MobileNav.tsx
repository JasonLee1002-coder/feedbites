'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, X, ChevronRight, MessageSquare } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

const mainNavItems = [
  { href: '/dashboard',          label: '首頁',   icon: '/icons/home.png' },
  { href: '/dashboard/menu',     label: '菜單',   icon: '/icons/menu.png' },
  { href: '/dashboard/today',    label: '回饋',   icon: '/icons/feedback.png' },
  { href: '/dashboard/insights', label: 'AI洞察', icon: '/icons/insights.png' },
];

const moreItems = [
  { href: '/dashboard/surveys',  label: '問卷管理', icon: '/icons/survey.png',   useImage: true },
  { href: '/dashboard/settings', label: '店家設定', icon: '/icons/settings.png', useImage: true },
  { href: '/dashboard/feedback', label: '問題回報', icon: null,                  useImage: false },
];

const moreActivePaths = ['/dashboard/surveys', '/dashboard/settings', '/dashboard/feedback'];

export default function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreActivePaths.some((p) => pathname.startsWith(p));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur-md border-t border-[#E8E2D8]">
        <div className="flex items-center justify-around px-2 py-1.5 pb-safe">
          {mainNavItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard' || pathname === '/dashboard/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[52px]"
              >
                <motion.div
                  animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className={`relative w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-[#FF8C00]/10' : ''}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${BASE}${item.icon}`} alt={item.label} width={28} height={28} className="object-contain" />
                  {isActive && (
                    <motion.div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF8C00] rounded-full" />
                  )}
                </motion.div>
                <span className={`text-[9px] font-medium ${isActive ? 'text-[#FF8C00]' : 'text-[#8A8585]'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* 更多 button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[52px]"
          >
            <motion.div
              animate={isMoreActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`relative w-8 h-8 rounded-xl flex items-center justify-center ${isMoreActive ? 'bg-[#FF8C00]/10' : ''}`}
            >
              <MoreHorizontal size={22} className={isMoreActive ? 'text-[#FF8C00]' : 'text-[#8A8585]'} />
              {isMoreActive && (
                <motion.div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF8C00] rounded-full" />
              )}
            </motion.div>
            <span className={`text-[9px] font-medium ${isMoreActive ? 'text-[#FF8C00]' : 'text-[#8A8585]'}`}>
              更多
            </span>
          </button>
        </div>
      </nav>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
              onClick={() => setMoreOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden rounded-t-3xl bg-white shadow-2xl px-5 py-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <span className="text-base font-semibold text-gray-800">更多功能</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Items */}
              <div className="flex flex-col gap-1">
                {moreItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#FF8C00]/10 flex items-center justify-center flex-shrink-0">
                      {item.useImage && item.icon ? (
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`${BASE}${item.icon}`} alt={item.label} width={24} height={24} className="object-contain" />
                      ) : (
                        <MessageSquare size={20} className="text-[#FF8C00]" />
                      )}
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-700">{item.label}</span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
