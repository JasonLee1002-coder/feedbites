'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface BubbleMessage {
  text: string;
}

function getPageMessages(pathname: string, context?: { dishCount?: number; surveyCount?: number }): string[] {
  if (pathname.includes('/menu')) {
    if (context?.dishCount === 0) {
      return [
        '嗨！我是你的副店長 🤖 上傳現有菜單圖片，我幫你自動拆成一道一道菜！',
        '你也可以一道一道手動新增，拍照 + 語音描述最快哦。',
        '小提醒：有照片的菜品在問卷裡會更吸引客人評分！',
      ];
    }
    return [
      '菜單看起來不錯！記得幫每道菜都加上照片，客人評分意願會提升 2 倍。',
      '試試「上傳現有菜單」功能，我可以幫你快速擴充菜品。',
      '語音描述很方便 — 對著手機說就好，我會幫你整理成精美文案。',
    ];
  }
  if (pathname.includes('/surveys/new')) {
    return ['建立問卷很簡單！選一個適合你風格的模板，3 分鐘就能上線。', '建議啟用折扣獎勵，回覆率可以提升 3 倍！'];
  }
  if (pathname.includes('/surveys') && pathname.includes('/qrcode')) {
    return ['把 QR Code 列印出來，放在每張桌上或結帳櫃台旁邊。'];
  }
  if (pathname.includes('/surveys/')) {
    return ['看看客人的回饋，文字留言通常是最有價值的改進線索。', '可以匯出 Excel 檔案，方便跟團隊分享數據。'];
  }
  if (pathname.includes('/surveys')) {
    if (context?.surveyCount === 0) return ['還沒有問卷呢！點「建立新問卷」開始收集客人回饋吧。'];
    return ['記得定期檢查回覆，即時了解客人的想法。'];
  }
  if (pathname.includes('/settings')) {
    return ['上傳 Logo 讓問卷更有品牌感！', '記得填寫「店家資料」，填完就能解鎖同業比較分析功能。'];
  }
  if (pathname.includes('/new-store')) {
    return ['歡迎加入 FeedBites！先幫你的餐廳取個名字吧。'];
  }
  return [
    '嗨！我是你的 FeedBites 副店長，有什麼需要幫忙的隨時點我！',
    '每天花 2 分鐘看一下新回覆，持續改進就是最好的經營策略。',
  ];
}

interface AiProps {
  storeName?: string;
  hasLogo?: boolean;
  dishCount?: number;
  surveyCount?: number;
  responseCount?: number;
}

