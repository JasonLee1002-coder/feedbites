'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { ThemeColors } from '@/types/survey';

interface DiscountCodeDisplayProps {
  code: string;
  discountValue: string;
  expiresAt: string;
  storeName: string;
  colors: ThemeColors;
}

export default function DiscountCodeDisplay({
  code,
  discountValue,
  expiresAt,
  storeName,
  colors,
}: DiscountCodeDisplayProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visibleChars, setVisibleChars] = useState(0);
  const confettiFired = useRef(false);

  useEffect(() => {
    // Auto reveal after 800ms
    const timer = setTimeout(() => setRevealed(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Fire confetti on mount
  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;

    const fireConfetti = () => {
      // Burst from left
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { x: 0.15, y: 0.6 },
        colors: [colors.primary, colors.accent, '#FFD700', '#FFA500', '#FF6347'],
        ticks: 200,
        gravity: 0.8,
        scalar: 1.2,
      });
      // Burst from right
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { x: 0.85, y: 0.6 },
        colors: [colors.primary, colors.accent, '#FFD700', '#FFA500', '#FF6347'],
        ticks: 200,
        gravity: 0.8,
        scalar: 1.2,
      });
    };

    // First burst immediately
    fireConfetti();
    // Second burst after a short delay
    const t2 = setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { x: 0.5, y: 0.4 },
        colors: [colors.primary, '#FFD700', '#FFA500'],
        ticks: 150,
        gravity: 1,
        scalar: 0.9,
      });
    }, 400);

    return () => clearTimeout(t2);
  }, [colors.primary, colors.accent]);

  // Slot-machine character reveal
  useEffect(() => {
    if (!revealed) return;
    if (visibleChars >= code.length) return;

    const timer = setTimeout(() => {
      setVisibleChars((prev) => prev + 1);
    }, 100);

    return () => clearTimeout(timer);
  }, [revealed, visibleChars, code.length]);

  const expiryDate = new Date(expiresAt).toLocaleDateString('zh-TW');

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Generate floating particle positions (stable across renders)
  const particles = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      left: 10 + (i * 11) + Math.round(Math.random() * 8),
      delay: (i * 0.4).toFixed(1),
      duration: (3 + Math.random() * 2).toFixed(1),
      size: 4 + Math.round(Math.random() * 4),
    }))
  ).current;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, mass: 0.8 }}
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: colors.background }}
    >
      {/* Celebration */}
      <div className="text-center mb-8">
        {/* Pulsing gift emoji */}
        <div className="text-6xl mb-4 dcd-pulse-emoji">🎉</div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-2xl font-bold tracking-wider mb-2"
          style={{ fontFamily: "'Noto Serif TC', serif", color: colors.text }}
        >
          感謝您的回饋
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

      {/* Discount code card with glowing border */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 150, damping: 18 }}
        className="w-full max-w-sm rounded-3xl p-8 text-center relative overflow-hidden dcd-glow-border"
        style={{
          background: colors.surface,
          border: `2px solid ${colors.primary}`,
          '--glow-color': colors.primary,
        } as React.CSSProperties}
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

        {/* Decorative circles */}
        <div
          className="absolute -left-3 top-1/2 w-6 h-6 rounded-full"
          style={{ background: colors.background, transform: 'translateY(-50%)' }}
        />
        <div
          className="absolute -right-3 top-1/2 w-6 h-6 rounded-full"
          style={{ background: colors.background, transform: 'translateY(-50%)' }}
        />

        <div className="text-sm font-medium mb-1" style={{ color: colors.primary }}>
          您的專屬折扣
        </div>
        <div className="text-3xl font-bold mb-6" style={{ color: colors.text }}>
          {discountValue}
        </div>

        {/* Code reveal */}
        <div className="mb-4">
          <div className="text-xs mb-2" style={{ color: colors.textLight }}>折扣碼</div>
          {revealed ? (
            <button
              onClick={copyCode}
              className="px-8 py-4 rounded-2xl text-3xl font-mono font-bold tracking-[0.5em] transition-all hover:scale-105 relative inline-flex items-center justify-center gap-2"
              style={{
                background: `${colors.primary}10`,
                color: colors.primary,
                border: `1px dashed ${colors.primary}`,
              }}
            >
              {/* Slot-machine character reveal */}
              <span className="inline-flex">
                {code.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: -20 }}
                    animate={
                      i < visibleChars
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: -20 }
                    }
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 15,
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
              </span>

              {/* Copy icon / checkmark */}
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
          ) : (
            <div
              className="px-8 py-4 rounded-2xl text-3xl font-mono tracking-[0.5em] animate-pulse"
              style={{ background: colors.border, color: 'transparent' }}
            >
              ??????
            </div>
          )}
        </div>

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

        <div className="text-xs" style={{ color: colors.textLight }}>
          有效期至 {expiryDate}<br />
          結帳時出示此碼即享優惠
        </div>

        {/* Dashed line */}
        <div
          className="my-6 border-t-2 border-dashed"
          style={{ borderColor: colors.border }}
        />

        <div className="text-xs" style={{ color: colors.textLight }}>
          📸 請截圖保存此畫面
        </div>
      </motion.div>

      {/* FeedBites branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-8 text-center"
      >
        <a href="/" target="_blank" className="text-xs font-medium" style={{ color: colors.primary }}>
          FeedBites
        </a>
        <div className="text-[10px] mt-0.5" style={{ color: colors.textLight }}>
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
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05),
                         0 0 15px var(--glow-color, #D4A574)33;
          }
          100% {
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08),
                         0 0 30px var(--glow-color, #D4A574)55,
                         0 0 60px var(--glow-color, #D4A574)22;
          }
        }

        /* Pulsing emoji */
        .dcd-pulse-emoji {
          display: inline-block;
          animation: dcd-pulse 1.8s ease-in-out infinite;
        }
        @keyframes dcd-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
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
