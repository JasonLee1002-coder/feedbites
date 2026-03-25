'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';

interface FeedbackGenieProps {
  storeId: string;
  storeName?: string;
  avatarUrl?: string | null;
  source?: 'chat' | 'survey' | 'widget';
  greeting?: string;
  genieName?: string;
  primaryColor?: string;
  onComplete?: (conversationId: string) => void;
  defaultOpen?: boolean;
  mode?: 'customer' | 'owner';
}

export default function FeedbackGenie({
  storeId,
  storeName = '餐廳',
  source = 'widget',
  primaryColor = '#FF8C00',
  onComplete,
  mode = 'customer',
}: FeedbackGenieProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const isOwner = mode === 'owner';
  const posClass = isOwner ? 'fixed bottom-6 left-6 z-[55]' : 'fixed bottom-6 right-6 z-[55]';

  async function handleSubmit() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/ai/feedback-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          storeName,
          sessionId: crypto.randomUUID(),
          message: text.trim(),
          history: [],
          source,
          metadata: { formMode: true, reporterMode: mode },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSent(true);
        onComplete?.(data.conversationId);
      }
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  }

  function handleClose() {
    setIsOpen(false);
    setText('');
    setSent(false);
  }

  return (
    <>
      {/* 浮動按鈕 */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className={`${posClass} w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white`}
            style={{ background: primaryColor }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <MessageCircle className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 回報面板 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25 }}
            className={`${posClass} w-[320px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] overflow-hidden`}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: primaryColor }}>
              <span className="text-sm font-bold text-white">
                {isOwner ? '問題回報' : '意見回報'}
              </span>
              <button onClick={handleClose} className="text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {sent ? (
                <div className="text-center py-4">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm font-medium text-[#3A3A3A]">已收到，謝謝！</p>
                  <button
                    onClick={handleClose}
                    className="mt-3 px-4 py-1.5 text-xs font-medium rounded-lg text-white"
                    style={{ background: primaryColor }}
                  >
                    關閉
                  </button>
                </div>
              ) : (
                <>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={isOwner ? '描述你遇到的問題或建議...' : '有什麼想跟我們說的？'}
                    rows={3}
                    maxLength={2000}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] bg-[#FAF7F2] resize-none"
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleSubmit}
                      disabled={!text.trim() || sending}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg disabled:opacity-40"
                      style={{ background: primaryColor }}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {sending ? '送出中...' : '送出'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
