'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';

interface BubbleMessage {
  text: string;
  link?: string;  // clickable navigation
  linkLabel?: string;
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
  avatarUrl?: string | null;
}

export default function AiAssistant({ storeName = '', hasLogo = false, dishCount = 0, surveyCount = 0, responseCount = 0, avatarUrl }: AiProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<BubbleMessage[]>([]);
  const [showBubble, setShowBubble] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Position — uses top/right relative to viewport, floats in content area
  const [pos, setPos] = useState({ top: 300, right: 40 });
  const [isNearInput, setIsNearInput] = useState(false);

  // Content-aware home: near the content, not viewport edge
  const getHomePos = () => {
    if (typeof window === 'undefined') return { top: 300, right: 40 };
    const h = window.innerHeight;
    const w = window.innerWidth;
    // On desktop with sidebar (lg = 1024+), content area starts at 240px
    const sidebarW = w >= 1024 ? 240 : 0;
    const contentW = w - sidebarW;
    // Position just inside the right edge of content (not viewport)
    // Content max-width is ~1152px (max-w-6xl), centered
    const contentRight = contentW > 1152 ? (contentW - 1152) / 2 + sidebarW : sidebarW;
    const rightOffset = Math.max(20, contentRight + 10);
    return { top: Math.round(h * 0.4), right: rightOffset };
  };

  const clampPos = (p: { top: number; right: number }) => ({
    top: Math.max(80, Math.min(p.top, (typeof window !== 'undefined' ? window.innerHeight : 800) - 100)),
    right: Math.max(10, Math.min(p.right, 200)),
  });

  const rawPageMessages = getPageMessages(pathname, { dishCount, surveyCount });

  // Smart proactive messages with navigation links
  // Flow: 設定(Logo+資料) → 菜單 → 問卷 → QR Code
  const getProactiveMessage = (): BubbleMessage | null => {
    if (pathname.includes('/settings')) {
      if (!hasLogo && dishCount === 0) return { text: '填完資料記得上傳 Logo 喔！然後下一步去建菜單 ✨', link: '/dashboard/menu', linkLabel: '去建立菜單 →' };
      if (!hasLogo) return { text: '差一步！上傳 Logo 讓你的問卷更有品牌感 📸' };
      if (dishCount === 0) return { text: '設定完成！下一步去建立你的招牌菜吧', link: '/dashboard/menu', linkLabel: '去建立菜單 →' };
      if (surveyCount === 0) return { text: '太好了！設定和菜單都搞定了 ✨ 來建立問卷吧', link: '/dashboard/surveys/new', linkLabel: '去建立問卷 →' };
      return null;
    }
    if (pathname.includes('/menu')) {
      if (dishCount === 0) return { text: '上傳你的菜單照片，我幫你自動辨識！或手動新增也行', link: undefined, linkLabel: undefined };
      if (surveyCount === 0) return { text: `菜單有 ${dishCount} 道菜了！下一步建立問卷讓客人評分`, link: '/dashboard/surveys/new', linkLabel: '去建立問卷 →' };
      return null;
    }
    if (pathname.includes('/surveys/new')) {
      return null; // 正在建問卷，不要打擾
    }
    if (pathname.includes('/surveys')) {
      if (surveyCount > 0 && responseCount === 0) return { text: '問卷已建好！列印 QR Code 放桌上就能收回饋', link: undefined, linkLabel: undefined };
      return null;
    }
    // Dashboard home — guide to next incomplete step
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      if (!hasLogo && dishCount === 0 && surveyCount === 0) return { text: '嗨！我是你的副店長 ✨ 先來設定店家基本資料吧', link: '/dashboard/settings', linkLabel: '前往設定 →' };
      if (!hasLogo) return { text: '記得去設定頁上傳 Logo，品牌感很重要！', link: '/dashboard/settings', linkLabel: '前往設定 →' };
      if (dishCount === 0) return { text: '下一步去建立菜單！上傳招牌菜照片吧', link: '/dashboard/menu', linkLabel: '去建立菜單 →' };
      if (surveyCount === 0) return { text: '菜單建好了！來建立第一份問卷吧', link: '/dashboard/surveys/new', linkLabel: '去建立問卷 →' };
      if (responseCount === 0) return { text: '問卷上線了！列印 QR Code 放桌上開始收集回饋', link: '/dashboard/surveys', linkLabel: '查看問卷 →' };
      if (responseCount > 0 && responseCount < 10) return { text: `已收到 ${responseCount} 筆回覆，繼續加油！💪` };
      return null;
    }
    return null;
  };

  const proactiveMsg = getProactiveMessage();
  const pageMessages: BubbleMessage[] = [
    ...(proactiveMsg ? [proactiveMsg] : []),
    ...rawPageMessages.map(text => ({ text })),
  ];

  // Onboarding
  const onboardingSteps = [
    { id: 'logo', label: '上傳 Logo', href: '/dashboard/settings', done: hasLogo },
    { id: 'menu', label: '建立菜單', href: '/dashboard/menu', done: dishCount > 0 },
    { id: 'survey', label: '建立問卷', href: '/dashboard/surveys/new', done: surveyCount > 0 },
    { id: 'qr', label: '列印 QR Code 收回饋', href: '/dashboard/surveys', done: responseCount > 0 },
  ];
  const completedCount = onboardingSteps.filter(s => s.done).length;
  const onboardingDone = completedCount === onboardingSteps.length;
  const onboardingProgress = Math.round((completedCount / onboardingSteps.length) * 100);
  const isDashboardHome = pathname === '/dashboard' || pathname === '/dashboard/';

  // Celebrate when new steps are completed
  const prevCompletedRef = useRef(completedCount);
  useEffect(() => {
    if (completedCount > prevCompletedRef.current) {
      // A step was just completed — celebrate!
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { x: 0.8, y: 0.5 },
        colors: ['#FF8C00', '#FFD700', '#FF6B00', '#C5A55A'],
      });

      const celebrationMessages = [
        '太棒了！又完成一個步驟 🎉',
        '做得好！繼續下一步吧 ✨',
        '進度 +1！你離開店達人越來越近了 💪',
        '完美！再接再厲 🔥',
      ];
      const msg = celebrationMessages[completedCount - 1] || celebrationMessages[0];

      // Force show bubble with celebration
      setShowBubble(true);
      setDisplayedText('');
      let i = 0;
      const timer = setInterval(() => {
        i++;
        setDisplayedText(msg.slice(0, i));
        if (i >= msg.length) clearInterval(timer);
      }, 25);

      if (onboardingDone) {
        // All done — big celebration
        setTimeout(() => {
          confetti({ particleCount: 100, spread: 100, origin: { y: 0.4 }, colors: ['#FF8C00', '#FFD700', '#FF6B00'] });
        }, 500);
      }
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount, onboardingDone]);

  // Follow focused inputs
  useEffect(() => {
    function handleFocus(e: FocusEvent) {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        const rect = el.getBoundingClientRect();
        const w = window.innerWidth;

        // Position beside the input
        const newTop = Math.round(rect.top + rect.height / 2 - 28);
        const newRight = rect.right + 80 < w ? w - rect.right - 50 : rect.left > 80 ? w - rect.left + 20 : 40;

        setPos(clampPos({ top: newTop, right: newRight }));
        setIsNearInput(true);
      }
    }

    function handleBlur() {
      setTimeout(() => {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setPos(getHomePos());
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
      const home = getHomePos();
      setPos(clampPos({
        top: home.top + (Math.random() - 0.5) * 80,
        right: home.right + (Math.random() - 0.5) * 50,
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, isNearInput]);

  // Follow scroll — keep avatar vertically centered in viewport
  useEffect(() => {
    let ticking = false;
    function handleScroll() {
      if (ticking || isNearInput || isOpen) return;
      ticking = true;
      requestAnimationFrame(() => {
        const home = getHomePos();
        setPos(p => ({ ...p, top: home.top + (Math.random() - 0.5) * 30 }));
        ticking = false;
      });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isNearInput, isOpen]);

  // Reset on page change
  useEffect(() => {
    setPos(getHomePos());
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
      setMessages(pageMessages);
      setShowBubble(false);
    }
  }, [isOpen, pathname]);

  useEffect(() => {
    if (showBubble && pageMessages[0]) {
      const msgText = pageMessages[0].text;
      let i = 0;
      setDisplayedText('');
      const timer = setInterval(() => {
        i++;
        setDisplayedText(msgText.slice(0, i));
        if (i >= msgText.length) clearInterval(timer);
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
            style={{ top: pos.top - 70, right: pos.right - 10, transition: 'top 0.8s ease, right 0.8s ease' }}
          >
            <div className="relative bg-white rounded-2xl rounded-br-sm shadow-xl border border-[#FF8C00]/15 px-4 py-3">
              <div className="flex items-start gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/feedbites-logo.png" alt="" className="w-5 h-5 object-contain shrink-0" />
                <div className="text-xs text-[#3A3A3A] leading-relaxed">
                  <span>
                    {displayedText}
                    <motion.span
                      className="inline-block w-0.5 h-3 bg-[#FF8C00] ml-0.5 align-middle"
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    />
                  </span>
                  {proactiveMsg?.link && displayedText.length === proactiveMsg.text.length && (
                    <Link
                      href={proactiveMsg.link}
                      className="inline-block mt-2 px-3 py-1 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white text-[10px] font-bold rounded-md hover:shadow-md transition-all"
                    >
                      {proactiveMsg.linkLabel || '前往 →'}
                    </Link>
                  )}
                </div>
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
            style={{ top: pos.top - 200, right: Math.max(pos.right - 140, 10), transition: 'top 0.5s ease, right 0.5s ease' }}
          >
            <div className="bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] px-4 py-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/feedbites-logo.png" alt="" className="w-7 h-7 object-contain" />
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/feedbites-logo.png" alt="" className="w-4 h-4 object-contain shrink-0 mt-0.5" />
                  <div className="bg-[#FAF7F2] rounded-2xl rounded-tl-md px-3.5 py-2.5 text-xs text-[#3A3A3A] leading-relaxed max-w-[260px]">
                    <span>{msg.text}</span>
                    {msg.link && (
                      <Link
                        href={msg.link}
                        onClick={() => setIsOpen(false)}
                        className="block mt-2 px-3 py-1.5 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white text-[11px] font-bold rounded-lg text-center hover:shadow-md hover:shadow-[#FF8C00]/20 transition-all"
                      >
                        {msg.linkLabel || '前往 →'}
                      </Link>
                    )}
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
          top: pos.top,
          right: pos.right,
          transition: 'top 0.8s cubic-bezier(0.4,0,0.2,1), right 0.8s cubic-bezier(0.4,0,0.2,1)',
        }}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.85 }}
      >
        {/* Cold blue outer ring */}
        <motion.div
          className="absolute -inset-3 rounded-full pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 8px 2px rgba(100,180,255,0.15), 0 0 20px 6px rgba(100,180,255,0.08)',
              '0 0 14px 5px rgba(100,180,255,0.30), 0 0 35px 12px rgba(100,180,255,0.12)',
              '0 0 8px 2px rgba(100,180,255,0.15), 0 0 20px 6px rgba(100,180,255,0.08)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Blue orbit ring 1 */}
        <motion.div
          className="absolute -inset-2 rounded-full border border-[#64B4FF]/20 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        {/* Blue orbit ring 2 (reverse) */}
        <motion.div
          className="absolute -inset-4 rounded-full border border-[#64B4FF]/10 pointer-events-none"
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />

        {/* Orbiting blue dots */}
        <motion.div
          className="absolute w-1.5 h-1.5 rounded-full bg-[#64B4FF]/70 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{ top: -6, left: '50%', marginLeft: -3, transformOrigin: '3px 35px' }}
        />
        <motion.div
          className="absolute w-1 h-1 rounded-full bg-[#A0D0FF]/60 pointer-events-none"
          animate={{ rotate: -360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          style={{ top: -4, left: '50%', marginLeft: -2, transformOrigin: '2px 33px' }}
        />
        <motion.div
          className="absolute w-1 h-1 rounded-full bg-[#FFD700]/50 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          style={{ top: -3, left: '50%', marginLeft: -2, transformOrigin: '2px 31px' }}
        />

        {/* Sparkles */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute text-[7px] pointer-events-none select-none"
            animate={{ opacity: [0, 1, 0], scale: [0.3, 1, 0.3], y: [0, -14 - i * 5] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8 }}
            style={{ top: -4, left: `${25 + i * 20}%` }}
          >✨</motion.div>
        ))}

        {/* Main orb — owner avatar or FeedBites logo */}
        <motion.div
          className="relative w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg overflow-hidden border-2 border-[#64B4FF]/30"
          animate={{ scale: [1, 1.05, 1], y: [0, -3, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="w-5 h-5 text-[#FF8C00]" />
              </motion.div>
            ) : (
              <motion.div key="logo" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl || '/feedbites-logo.png'}
                  alt="副店長"
                  className={avatarUrl ? 'w-full h-full object-cover' : 'w-9 h-9 object-contain'}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Inner warm glow (orange) */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{
            boxShadow: [
              'inset 0 0 6px 2px rgba(255,140,0,0.10)',
              'inset 0 0 10px 4px rgba(255,140,0,0.20)',
              'inset 0 0 6px 2px rgba(255,140,0,0.10)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* First-visit pulse — blue */}
        {!isOpen && !hasInteracted && (
          <motion.span
            className="absolute -inset-1 rounded-full border-2 border-[#64B4FF] pointer-events-none"
            animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>
    </>
  );
}
