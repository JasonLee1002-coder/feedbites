'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface BubbleMessage {
  text: string;
  isNew?: boolean;
}

// 根據頁面路徑給出不同的 AI 提示
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
    return [
      '把 QR Code 列印出來，放在每張桌上或結帳櫃台旁邊。',
      '建議用硬卡紙或壓克力立牌，比較耐用。',
    ];
  }

  if (pathname.includes('/surveys/')) {
    return [
      '看看客人的回饋，文字留言通常是最有價值的改進線索。',
      '可以匯出 Excel 檔案，方便跟團隊分享數據。',
    ];
  }

  if (pathname.includes('/surveys')) {
    if (context?.surveyCount === 0) {
      return [
        '還沒有問卷呢！點「建立新問卷」開始收集客人回饋吧。',
        '5 種精美模板任你選，從日料到咖啡廳都有。',
      ];
    }
    return [
      '記得定期檢查回覆，即時了解客人的想法。',
      '可以複製問卷來做 A/B 測試，看看哪個版本回覆率更高。',
    ];
  }

  if (pathname.includes('/settings')) {
    return [
      '上傳 Logo 讓問卷更有品牌感，客人會覺得更專業。',
      '記得填寫「店家資料」！我們會根據這些資訊提供同業比較和經營建議。',
      '邀請夥伴一起管理店家，大家權限相同，協作更方便。',
      '料理類型、客單價、地區 — 這三個欄位最重要，填完就能解鎖分析功能。',
    ];
  }

  if (pathname.includes('/new-store')) {
    return [
      '歡迎加入 FeedBites！先幫你的餐廳取個名字吧。',
      '一個帳號可以管理好幾家店，之後隨時可以新增。',
    ];
  }

  // Dashboard home
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
  const [currentMsgIdx, setCurrentMsgIdx] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const pageMessages = getPageMessages(pathname, { dishCount, surveyCount });

  // Show bubble tip after 2 seconds on page
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && !hasInteracted) {
        setShowBubble(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [pathname, isOpen, hasInteracted]);

  // Auto-hide bubble after 8 seconds
  useEffect(() => {
    if (showBubble) {
      const timer = setTimeout(() => setShowBubble(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showBubble]);

  // Load messages when opened
  useEffect(() => {
    if (isOpen) {
      setMessages(pageMessages.map((text, i) => ({ text, isNew: i === 0 })));
      setShowBubble(false);
    }
  }, [isOpen, pathname]);

  // Typewriter for bubble
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

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      {/* Floating bubble tip */}
      <AnimatePresence>
        {showBubble && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-[60] max-w-[280px]"
          >
            <div className="relative bg-white rounded-2xl rounded-br-md shadow-lg border border-[#FF8C00]/20 px-4 py-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#FF8C00] shrink-0 mt-0.5" />
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
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#E8E2D8] rounded-full flex items-center justify-center hover:bg-[#d0c9bd] transition-colors"
              >
                <X className="w-3 h-3 text-[#8A8585]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-24 right-6 z-[60] w-[340px] max-h-[480px] bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] px-4 py-3 flex items-center gap-3">
              <motion.div
                className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </motion.div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">FeedBites 副店長</div>
                <div className="text-[10px] text-white/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                  隨時為你服務
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex gap-2"
                >
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#FF8C00] to-[#FF6B00] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-[#FAF7F2] rounded-2xl rounded-tl-md px-3.5 py-2.5 text-xs text-[#3A3A3A] leading-relaxed max-w-[260px]">
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-[#E8E2D8] bg-[#FAF7F2]">
              <p className="text-[10px] text-[#8A8585] text-center">
                副店長會根據你所在的頁面給出建議
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => {
          setIsOpen(!isOpen);
          setHasInteracted(true);
          setShowBubble(false);
        }}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-[#FF8C00] to-[#FF6B00] text-white shadow-lg shadow-[#FF8C00]/30 flex items-center justify-center hover:shadow-xl hover:shadow-[#FF8C00]/40 transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse ring */}
        {!isOpen && !hasInteracted && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-[#FF8C00]"
            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.button>
    </>
  );
}
