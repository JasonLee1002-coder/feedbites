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

    // Fill cover at 2x resolution
    const w2 = width * 2;
    const h2 = height * 2;
    ctx.fillStyle = coverColor;
    ctx.fillRect(0, 0, w2, h2);

    // Instructional text (2x scale)
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆 刮刮看', w2 / 2, h2 / 2 - 24);
    ctx.font = '28px sans-serif';
    ctx.fillText('刮開查看你的獎勵', w2 / 2, h2 / 2 + 36);
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

      // Draw at 2x scale for retina
      const x2 = x * 2, y2 = y * 2;
      if (lastPoint.current) {
        ctx.lineWidth = 80;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x * 2, lastPoint.current.y * 2);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x2, y2, 40, 0, Math.PI * 2);
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
      setRevealed(true);
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

  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative" style={{ width, height }}>
      {/* Content underneath — hidden until scratched enough */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
        {children}
      </div>

      {/* Solid background when not revealed */}
      {!revealed && (
        <div className="absolute inset-0 rounded-2xl" style={{ background: coverColor }} />
      )}

      {/* Scratch canvas overlay */}
      <canvas
        ref={canvasRef}
        width={width * 2}
        height={height * 2}
        className="absolute inset-0 rounded-2xl cursor-pointer w-full h-full"
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-6 w-full max-w-sm text-center p-4 rounded-2xl"
        style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      >
        <div className="text-2xl mb-2">🎉</div>
        <div className="text-sm font-bold" style={{ color: colors.primary }}>
          已收到！禮券已綁定到你的帳號
        </div>
        <div className="text-[11px] mt-1" style={{ color: colors.textLight }}>
          下次來店出示 {email ? 'Email' : '手機號碼'}，即可使用累積的優惠
        </div>
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

        {/* ---- Prize Wheel + Discount Reveal ---- */}
        <div className="mb-4">
          {!scratched ? (
            <>
              <div className="text-sm font-medium mb-2" style={{ color: colors.primary }}>
                🎰 轉轉看你的運氣！
              </div>
              <div className="text-xs mb-4" style={{ color: colors.textLight }}>
                各種驚喜獎勵等你來拿
              </div>
              <PrizeWheel
                prizes={DEFAULT_PRIZES}
                colors={colors}
                onResult={() => handleReveal()}
              />
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
        <PhoneCollect colors={colors} storeName={storeName} onSubmit={onPhoneSubmit} responseId={responseId} surveyId={surveyId} />
      )}

      {/* viral banner removed — focus on TACB test */}

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
