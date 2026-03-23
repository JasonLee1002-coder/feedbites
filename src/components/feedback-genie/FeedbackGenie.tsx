'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, X, Mic, MicOff, Loader2, Sparkles, Volume2,
} from 'lucide-react';

interface ChatMessage {
  role: 'genie' | 'customer';
  content: string;
  timestamp: Date;
}

interface FeedbackGenieProps {
  storeId: string;
  storeName?: string;
  /** 精靈頭像 URL */
  avatarUrl?: string | null;
  /** 觸發來源 */
  source?: 'chat' | 'survey' | 'widget';
  /** 初始問候語（可自訂） */
  greeting?: string;
  /** 精靈角色名稱 */
  genieName?: string;
  /** 品牌主色 */
  primaryColor?: string;
  /** 對話完成回調 */
  onComplete?: (conversationId: string) => void;
  /** 控制顯示/隱藏 */
  defaultOpen?: boolean;
}

const GREETINGS = [
  '嗨！感謝你今天來用餐 😊 聊聊你的體驗吧，什麼讓你印象最深刻？',
  '嗨！歡迎！今天用餐開心嗎？跟我分享一下你的感覺吧 ✨',
  '你好呀！感謝光臨 🙌 今天有什麼特別想跟我們說的嗎？',
];

export default function FeedbackGenie({
  storeId,
  storeName = '餐廳',
  avatarUrl,
  source = 'chat',
  greeting,
  genieName = '回報精靈',
  primaryColor = '#FF8C00',
  onComplete,
  defaultOpen = false,
}: FeedbackGenieProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showEntrance, setShowEntrance] = useState(true);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [hasShownBubble, setHasShownBubble] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 初始問候
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greetingMsg = greeting || GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      typeMessage(greetingMsg, () => {
        setMessages([{ role: 'genie', content: greetingMsg, timestamp: new Date() }]);
      });
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // 入口氣泡動畫
  useEffect(() => {
    if (!hasShownBubble) {
      const timer = setTimeout(() => setHasShownBubble(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasShownBubble]);

  // 自動捲動
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingText]);

  // 打字機效果
  const typeMessage = useCallback((text: string, onDone?: () => void) => {
    setIsTyping(true);
    setTypingText('');
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setTypingText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setIsTyping(false);
        setTypingText('');
        onDone?.();
      }
    }, 20);
    return () => clearInterval(timer);
  }, []);

  // 發送訊息
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const customerMsg: ChatMessage = { role: 'customer', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, customerMsg]);
    setInput('');
    setIsLoading(true);
    setTurnCount(prev => prev + 1);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/feedback-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          storeName,
          conversationId,
          sessionId,
          message: text.trim(),
          history,
          source,
        }),
      });

      if (!res.ok) throw new Error('回應失敗');

      const data = await res.json();
      setConversationId(data.conversationId);

      // 打字機效果顯示 AI 回覆
      typeMessage(data.reply, () => {
        setMessages(prev => [
          ...prev,
          { role: 'genie', content: data.reply, timestamp: new Date() },
        ]);
      });

      // 5 輪後提示可以結束
      if (turnCount >= 4 && onComplete) {
        onComplete(data.conversationId);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'genie', content: '抱歉，我剛剛走神了 😅 可以再說一次嗎？', timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, storeId, storeName, conversationId, sessionId, source, turnCount, onComplete, typeMessage]);

  // 語音錄音
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', blob, `feedback.${mimeType.includes('webm') ? 'webm' : 'mp4'}`);
          formData.append('questionLabel', '客戶回饋');
          formData.append('surveyTitle', storeName);

          const res = await fetch('/api/ai/voice-feedback', { method: 'POST', body: formData });
          if (res.ok) {
            const data = await res.json();
            if (data.transcript) {
              setInput(data.polished || data.transcript);
              inputRef.current?.focus();
            }
          }
        } catch {
          // ignore
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      // 麥克風權限被拒
    }
  }, [storeName]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const darkerColor = primaryColor === '#FF8C00' ? '#FF6B00' : primaryColor;

  return (
    <>
      {/* ═══ 浮動入口按鈕 ═══ */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-[55]"
          >
            {/* 入口氣泡提示 */}
            <AnimatePresence>
              {showEntrance && hasShownBubble && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  className="absolute bottom-[72px] right-0 w-[220px] p-3 rounded-2xl rounded-br-sm backdrop-blur-md"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    border: `1px solid ${primaryColor}20`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  }}
                >
                  <p className="text-[13px] text-[#3A3A3A] leading-relaxed">
                    有什麼想跟我們說的嗎？點我聊聊 💬
                  </p>
                  <button
                    onClick={() => setShowEntrance(false)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-[#3A3A3A]/40 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 主按鈕 */}
            <motion.button
              onClick={() => { setIsOpen(true); setShowEntrance(false); }}
              className="relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${darkerColor})`,
                boxShadow: `0 6px 24px ${primaryColor}40`,
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* 脈衝環 */}
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${primaryColor}` }}
                animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <MessageCircle className="w-6 h-6" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ 聊天面板 ═══ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-6 right-6 z-[55] w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center gap-3 shrink-0"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${darkerColor})` }}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 bg-white/20 flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">{genieName}</div>
                <div className="text-[10px] text-white/70 flex items-center gap-1">
                  <motion.span
                    className="w-1.5 h-1.5 bg-green-300 rounded-full"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  正在聽你說...
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 訊息區域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAF8]">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i === messages.length - 1 ? 0 : 0 }}
                  className={`flex ${msg.role === 'customer' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'genie' && (
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-[#FF8C00]/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-[#FF8C00]" />
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'customer'
                        ? 'rounded-2xl rounded-br-md text-white'
                        : 'rounded-2xl rounded-tl-md bg-white border border-[#E8E2D8] text-[#3A3A3A]'
                    }`}
                    style={msg.role === 'customer' ? {
                      background: `linear-gradient(135deg, ${primaryColor}, ${darkerColor})`,
                    } : undefined}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {/* 打字機效果 */}
              {isTyping && typingText && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-[#FF8C00]/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF8C00]" />
                  </div>
                  <div className="max-w-[75%] px-3.5 py-2.5 text-[13px] leading-relaxed rounded-2xl rounded-tl-md bg-white border border-[#E8E2D8] text-[#3A3A3A]">
                    {typingText}
                    <motion.span
                      className="inline-block w-0.5 h-3.5 ml-0.5 align-middle rounded-full"
                      style={{ background: primaryColor }}
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Loading */}
              {isLoading && !isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="w-7 h-7 rounded-full bg-[#FF8C00]/10 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF8C00]" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white border border-[#E8E2D8]">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{ background: primaryColor }}
                          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 輸入區 */}
            <div className="px-3 py-3 border-t border-[#E8E2D8] bg-white shrink-0">
              <div className="flex items-center gap-2">
                {/* 語音按鈕 */}
                <motion.button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isRecording
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                      : isTranscribing
                      ? 'bg-[#E8E2D8] text-[#8A8585]'
                      : 'bg-[#FAF7F2] text-[#8A8585] hover:text-[#FF8C00] hover:bg-[#FF8C00]/10'
                  }`}
                  whileTap={{ scale: 0.9 }}
                  animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
                  transition={isRecording ? { duration: 1, repeat: Infinity } : {}}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </motion.button>

                {/* 文字輸入 */}
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isRecording ? '錄音中...' : '說說你的想法...'}
                    disabled={isLoading || isRecording}
                    className="w-full px-4 py-2.5 rounded-full border border-[#E8E2D8] text-sm outline-none focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20 bg-[#FAF7F2] transition-all disabled:opacity-50 pr-10"
                  />
                  {isRecording && (
                    <motion.div
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      animate={{ opacity: [1, 0.3] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    >
                      <Volume2 className="w-4 h-4 text-red-500" />
                    </motion.div>
                  )}
                </div>

                {/* 發送按鈕 */}
                <motion.button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white disabled:opacity-30 transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${darkerColor})`,
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>

              {/* 隱私提示 */}
              <p className="text-[9px] text-[#B0A8A0] text-center mt-2">
                你的回饋會幫助我們變得更好 · 對話內容僅供改善服務使用
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