export default function AiAssistant({ storeName = '', hasLogo = false, dishCount = 0, surveyCount = 0, responseCount = 0 }: AiProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<BubbleMessage[]>([]);
  const [showBubble, setShowBubble] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Position state — avatar moves around the content area
  const homePos = { bottom: 80, right: 32 };
  const [pos, setPos] = useState(homePos);
  const [isNearInput, setIsNearInput] = useState(false);

  const clampPos = (p: { bottom: number; right: number }) => ({
    bottom: Math.max(24, Math.min(p.bottom, 300)),
    right: Math.max(16, Math.min(p.right, 120)),
  });

  const pageMessages = getPageMessages(pathname, { dishCount, surveyCount });

  // Onboarding
  const onboardingSteps = [
    { id: 'logo', label: '上傳 Logo', href: '/dashboard/settings', done: hasLogo },
    { id: 'menu', label: '建立菜單', href: '/dashboard/menu', done: dishCount > 0 },
    { id: 'survey', label: '建立問卷', href: '/dashboard/surveys/new', done: surveyCount > 0 },
    { id: 'qr', label: '列印 QR Code 收回饋', href: '/dashboard/surveys', done: responseCount > 0 },
  ];
  const onboardingDone = onboardingSteps.every(s => s.done);
  const onboardingProgress = Math.round((onboardingSteps.filter(s => s.done).length / onboardingSteps.length) * 100);
  const isDashboardHome = pathname === '/dashboard' || pathname === '/dashboard/';

  // Follow focused inputs
  useEffect(() => {
    function handleFocus(e: FocusEvent) {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        const rect = el.getBoundingClientRect();
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Position near the input
        const newBottom = Math.max(20, h - rect.bottom - 10);
        const newRight = rect.right + 70 < w ? w - rect.right - 60 : rect.left - 70 > 0 ? w - rect.left + 20 : 24;

        setPos(clampPos({ bottom: newBottom, right: newRight }));
        setIsNearInput(true);
      }
    }

    function handleBlur() {
      setTimeout(() => {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setPos(homePos);
          setIsNearInput(false);
        }
      }, 1500);
    }

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  // Gentle idle drift
  useEffect(() => {
    if (isOpen || isNearInput) return;
    const interval = setInterval(() => {
      setPos(p => clampPos({
        bottom: homePos.bottom + (Math.random() - 0.5) * 60,
        right: homePos.right + (Math.random() - 0.5) * 40,
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, isNearInput]);

  // Reset on page change
  useEffect(() => {
    setPos(homePos);
    setIsNearInput(false);
  }, [pathname]);

  // Show bubble — always show on page load after 1.5s
  useEffect(() => {
    setShowBubble(false);
    setHasInteracted(false);
    const timer = setTimeout(() => {
      if (!isOpen) setShowBubble(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showBubble) {
      const timer = setTimeout(() => setShowBubble(false), 9000);
      return () => clearTimeout(timer);
    }
  }, [showBubble]);

  useEffect(() => {
    if (isOpen) {
      setMessages(pageMessages.map(text => ({ text })));
      setShowBubble(false);
    }
  }, [isOpen, pathname]);

  useEffect(() => {
    if (showBubble && pageMessages[0]) {
      const msg = pageMessages[0];
      let i = 0;
      setDisplayedText('');
      const timer = setInterval(() => {
        i++;
        setDisplayedText(msg.slice(0, i));
        if (i >= msg.length) clearInterval(timer);
      }, 25);
      return () => clearInterval(timer);
    }
  }, [showBubble, pathname]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      {/* ═══ Bubble tip ═══ */}
      <AnimatePresence>
        {showBubble && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed z-[61] max-w-[260px]"
            style={{ bottom: pos.bottom + 64, right: pos.right - 10, transition: 'bottom 0.8s ease, right 0.8s ease' }}
          >
            <div className="relative bg-white rounded-2xl rounded-br-sm shadow-xl border border-[#FF8C00]/15 px-4 py-3">
              <div className="flex items-start gap-2">
                <motion.span
                  className="text-base shrink-0"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >🍽️</motion.span>
                <p className="text-xs text-[#3A3A3A] leading-relaxed">
                  {displayedText}
                  <motion.span
                    className="inline-block w-0.5 h-3 bg-[#FF8C00] ml-0.5 align-middle"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                </p>
              </div>
              <button
                onClick={() => setShowBubble(false)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-[#3A3A3A]/50 rounded-full flex items-center justify-center hover:bg-[#3A3A3A]"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Chat panel ═══ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 22 }}
            className="fixed z-[61] w-[340px] max-h-[440px] bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] overflow-hidden flex flex-col"
            style={{ bottom: pos.bottom + 70, right: Math.max(pos.right - 140, 10), transition: 'bottom 0.5s ease, right 0.5s ease' }}
          >
            <div className="bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] px-4 py-3 flex items-center gap-3">
              <motion.span
                className="text-xl"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >🍽️</motion.span>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">FeedBites 副店長</div>
                <div className="text-[10px] text-white/70 flex items-center gap-1">
                  <motion.span
                    className="w-1.5 h-1.5 bg-green-300 rounded-full"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  隨時為你服務
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[180px]">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12 }}
                  className="flex gap-2"
                >
                  <span className="text-sm shrink-0 mt-0.5">🍽️</span>
                  <div className="bg-[#FAF7F2] rounded-2xl rounded-tl-md px-3.5 py-2.5 text-xs text-[#3A3A3A] leading-relaxed max-w-[260px]">
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Onboarding checklist */}
              {isDashboardHome && !onboardingDone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="bg-gradient-to-br from-[#FF8C00]/5 to-[#FF6B00]/5 rounded-xl border border-[#FF8C00]/15 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-[#FF8C00]">開店進度</span>
                      <span className="text-[10px] font-bold text-[#FF8C00]">{onboardingProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-[#E8E2D8] rounded-full overflow-hidden mb-3">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${onboardingProgress}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      {onboardingSteps.map(step => (
                        step.done ? (
                          <div key={step.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] text-emerald-600 line-through opacity-60">
                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[9px] shrink-0">✓</span>
                            {step.label}
                          </div>
                        ) : (
                          <Link
                            key={step.id}
                            href={step.href}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] text-[#3A3A3A] bg-white border border-[#E8E2D8] hover:border-[#FF8C00] hover:shadow-sm transition-all"
                          >
                            <span className="w-4 h-4 rounded-full bg-[#FF8C00]/10 text-[#FF8C00] flex items-center justify-center text-[9px] shrink-0">→</span>
                            {step.label}
                          </Link>
                        )
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-2.5 border-t border-[#E8E2D8] bg-[#FAF7F2]">
              <p className="text-[10px] text-[#8A8585] text-center">
                {isDashboardHome && !onboardingDone ? '完成以上步驟，解鎖完整分析功能 ✨' : '副店長會根據你所在的頁面給出建議'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Floating Avatar ═══ */}
      <motion.button
        onClick={() => {
          setIsOpen(!isOpen);
          setHasInteracted(true);
          setShowBubble(false);
        }}
        className="fixed z-[60] group cursor-pointer"
        style={{
          bottom: pos.bottom,
          right: pos.right,
          transition: 'bottom 0.8s cubic-bezier(0.4,0,0.2,1), right 0.8s cubic-bezier(0.4,0,0.2,1)',
        }}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
      >
        {/* Breathing glow */}
        <motion.div
          className="absolute -inset-2 rounded-full pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 12px 4px rgba(255,140,0,0.10), 0 0 24px 8px rgba(255,140,0,0.05)',
              '0 0 20px 8px rgba(255,140,0,0.22), 0 0 40px 16px rgba(255,140,0,0.10)',
              '0 0 12px 4px rgba(255,140,0,0.10), 0 0 24px 8px rgba(255,140,0,0.05)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Orbiting dots */}
        <motion.div
          className="absolute w-1.5 h-1.5 rounded-full bg-[#FFD700]/60 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{ top: -4, left: '50%', marginLeft: -3, transformOrigin: '3px 32px' }}
        />
        <motion.div
          className="absolute w-1 h-1 rounded-full bg-[#FF8C00]/40 pointer-events-none"
          animate={{ rotate: -360 }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
          style={{ top: -2, left: '50%', marginLeft: -2, transformOrigin: '2px 30px' }}
        />

        {/* Sparkles */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute text-[7px] pointer-events-none select-none"
            animate={{ opacity: [0, 1, 0], scale: [0.3, 1, 0.3], y: [0, -12 - i * 6] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.7 }}
            style={{ top: -2, left: `${30 + i * 15}%` }}
          >✨</motion.div>
        ))}

        {/* Main orb */}
        <motion.div
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#FF8C00] to-[#FF6B00] flex items-center justify-center shadow-lg"
          animate={{ scale: [1, 1.04, 1], y: [0, -3, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.span key="face" className="text-2xl select-none" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                🍽️
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* First-visit pulse */}
        {!isOpen && !hasInteracted && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-[#FF8C00] pointer-events-none"
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>
    </>
  );
}
