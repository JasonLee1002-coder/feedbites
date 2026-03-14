'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, animate } from 'framer-motion';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';

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
    return [
      '建立問卷很簡單！選一個適合你風格的模板，3 分鐘就能上線。',
      '建議啟用折扣獎勵，回覆率可以提升 3 倍！',
      '問題不要太多，5-8 題最佳，客人填起來不會覺得煩。',
    ];
  }
  if (pathname.includes('/surveys') && pathname.includes('/qrcode')) {
    return ['把 QR Code 列印出來，放在每張桌上或結帳櫃台旁邊。', '建議用硬卡紙或壓克力立牌，比較耐用。'];
  }
  if (pathname.includes('/surveys/')) {
    return ['看看客人的回饋，文字留言通常是最有價值的改進線索。', '可以匯出 Excel 檔案，方便跟團隊分享數據。'];
  }
  if (pathname.includes('/surveys')) {
    if (context?.surveyCount === 0) return ['還沒有問卷呢！點「建立新問卷」開始收集客人回饋吧。', '10 種精美模板任你選，從日料到餐酒館都有。'];
    return ['記得定期檢查回覆，即時了解客人的想法。', '可以複製問卷來做 A/B 測試，看看哪個版本回覆率更高。'];
  }
  if (pathname.includes('/settings')) {
    return [
      '上傳 Logo 讓問卷更有品牌感，客人會覺得更專業。',
      '記得填寫「店家資料」！填完就能解鎖同業比較分析功能。',
      '邀請夥伴一起管理店家，大家權限相同，協作更方便。',
    ];
  }
  if (pathname.includes('/new-store')) {
    return ['歡迎加入 FeedBites！先幫你的餐廳取個名字吧。', '一個帳號可以管理好幾家店，之後隨時可以新增。'];
  }
  return [
    '嗨！我是你的 FeedBites 副店長，有什麼需要幫忙的隨時問我！',
    '每天花 2 分鐘看一下新回覆，持續改進就是最好的經營策略。',
    '把 QR Code 放在桌上，讓問卷自己收集回饋，你專心做菜就好。',
  ];
}

