'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { ThemeColors } from '@/types/survey';
import PrizeWheel from './PrizeWheel';

const DEFAULT_PRIZES = [
  { label: '9折優惠', emoji: '🎫', color: '#FF8C00' },
  { label: '免費飲品', emoji: '🥤', color: '#42A5F5' },
  { label: '85折優惠', emoji: '🔥', color: '#FF6B6B' },
  { label: '免費甜點', emoji: '🍰', color: '#EC407A' },
  { label: '折$50', emoji: '💰', color: '#66BB6A' },
  { label: '兩人同行一人免費', emoji: '👫', color: '#AB47BC' },
];

interface DiscountCodeDisplayProps {
  code: string;
  discountValue: string;
  expiresAt: string;
  storeName: string;
  colors: ThemeColors;
  discountMode?: 'basic' | 'advanced';
  tierName?: string;
  tierEmoji?: string;
  xpEarned?: number;
  onPhoneSubmit?: (phone: string) => void;
  responseId?: string;
  surveyId?: string;
  prizeItems?: { label: string; emoji: string; color: string }[] | null;
}

// Map tier names to confetti color palettes
const TIER_CONFETTI_COLORS: Record<string, string[]> = {
  Bronze: ['#CD7F32', '#B87333', '#A0522D'],
  Silver: ['#C0C0C0', '#A8A9AD', '#808080'],
  Gold: ['#FFD700', '#FFA500', '#DAA520'],
  Diamond: ['#B9F2FF', '#7B68EE', '#9370DB'],
};

