'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { ThemeColors } from '@/types/survey';

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
}

// Map tier names to confetti color palettes
const TIER_CONFETTI_COLORS: Record<string, string[]> = {
  Bronze: ['#CD7F32', '#B87333', '#A0522D'],
  Silver: ['#C0C0C0', '#A8A9AD', '#808080'],
  Gold: ['#FFD700', '#FFA500', '#DAA520'],
  Diamond: ['#B9F2FF', '#7B68EE', '#9370DB'],
};

// ---------- Scratch Card (Pure Canvas) ----------
function ScratchCard({
  width,
  height,
  coverColor,
  children,
  onReveal,
}: {
  width: number;
  height: number;
  coverColor: string;
  children: React.ReactNode;
  onReveal: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const revealedRef = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Initialise the canvas cover
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill cover
    ctx.fillStyle = coverColor;
    ctx.fillRect(0, 0, width, height);

    // Instructional text
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆 刮刮看', width / 2, height / 2 - 12);
    ctx.font = '14px sans-serif';
    ctx.fillText('刮開查看你的獎勵', width / 2, height / 2 + 18);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [width, height],
  );

  const scratch = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas || revealedRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.globalCompositeOperation = 'destination-out';

      // Draw a line from the last point to the current point for smooth strokes
      if (lastPoint.current) {
        ctx.lineWidth = 50;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();
      }

      lastPoint.current = { x, y };

      // Check scratch percentage
      checkScratchPercentage(ctx, canvas);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function checkScratchPercentage(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ) {
    if (revealedRef.current) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) transparent++;
    }
    const percentage = transparent / (imageData.data.length / 4);
    if (percentage > 0.4) {
      revealedRef.current = true;
      // Fade-clear the remaining cover
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onReveal();
    }
  }

  // ---- Mouse handlers ----
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      isDrawing.current = true;
      lastPoint.current = null;
      const pt = getCanvasPoint(e.clientX, e.clientY);
      if (pt) scratch(pt.x, pt.y);
    },
    [getCanvasPoint, scratch],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      const pt = getCanvasPoint(e.clientX, e.clientY);
      if (pt) scratch(pt.x, pt.y);
    },
    [getCanvasPoint, scratch],
  );

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  // ---- Touch handlers ----
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      isDrawing.current = true;
      lastPoint.current = null;
      const touch = e.touches[0];
      const pt = getCanvasPoint(touch.clientX, touch.clientY);
      if (pt) scratch(pt.x, pt.y);
    },
    [getCanvasPoint, scratch],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!isDrawing.current) return;
      const touch = e.touches[0];
      const pt = getCanvasPoint(touch.clientX, touch.clientY);
      if (pt) scratch(pt.x, pt.y);
    },
    [getCanvasPoint, scratch],
  );

  const handleTouchEnd = useCallback(() => {
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  return (
    <div className="relative" style={{ width, height }}>
      {/* Content underneath the scratch cover */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>

      {/* Scratch canvas overlay */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 rounded-2xl cursor-pointer"
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
}

// ---------- Phone Collection (soft, post-reward) ----------
function PhoneCollect({
  colors,
  storeName,
  onSubmit,
}: {
  colors: ThemeColors;
  storeName: string;
  onSubmit: (phone: string) => void;
}) {
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-6 w-full max-w-sm text-center"
      >
        <div className="text-xs" style={{ color: colors.primary }}>
          ✓ 已收到！下次有優惠會通知你
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.0, duration: 0.5 }}
      className="mt-6 w-full max-w-sm p-4 rounded-2xl"
      style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
    >
      <p className="text-xs text-center mb-3" style={{ color: colors.textLight }}>
        留下手機號碼，{storeName} 下次有優惠直接通知你
      </p>
      <div className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value); setError(''); }}
          placeholder="0912345678"
          inputMode="numeric"
          className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: colors.background,
            border: `1px solid ${error ? '#D4605A' : colors.border}`,
            color: colors.text,
          }}
        />
        <button
          onClick={() => {
            const cleaned = phone.replace(/[-\s]/g, '');
            if (!/^09\d{8}$/.test(cleaned)) {
              setError('格式不對');
              return;
            }
            onSubmit(cleaned);
            setSubmitted(true);
          }}
          className="px-4 py-2.5 rounded-xl text-xs font-medium text-white"
          style={{ background: colors.primary }}
        >
          送出
        </button>
      </div>
      {error && <p className="text-[10px] mt-1" style={{ color: '#D4605A' }}>{error}</p>}
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

  // Called when the scratch card is fully revealed
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

        {/* ---- Scratch Card Area — hide discount value until revealed ---- */}
        <div className="mb-4">
          {!scratched ? (
            <>
              <div
                className="text-sm font-medium mb-2"
                style={{ color: colors.primary }}
              >
                你的獎勵藏在下面
              </div>
              <div
                className="text-xs mb-3"
                style={{ color: colors.textLight }}
              >
                用手指刮開揭曉！
              </div>
              <div className="flex justify-center">
                <ScratchCard
                  width={300}
                  height={150}
                  coverColor={colors.primary}
                  onReveal={handleReveal}
                >
                  <div className="text-center select-none">
                    <div
                      className="text-xl font-bold mb-1"
                      style={{ color: colors.text }}
                    >
                      {discountValue}
                    </div>
                    <div
                      className="text-2xl font-mono font-bold tracking-[0.3em]"
                      style={{ color: colors.primary }}
                    >
                      {code}
                    </div>
                  </div>
                </ScratchCard>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 18 }}
              className="text-center"
            >
              {/* Revealed discount value */}
              <div
                className="text-3xl font-bold mb-3"
                style={{ color: colors.text }}
              >
                {discountValue}
              </div>

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

        <div className="text-xs" style={{ color: colors.textLight }}>
          有效期至 {expiryDate}
          <br />
          結帳時出示此碼即享優惠
        </div>

        {/* Dashed divider */}
        <div
          className="my-6 border-t-2 border-dashed"
          style={{ borderColor: colors.border }}
        />

        <div className="text-xs" style={{ color: colors.textLight }}>
          📸 請截圖保存此畫面
        </div>
      </motion.div>

      {/* ---- Optional phone collection (soft ask, after reward) ---- */}
      {onPhoneSubmit && (
        <PhoneCollect colors={colors} storeName={storeName} onSubmit={onPhoneSubmit} />
      )}

      {/* ---- FeedBites viral banner (post-completion, not during survey) ---- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="mt-8 w-full max-w-sm p-5 rounded-2xl text-center"
        style={{ background: `${colors.primary}08`, border: `1px solid ${colors.border}` }}
      >
        <p className="text-xs mb-2" style={{ color: colors.textLight }}>
          你也是餐飲業主嗎？
        </p>
        <p className="text-xs leading-relaxed mb-3" style={{ color: colors.textLight }}>
          <strong style={{ color: colors.text }}>FeedBites</strong> — 全球免費餐飲問卷系統
        </p>
        <a
          href="/"
          target="_blank"
          className="inline-block px-5 py-2 rounded-full text-xs font-medium transition-all hover:opacity-80"
          style={{ background: colors.primary, color: 'white' }}
        >
          免費開通我的餐廳問卷 →
        </a>
      </motion.div>

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
