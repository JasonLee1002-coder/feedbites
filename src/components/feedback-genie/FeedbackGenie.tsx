'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Upload, ArrowLeft, Send, CheckCircle2, Image as ImageIcon,
  Bug, Frown, Lightbulb, HelpCircle,
} from 'lucide-react';

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
  /** 'customer' = 消費者端（菜單頁）, 'owner' = 店長端（後台） */
  mode?: 'customer' | 'owner';
}

type FeedbackType = 'bug' | 'usability' | 'feature' | 'other';
type Step = 'select-type' | 'form' | 'success';

const CUSTOMER_TYPES: { id: FeedbackType; icon: typeof Bug; label: string; desc: string; color: string; bg: string; border: string }[] = [
  { id: 'bug', icon: Bug, label: '發現問題', desc: '頁面錯誤、無法操作', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  { id: 'usability', icon: Frown, label: '體驗不佳', desc: '操作困難、載入太慢', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  { id: 'feature', icon: Lightbulb, label: '希望改進', desc: '功能建議、期望功能', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'other', icon: HelpCircle, label: '其他', desc: '其他意見或回饋', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
];

const OWNER_TYPES: typeof CUSTOMER_TYPES = [
  { id: 'bug', icon: Bug, label: '發現 Bug', desc: '系統功能壞掉、錯誤訊息', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  { id: 'usability', icon: Frown, label: '操作不順', desc: '後台流程卡關、步驟太多', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  { id: 'feature', icon: Lightbulb, label: '功能建議', desc: '想要的新功能、整合需求', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'other', icon: HelpCircle, label: '其他', desc: '帳務、合作、其他問題', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
];

const COPY = {
  customer: {
    bubble: '用餐體驗如何？點我回報 💬',
    headerTitle: '回報精靈',
    step1: '遇到什麼問題了嗎？',
    step2: '告訴我們更多細節',
    step3: '感謝你的回報！',
    successMsg: '我們會把你的意見轉達給店家',
    placeholder: '請描述你遇到的問題或建議...',
  },
  owner: {
    bubble: '系統有問題？回報給開發團隊 🛠️',
    headerTitle: '系統回報',
    step1: '遇到什麼系統問題？',
    step2: '描述問題細節，我們會盡快修復',
    step3: '已收到你的回報！',
    successMsg: 'FeedBites 團隊會盡快處理並通知你',
    placeholder: '請描述遇到的系統問題、想要的功能、或任何建議...',
  },
};

export default function FeedbackGenie({
  storeId,
  storeName = '餐廳',
  source = 'chat',
  genieName,
  primaryColor = '#FF8C00',
  onComplete,
  defaultOpen = false,
  mode = 'customer',
}: FeedbackGenieProps) {
  const copy = COPY[mode];
  const TYPES = mode === 'owner' ? OWNER_TYPES : CUSTOMER_TYPES;
  const displayName = genieName || copy.headerTitle;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [step, setStep] = useState<Step>('select-type');
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEntrance, setShowEntrance] = useState(true);
  const [hasShownBubble, setHasShownBubble] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasShownBubble) {
      const timer = setTimeout(() => setHasShownBubble(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasShownBubble]);

  function handleSelectType(type: FeedbackType) {
    setSelectedType(type);
    setStep('form');
  }

  function handleScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('檔案大小不能超過 5MB');
      return;
    }
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removeScreenshot() {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleBack() {
    setStep('select-type');
    setDescription('');
    removeScreenshot();
  }

  function reset() {
    setStep('select-type');
    setSelectedType(null);
    setDescription('');
    removeScreenshot();
  }

  async function handleSubmit() {
    if (!selectedType || !description.trim()) return;
    setIsSubmitting(true);

    try {
      // Upload screenshot if present
      let screenshotUrl: string | null = null;
      if (screenshot) {
        const formData = new FormData();
        formData.append('file', screenshot);
        formData.append('storeId', storeId);
        const uploadRes = await fetch('/api/ai/feedback-upload', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          screenshotUrl = data.url;
        }
      }

      // Save feedback via existing API
      const typeInfo = TYPES.find(t => t.id === selectedType)!;
      const message = `【${typeInfo.label}】\n${description.trim()}`;

      const res = await fetch('/api/ai/feedback-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          storeName,
          sessionId: crypto.randomUUID(),
          message,
          history: [],
          source,
          metadata: {
            type: selectedType,
            screenshotUrl,
            formMode: true,
            reporterMode: mode,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStep('success');
        onComplete?.(data.conversationId);
      }
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  }

  const darkerColor = primaryColor === '#FF8C00' ? '#FF6B00' : primaryColor;
  const currentType = TYPES.find(t => t.id === selectedType);
  // 店長端放左下角（避免跟副店長 AI 重疊），消費者端放右下角
  const posClass = mode === 'owner' ? 'fixed bottom-6 left-6 z-[55]' : 'fixed bottom-6 right-6 z-[55]';
  const bubbleAlign = mode === 'owner' ? 'left-0' : 'right-0';
  const bubbleCorner = mode === 'owner' ? 'rounded-bl-sm' : 'rounded-br-sm';

  return (
    <>
      {/* ═══ 浮動入口按鈕 ═══ */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={posClass}
          >
            {/* 入口氣泡 */}
            <AnimatePresence>
              {showEntrance && hasShownBubble && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  className={`absolute bottom-[72px] ${bubbleAlign} w-[200px] p-3 rounded-2xl ${bubbleCorner} backdrop-blur-md`}
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    border: `1px solid ${primaryColor}20`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  }}
                >
                  <p className="text-[13px] text-[#3A3A3A] leading-relaxed">
                    {copy.bubble}
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

      {/* ═══ 回報面板 ═══ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25 }}
            className={`${posClass} w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] overflow-hidden flex flex-col`}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between shrink-0"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${darkerColor})` }}
            >
              <div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-4.5 h-4.5" />
                  {displayName}
                </div>
                <div className="text-xs text-white/70 mt-0.5">
                  {step === 'select-type' && copy.step1}
                  {step === 'form' && copy.step2}
                  {step === 'success' && copy.step3}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* 步驟指示 */}
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${step === 'select-type' ? 'bg-white' : 'bg-white/40'}`} />
                  <span className={`w-2 h-2 rounded-full ${step === 'form' ? 'bg-white' : 'bg-white/40'}`} />
                </div>
                <button
                  onClick={() => { setIsOpen(false); reset(); }}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">

                {/* ── Step 1: 選擇類型 ── */}
                {step === 'select-type' && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    {TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <motion.button
                          key={type.id}
                          onClick={() => handleSelectType(type.id)}
                          className="w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md"
                          style={{ background: type.bg, borderColor: type.border }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: `${type.color}15` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: type.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm" style={{ color: type.color }}>{type.label}</div>
                            <div className="text-xs text-[#8A8585] mt-0.5">{type.desc}</div>
                          </div>
                          <div className="text-[#C5A55A] shrink-0">&rsaquo;</div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}

                {/* ── Step 2: 表單 ── */}
                {step === 'form' && currentType && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-5"
                  >
                    {/* 已選類型標籤 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#8A8585]">類型：</span>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
                        style={{ color: currentType.color, background: currentType.bg, borderColor: currentType.border }}
                      >
                        {currentType.label}
                      </span>
                    </div>

                    {/* 截圖上傳 */}
                    <div>
                      <label className="text-sm font-medium text-[#3A3A3A]">截圖（選填）</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleScreenshot}
                        className="hidden"
                      />
                      {screenshotPreview ? (
                        <div className="mt-2 relative group">
                          <img
                            src={screenshotPreview}
                            alt="截圖預覽"
                            className="w-full max-h-40 object-contain rounded-xl border border-[#E8E2D8]"
                          />
                          <button
                            onClick={removeScreenshot}
                            className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2 w-full py-8 rounded-xl border-2 border-dashed border-[#E8E2D8] hover:border-[#C5A55A] transition-colors flex flex-col items-center gap-2 text-[#8A8585] hover:text-[#3A3A3A]"
                        >
                          <Upload className="w-5 h-5" />
                          <span className="text-xs">點擊上傳截圖</span>
                          <span className="text-[10px] text-[#B0A8A0]">JPG / PNG，最大 5MB</span>
                        </button>
                      )}
                    </div>

                    {/* 描述 */}
                    <div>
                      <label className="text-sm font-medium text-[#3A3A3A]">
                        描述問題 <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder={copy.placeholder}
                        maxLength={2000}
                        rows={4}
                        className="mt-2 w-full px-4 py-3 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] focus:ring-2 focus:ring-[#C5A55A]/20 bg-[#FAF7F2] resize-none transition-all"
                      />
                      <div className="text-right text-[10px] text-[#B0A8A0] mt-1">
                        {description.length}/2000
                      </div>
                    </div>

                    {/* 按鈕 */}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={handleBack}
                        className="flex-1 py-3 rounded-xl border border-[#E8E2D8] text-sm font-medium text-[#3A3A3A] hover:bg-[#FAF7F2] transition-colors"
                      >
                        返回
                      </button>
                      <motion.button
                        onClick={handleSubmit}
                        disabled={!description.trim() || isSubmitting}
                        className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${darkerColor})` }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isSubmitting ? (
                          <motion.div
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          />
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            送出回報
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 3: 成功 ── */}
                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-6"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                    >
                      <CheckCircle2 className="w-16 h-16 mx-auto mb-4" style={{ color: primaryColor }} />
                    </motion.div>
                    <h3 className="text-lg font-bold text-[#3A3A3A] mb-2">{copy.step3}</h3>
                    <p className="text-sm text-[#8A8585] mb-6">
                      {copy.successMsg}
                    </p>
                    <button
                      onClick={() => { setIsOpen(false); reset(); }}
                      className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                      style={{ background: `linear-gradient(135deg, ${primaryColor}, ${darkerColor})` }}
                    >
                      關閉
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