// ---------- Phone Collection (soft, post-reward) ----------
function PhoneCollect({
  colors,
  storeName,
  onSubmit,
  responseId,
  surveyId,
}: {
  colors: ThemeColors;
  storeName: string;
  onSubmit: (phone: string) => void;
  responseId?: string;
  surveyId?: string;
}) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="mt-6 w-full max-w-sm text-center p-6 rounded-2xl relative overflow-hidden"
        style={{ background: colors.surface, border: `2px solid ${colors.primary}40` }}
      >
        {/* Success celebration particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-lg"
            initial={{ opacity: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 0],
              y: -60,
              x: (i - 2.5) * 30,
            }}
            transition={{ duration: 1.5, delay: i * 0.15 }}
            style={{ left: '50%', bottom: '40%' }}
          >
            {['🎉', '✨', '🎊', '⭐', '🎁', '💫'][i]}
          </motion.div>
        ))}

        <motion.div
          className="text-5xl mb-3"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1, repeat: 2 }}
        >
          🎉
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg font-bold mb-2"
          style={{ color: colors.primary }}
        >
          已收到！禮券已綁定
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-sm leading-relaxed"
          style={{ color: colors.text }}
        >
          下次來 <strong>{storeName}</strong> 時
          <br />
          出示 {email ? 'Email' : '手機號碼'}，即可使用優惠
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-3 text-xs"
          style={{ color: colors.textLight }}
        >
          優惠碼已綁定，下次來店出示即可 ✨
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.0, duration: 0.5 }}
      className="mt-6 w-full max-w-sm p-5 rounded-2xl"
      style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
    >
      {/* 副店長 persuasive message */}
      <div className="flex items-start gap-2 mb-4">
        <span className="text-lg shrink-0">🍽️</span>
        <p className="text-xs leading-relaxed" style={{ color: colors.text }}>
          留下聯絡方式，<strong style={{ color: colors.primary }}>禮券會直接寄到你的信箱</strong>！
          下次來店出示 Email 或手機號碼，店家就能查到你累積的優惠，放心 😊
        </p>
      </div>

      <div className="space-y-2.5">
        {/* Email */}
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
          placeholder="your@email.com"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: colors.background,
            border: `1px solid ${colors.border}`,
            color: colors.text,
          }}
        />

        {/* Phone */}
        <input
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value); setError(''); }}
          placeholder="手機號碼（選填）0912345678"
          inputMode="numeric"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: colors.background,
            border: `1px solid ${colors.border}`,
            color: colors.text,
          }}
        />

        {error && <p className="text-[10px]" style={{ color: '#D4605A' }}>{error}</p>}

        <button
          onClick={() => {
            if (!email && !phone) {
              setError('請至少填寫一項');
              return;
            }
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              setError('Email 格式不正確');
              return;
            }
            if (phone) {
              const cleaned = phone.replace(/[-\s]/g, '');
              if (!/^09\d{8}$/.test(cleaned)) {
                setError('手機格式：09xxxxxxxx');
                return;
              }
              onSubmit(cleaned);
            } else {
              onSubmit('');
            }
            // Save email via API too
            if (email && responseId) {
              fetch(`/api/surveys/${surveyId}/responses`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response_id: responseId, email }),
              }).catch(() => {});
            }
            setSubmitted(true);
          }}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg"
          style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})` }}
        >
          領取禮券 🎁
        </button>

        <p className="text-[10px] text-center" style={{ color: colors.textLight }}>
          填寫後即可收到禮券，下次消費直接使用
        </p>
      </div>
    </motion.div>
  );
}

// ---------- Main Component ----------
export default function DiscountCodeDisplay({
  code,
  discountValue,
  expiresAt,
  storeName,
  colors,
  discountMode,
  tierName,
  tierEmoji,
  xpEarned,
  onPhoneSubmit,
  responseId,
  surveyId,
  prizeItems,
}: DiscountCodeDisplayProps) {
  const isAdvanced = discountMode === 'advanced' && !!tierName;
  const confettiColors =
    isAdvanced && tierName && TIER_CONFETTI_COLORS[tierName]
      ? TIER_CONFETTI_COLORS[tierName]
      : [colors.primary, colors.accent, '#FFD700', '#FFA500', '#FF6347'];

  const [scratched, setScratched] = useState(false);
  const [copied, setCopied] = useState(false);
  const confettiFired = useRef(false);

  const expiryDate = new Date(expiresAt).toLocaleDateString('zh-TW');

  // ---------- Fire confetti ----------
  const fireConfetti = useCallback(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;

    // Burst from left
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.15, y: 0.6 },
      colors: confettiColors,
      ticks: 200,
      gravity: 0.8,
      scalar: 1.2,
    });
    // Burst from right
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.85, y: 0.6 },
      colors: confettiColors,
      ticks: 200,
      gravity: 0.8,
      scalar: 1.2,
    });

    // Second burst after a short delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { x: 0.5, y: 0.4 },
        colors: confettiColors,
        ticks: 150,
        gravity: 1,
        scalar: 0.9,
      });
    }, 400);
  }, [confettiColors]);

  // Called when user claims prize from PrizeWheel
  const handleReveal = useCallback(() => {
    setScratched(true);
    fireConfetti();
  }, [fireConfetti]);

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Floating particle positions (stable across renders)
  const particles = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      left: 10 + i * 11 + Math.round(Math.random() * 8),
      delay: (i * 0.4).toFixed(1),
      duration: (3 + Math.random() * 2).toFixed(1),
      size: 4 + Math.round(Math.random() * 4),
    })),
  ).current;

  // Format discount value for display — strip number-only values that look weird
  const displayDiscountValue = (() => {
    if (!discountValue) return '';
    // If it's just a number like "10", add context
    const trimmed = discountValue.trim();
    if (/^\d+$/.test(trimmed)) {
      return `${trimmed}% OFF`;
    }
    return trimmed;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, mass: 0.8 }}
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: colors.background }}
    >
      {/* ---- Header ---- */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4 dcd-pulse-emoji">🎉</div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-2xl font-bold tracking-wider mb-2"
          style={{ fontFamily: "'Noto Serif TC', serif", color: colors.text }}
        >
          恭喜完成問卷！
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-sm"
          style={{ color: colors.textLight }}
        >
          {storeName} 感謝您的寶貴意見
        </motion.p>
      </div>

      {/* ---- Discount Card ---- */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          type: 'spring',
          stiffness: 150,
          damping: 18,
        }}
        className="w-full max-w-sm rounded-3xl p-8 text-center relative overflow-hidden dcd-glow-border"
        style={
          {
            background: colors.surface,
            border: `2px solid ${colors.primary}`,
            '--glow-color': colors.primary,
          } as React.CSSProperties
        }
      >
        {/* Floating celebration particles */}
        {particles.map((p, i) => (
          <span
            key={i}
            className="dcd-float-particle"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              background: `radial-gradient(circle, #FFD700, ${colors.primary})`,
            }}
          />
        ))}

        {/* Decorative ticket-style cutouts */}
        <div
          className="absolute -left-3 top-1/2 w-6 h-6 rounded-full"
          style={{
            background: colors.background,
            transform: 'translateY(-50%)',
          }}
        />
        <div
          className="absolute -right-3 top-1/2 w-6 h-6 rounded-full"
          style={{
            background: colors.background,
            transform: 'translateY(-50%)',
          }}
        />

        {/* ---- Tier Achievement (advanced mode) ---- */}
        {isAdvanced && (
          <div className="mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.4, 1] }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 12,
                delay: 0.2,
              }}
              className="text-5xl mb-2"
            >
              {tierEmoji}
            </motion.div>
            <div
              className="text-sm font-bold mb-1"
              style={{ color: colors.primary }}
            >
              恭喜達成 {tierEmoji} {tierName} 等級！
            </div>
            {xpEarned !== undefined && (
              <div
                className="text-xs mb-2"
                style={{ color: colors.textLight }}
              >
                你獲得了 {xpEarned} 折扣點數
              </div>
            )}
          </div>
        )}

        {/* ---- Prize Wheel + Discount Reveal ---- */}
        <div className="mb-4">
          <AnimatePresence mode="wait">
            {!scratched ? (
              <motion.div key="wheel" exit={{ opacity: 0 }}>
                <div className="text-sm font-medium mb-2" style={{ color: colors.primary }}>
                  🎰 轉轉看你的運氣！
                </div>
                <div className="text-xs mb-4" style={{ color: colors.textLight }}>
                  各種驚喜獎勵等你來拿
                </div>
                <PrizeWheel
                  prizes={prizeItems && prizeItems.length >= 2 ? prizeItems : DEFAULT_PRIZES}
                  colors={colors}
                  onResult={() => handleReveal()}
                />
              </motion.div>
            ) : (
              <motion.div
                key="code"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                className="text-center"
              >
                {/* Discount value label */}
                {displayDiscountValue && (
                  <div
                    className="text-xl font-bold mb-3 flex items-center justify-center gap-2"
                    style={{ color: colors.text }}
                  >
                    <span className="text-2xl">🏷️</span>
                    {displayDiscountValue}
                  </div>
                )}

                {/* Copyable code */}
                <button
                  onClick={copyCode}
                  className="px-8 py-4 rounded-2xl text-3xl font-mono font-bold tracking-[0.3em] transition-all hover:scale-105 relative inline-flex items-center justify-center gap-2"
                  style={{
                    background: `${colors.primary}10`,
                    color: colors.primary,
                    border: `1px dashed ${colors.primary}`,
                  }}
                >
                  <span>{code}</span>

                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.3, 1], opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-base ml-1"
                      >
                        ✅
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 0.6 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-base ml-1"
                      >
                        📋
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Copied confirmation */}
        <AnimatePresence>
          {copied && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-xs font-medium mb-2"
              style={{ color: colors.primary }}
            >
              已複製到剪貼簿！
            </motion.div>
          )}
        </AnimatePresence>

        {scratched && (
          <div className="text-xs" style={{ color: colors.textLight }}>
            有效期至 {expiryDate}
            <br />
            結帳時出示此碼即享優惠
          </div>
        )}

        {/* Dashed divider */}
        <div
          className="my-6 border-t-2 border-dashed"
          style={{ borderColor: colors.border }}
        />

        <div className="text-xs" style={{ color: colors.textLight }}>
          留下聯絡方式，下次來店直接享優惠 👇
        </div>
      </motion.div>

      {/* ---- Optional phone collection (soft ask, after reward) ---- */}
      {onPhoneSubmit && (
        <PhoneCollect colors={colors} storeName={storeName} onSubmit={onPhoneSubmit} responseId={responseId} surveyId={surveyId} />
      )}

      {/* ---- FeedBites Branding ---- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-6 text-center"
      >
        <a
          href="/"
          target="_blank"
          className="text-xs font-medium"
          style={{ color: colors.primary }}
        >
          FeedBites
        </a>
        <div
          className="text-[10px] mt-0.5"
          style={{ color: colors.textLight }}
        >
          Bite. Rate. Save.
        </div>
      </motion.div>

      <style jsx>{`
        /* Glowing border animation */
        .dcd-glow-border {
          animation: dcd-glow 2.5s ease-in-out infinite alternate;
        }
        @keyframes dcd-glow {
          0% {
            box-shadow:
              0 4px 20px rgba(0, 0, 0, 0.05),
              0 0 15px var(--glow-color, #d4a574)33;
          }
          100% {
            box-shadow:
              0 8px 40px rgba(0, 0, 0, 0.08),
              0 0 30px var(--glow-color, #d4a574)55,
              0 0 60px var(--glow-color, #d4a574)22;
          }
        }

        /* Pulsing emoji */
        .dcd-pulse-emoji {
          display: inline-block;
          animation: dcd-pulse 1.8s ease-in-out infinite;
        }
        @keyframes dcd-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
        }

        /* Floating celebration particles */
        .dcd-float-particle {
          position: absolute;
          bottom: -10px;
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
          animation: dcd-float-up linear infinite;
        }
        @keyframes dcd-float-up {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.5);
          }
          15% {
            opacity: 0.7;
          }
          70% {
            opacity: 0.4;
          }
          100% {
            opacity: 0;
            transform: translateY(-350px) scale(0.2);
          }
        }
      `}</style>
    </motion.div>
  );
}
