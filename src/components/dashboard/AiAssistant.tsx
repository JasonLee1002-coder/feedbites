'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';

interface BubbleMessage {
  text: string;
  link?: string;
  linkLabel?: string;
  role?: 'assistant' | 'user';
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
    ];
  }
  if (pathname.includes('/surveys/new')) {
    return ['建立問卷很簡單！選一個適合你風格的模板，3 分鐘就能上線。', '建議啟用折扣獎勵，回覆率可以提升 3 倍！'];
  }
  if (pathname.includes('/surveys') && pathname.includes('/qrcode')) {
    return ['把 QR Code 列印出來，放在每張桌上或結帳櫃台旁邊。'];
  }
  if (pathname.includes('/surveys/')) {
    return ['看看客人的回饋，文字留言通常是最有價值的改進線索。'];
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
    '嗨！我是你的 FeedBites 副店長，有什麼需要幫忙的隨時問我！',
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
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [messages, setMessages] = useState<BubbleMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'assistant' | 'user'; content: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [liveStats, setLiveStats] = useState<{
    todayResponses?: number;
    overallAvg?: number | null;
  }>({});

  // Fetch live stats
  useEffect(() => {
    fetch('/api/ai/assistant-stats')
      .then(r => r.ok ? r.json() : {})
      .then(data => setLiveStats(data))
      .catch(() => {});
  }, []);

  // Load chat history when panel opens for the first time
  useEffect(() => {
    if (!isOpen || historyLoaded) return;
    fetch('/api/ai/assistant-history')
      .then((r) => r.ok ? r.json() : { history: [] })
      .then(({ history }: { history: Array<{ role: string; content: string }> }) => {
        if (history.length > 0) {
          const bubbles = history.map((h) => ({
            text: h.content,
            role: h.role as 'user' | 'assistant',
          }));
          const chatH = history.map((h) => ({
            role: h.role as 'user' | 'assistant',
            content: h.content,
          }));
          setMessages(bubbles);
          setChatHistory(chatH);
        }
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, [isOpen, historyLoaded]);

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

  // Celebrate completed steps
  const prevCompletedRef = useRef(completedCount);
  useEffect(() => {
    if (completedCount > prevCompletedRef.current) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { x: 0.8, y: 0.5 },
        colors: ['#FF8C00', '#FFD700', '#FF6B00', '#C5A55A'],
      });
      if (onboardingDone) {
        setTimeout(() => {
          confetti({ particleCount: 100, spread: 100, origin: { y: 0.4 }, colors: ['#FF8C00', '#FFD700', '#FF6B00'] });
        }, 500);
      }
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount, onboardingDone]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => chatInputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // On panel open with no history — show page-contextual greeting
  useEffect(() => {
    if (isOpen && historyLoaded && chatHistory.length === 0 && messages.length === 0) {
      const pageMessages = getPageMessages(pathname, { dishCount, surveyCount });

      // Live stats greeting
      const { todayResponses, overallAvg } = liveStats;
      const greeting: BubbleMessage[] = [];
      if (isDashboardHome && todayResponses && todayResponses > 0) {
        greeting.push({
          text: `今天已有 ${todayResponses} 筆回饋${overallAvg ? `，平均 ${overallAvg.toFixed(1)} 分 ${overallAvg >= 4 ? '🎉' : '💪'}` : ''} 有什麼需要我分析的嗎？`,
          role: 'assistant',
        });
      } else {
        greeting.push(...pageMessages.map(text => ({ text, role: 'assistant' as const })));
      }
      setMessages(greeting);
    }
  }, [isOpen, historyLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // AI chat
  const sendChat = useCallback(async (text: string) => {
    if (!text.trim() || chatLoading) return;
    const userMsg: BubbleMessage = { text: text.trim(), role: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    const newHistory = [...chatHistory, { role: 'user' as const, content: text.trim() }];
    setChatHistory(newHistory);

    try {
      const res = await fetch('/api/ai/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: newHistory,
          currentPage: pathname,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: BubbleMessage = { text: data.reply, role: 'assistant' };
        setMessages(prev => [...prev, aiMsg]);
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { text: '抱歉，我剛剛走神了 😅 再說一次？', role: 'assistant' }]);
      }
    } catch {
      setMessages(prev => [...prev, { text: '網路好像有點問題，等等再試？', role: 'assistant' }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
  }, [chatLoading, chatHistory, pathname]);

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat(chatInput);
    }
  };

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div className="fixed bottom-0 right-6 z-[60] w-[340px] flex flex-col" style={{ maxHeight: 'calc(100vh - 80px)' }}>

      {/* ═══ Chat panel ═══ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="flex flex-col bg-white rounded-t-2xl shadow-2xl border border-[#E8E2D8] border-b-0 overflow-hidden"
            style={{ maxHeight: 'calc(100vh - 130px)' }}
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i < 3 ? i * 0.08 : 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role !== 'user' && (
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-[#FF8C00]/10 flex items-center justify-center shrink-0 mt-0.5">
                      {avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-black text-[#FF8C00]" style={{ fontFamily: 'Georgia, serif' }}>F</span>
                      )}
                    </div>
                  )}
                  <div className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed max-w-[260px] ${
                    msg.role === 'user'
                      ? 'rounded-br-md bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white'
                      : 'rounded-tl-md bg-[#FAF7F2] text-[#3A3A3A]'
                  }`}>
                    <span>{msg.text}</span>
                    {msg.link && (
                      <Link
                        href={msg.link}
                        onClick={() => setIsOpen(false)}
                        className="block mt-2 px-3 py-1.5 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white text-[11px] font-bold rounded-lg text-center hover:shadow-md transition-all"
                      >
                        {msg.linkLabel || '前往 →'}
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* AI loading */}
              {chatLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#FF8C00]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-black text-[#FF8C00]" style={{ fontFamily: 'Georgia, serif' }}>F</span>
                  </div>
                  <div className="bg-[#FAF7F2] rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[#FF8C00]"
                          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Onboarding checklist */}
              {isDashboardHome && !onboardingDone && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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
                            <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[9px] shrink-0">✓</span>
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

            {/* Chat input */}
            <div className="px-3 py-2.5 border-t border-[#E8E2D8] bg-white">
              <div className="flex items-center gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="跟副店長聊聊..."
                  disabled={chatLoading}
                  className="flex-1 px-3 py-2 rounded-full border border-[#E8E2D8] text-xs outline-none focus:border-[#FF8C00] focus:ring-1 focus:ring-[#FF8C00]/20 bg-[#FAF7F2] transition-all disabled:opacity-50"
                />
                <motion.button
                  onClick={() => sendChat(chatInput)}
                  disabled={!chatInput.trim() || chatLoading}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white disabled:opacity-30 shrink-0"
                  whileTap={{ scale: 0.9 }}
                >
                  {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Toggle bar — always visible at bottom ═══ */}
      <button
        onClick={toggleOpen}
        className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white rounded-t-2xl shadow-lg hover:shadow-xl transition-shadow select-none"
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/30 bg-white/20 flex items-center justify-center shrink-0">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-base font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>F</span>
          )}
        </div>

        {/* Title */}
        <div className="flex-1 text-left">
          <div className="text-sm font-bold leading-tight">FeedBites 副店長</div>
          <div className="text-[10px] text-white/70 flex items-center gap-1">
            <motion.span
              className="w-1.5 h-1.5 bg-green-300 rounded-full inline-block"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            隨時為你服務
          </div>
        </div>

        {/* Expand/collapse icon */}
        <motion.div
          animate={{ rotate: isOpen ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-white/80" />
        </motion.div>
      </button>
    </div>
  );
}