export default function AiAssistant({ dishCount = 0, surveyCount = 0 }: { dishCount?: number; surveyCount?: number }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<BubbleMessage[]>([]);
  const [showBubble, setShowBubble] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dynamic position
  const posX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth - 80 : 300);
  const posY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight - 80 : 500);
  const springX = useSpring(posX, { stiffness: 40, damping: 12 });
  const springY = useSpring(posY, { stiffness: 40, damping: 12 });

  const pageMessages = getPageMessages(pathname, { dishCount, surveyCount });

  // Home position — bottom area, slightly right of center on desktop
  const getHomePos = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // On desktop with sidebar (lg:pl-60 = 240px), offset to content area
    const sidebarOffset = w >= 1024 ? 240 : 0;
    const contentCenter = sidebarOffset + (w - sidebarOffset) / 2;
    return {
      x: Math.min(contentCenter + 120, w - 80),
      y: h - 100,
    };
  };

  // Initialize position
  useEffect(() => {
    const home = getHomePos();
    posX.set(home.x);
    posY.set(home.y);
  }, []);

  // Float near focused inputs
  useEffect(() => {
    function handleFocus(e: FocusEvent) {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        const rect = el.getBoundingClientRect();
        const w = window.innerWidth;
        // Position to the side of the input, vertically aligned
        const targetY = Math.min(Math.max(rect.top + rect.height / 2, 60), window.innerHeight - 80);

        if (rect.right + 80 < w) {
          // Space on the right — go right
          animate(posX, Math.min(rect.right + 30, w - 80), { duration: 0.8 });
        } else if (rect.left - 80 > 0) {
          // Space on the left
          animate(posX, rect.left - 70, { duration: 0.8 });
        }
        animate(posY, targetY, { duration: 0.8 });
      }
    }

    function handleBlur() {
      // Drift back toward home after a delay
      setTimeout(() => {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          const home = getHomePos();
          animate(posX, home.x, { duration: 1.2 });
          animate(posY, home.y, { duration: 1.2 });
        }
      }, 2000);
    }

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, [posX, posY]);

  // Gentle idle drift — wander slightly when nothing is happening
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        const home = getHomePos();
        const driftX = home.x + (Math.random() - 0.5) * 60;
        const driftY = home.y + (Math.random() - 0.5) * 40;
        animate(posX, Math.max(20, Math.min(driftX, window.innerWidth - 80)), { duration: 2 });
        animate(posY, Math.max(60, Math.min(driftY, window.innerHeight - 80)), { duration: 2 });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, posX, posY]);

  // Reset position on page change
  useEffect(() => {
    setTimeout(() => {
      const home = getHomePos();
      animate(posX, home.x, { duration: 1 });
      animate(posY, home.y, { duration: 1 });
    }, 500);
  }, [pathname]);

  // Show bubble
  useEffect(() => {
    setShowBubble(false);
    setHasInteracted(false);
    const timer = setTimeout(() => {
      if (!isOpen) setShowBubble(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [pathname]);

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
      {/* Bubble tip — follows the avatar */}
      <AnimatePresence>
        {showBubble && !isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed z-[61] max-w-[260px] pointer-events-auto"
            style={{
              x: springX,
              y: springY,
              translateX: '-110%',
              translateY: '-100%',
            }}
          >
            <div className="relative bg-white rounded-2xl rounded-br-sm shadow-xl border border-[#FF8C00]/15 px-4 py-3">
              <div className="flex items-start gap-2">
                <motion.span
                  className="text-base shrink-0"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🍽️
                </motion.span>
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
                className="absolute -top-2 -right-2 w-5 h-5 bg-[#3A3A3A]/50 rounded-full flex items-center justify-center hover:bg-[#3A3A3A] transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel — opens near avatar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 22 }}
            className="fixed z-[61] w-[340px] max-h-[440px] bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] overflow-hidden flex flex-col"
            style={{
              right: 20,
              bottom: 90,
            }}
          >
            <div className="bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] px-4 py-3 flex items-center gap-3">
              <motion.span
                className="text-xl"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                🍽️
              </motion.span>
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
              <div ref={messagesEndRef} />
            </div>
            <div className="px-4 py-2.5 border-t border-[#E8E2D8] bg-[#FAF7F2]">
              <p className="text-[10px] text-[#8A8585] text-center">副店長會根據你所在的頁面給出建議</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ The floating spirit avatar ═══ */}
      <motion.button
        onClick={() => {
          setIsOpen(!isOpen);
          setHasInteracted(true);
          setShowBubble(false);
        }}
        className="fixed z-[60] group cursor-pointer"
        style={{ x: springX, y: springY, translateX: '-50%', translateY: '-50%' }}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
      >
        {/* Breathing glow rings */}
        <motion.div
          className="absolute inset-[-8px] rounded-full"
          animate={{
            boxShadow: [
              '0 0 12px 4px rgba(255,140,0,0.12), 0 0 24px 8px rgba(255,140,0,0.06)',
              '0 0 20px 8px rgba(255,140,0,0.22), 0 0 40px 16px rgba(255,140,0,0.10)',
              '0 0 12px 4px rgba(255,140,0,0.12), 0 0 24px 8px rgba(255,140,0,0.06)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Orbiting dot 1 */}
        <motion.div
          className="absolute w-1.5 h-1.5 rounded-full bg-[#FFD700]/60"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{ top: -6, left: '50%', marginLeft: -3, transformOrigin: '3px 34px' }}
        />
        {/* Orbiting dot 2 */}
        <motion.div
          className="absolute w-1 h-1 rounded-full bg-[#FF8C00]/50"
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          style={{ top: -4, left: '50%', marginLeft: -2, transformOrigin: '2px 30px' }}
        />

        {/* Sparkles */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute text-[7px] pointer-events-none"
            animate={{
              opacity: [0, 1, 0],
              scale: [0.3, 1, 0.3],
              x: [0, (i - 1) * 18],
              y: [0, -15 - i * 8],
            }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8 }}
            style={{ top: -2, left: '50%' }}
          >
            ✨
          </motion.div>
        ))}

        {/* Main orb */}
        <motion.div
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#FF8C00] to-[#FF6B00] flex items-center justify-center shadow-lg"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.span key="face" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-2xl select-none">
                🍽️
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Pulse ring for first visit */}
        {!isOpen && !hasInteracted && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-[#FF8C00]"
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>
    </>
  );
}
