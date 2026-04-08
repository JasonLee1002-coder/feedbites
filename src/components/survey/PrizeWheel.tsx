'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { ThemeColors } from '@/types/survey';

interface Prize {
  label: string;
  emoji: string;
  color: string;
}

const WHEEL_COLORS = [
  '#FF8C00', '#FFB74D', '#FF6B6B', '#66BB6A',
  '#42A5F5', '#AB47BC', '#EC407A', '#26A69A',
];

interface PrizeWheelProps {
  prizes: Prize[];
  colors: ThemeColors;
  onResult: (prize: Prize) => void;
}

export default function PrizeWheel({ prizes, colors, onResult }: PrizeWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Prize | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [rotation, setRotation] = useState(0);
  const hasSpun = useRef(false);

  if (prizes.length === 0) return null;

  const segmentAngle = 360 / prizes.length;

  function spin() {
    if (spinning || hasSpun.current) return;
    hasSpun.current = true;
    setSpinning(true);

    const winIndex = Math.floor(Math.random() * prizes.length);
    const targetAngle = 360 * 6 + (360 - winIndex * segmentAngle - segmentAngle / 2);
    setRotation(targetAngle);

    // After spin completes — show result but DON'T call onResult yet
    setTimeout(() => {
      setSpinning(false);
      setResult(prizes[winIndex]);

      // Confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: [colors.primary, '#FFD700', '#FF6B6B', '#66BB6A'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 90,
          origin: { y: 0.4, x: 0.3 },
          colors: ['#FFD700', colors.primary],
        });
      }, 300);
    }, 4500);
  }

  function handleClaim() {
    setClaimed(true);
    // Big celebration confetti on claim
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#FFD700', '#FF8C00', '#FF6B6B', '#66BB6A', '#AB47BC'],
      ticks: 250,
      gravity: 0.7,
      scalar: 1.3,
    });
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 120,
        origin: { x: 0.3, y: 0.4 },
        colors: ['#FFD700', colors.primary],
      });
      confetti({
        particleCount: 80,
        spread: 120,
        origin: { x: 0.7, y: 0.4 },
        colors: ['#FFD700', colors.primary],
      });
    }, 300);
    // Delay before transitioning to coupon code
    setTimeout(() => {
      onResult(result!);
    }, 1800);
  }

  return (
    <div className="flex flex-col items-center">
      {/* Prize list preview */}
      {!result && (
        <div className="flex flex-wrap justify-center gap-2 mb-4 max-w-[300px]">
          {prizes.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
              style={{ background: `${p.color || WHEEL_COLORS[i % WHEEL_COLORS.length]}15`, color: p.color || WHEEL_COLORS[i % WHEEL_COLORS.length], border: `1px solid ${(p.color || WHEEL_COLORS[i % WHEEL_COLORS.length])}30` }}
            >
              <span>{p.emoji}</span>
              <span>{p.label}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Wheel */}
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="wheel"
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4 }}
          >
            <div className="relative w-[280px] h-[280px] mb-4">
              {/* Pointer triangle at top */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                <div
                  className="w-0 h-0"
                  style={{
                    borderLeft: '12px solid transparent',
                    borderRight: '12px solid transparent',
                    borderTop: `20px solid ${colors.primary}`,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                  }}
                />
              </div>

              {/* Center dot */}
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})`,
                    border: '3px solid white',
                  }}
                >
                  <span className="text-white text-lg font-bold">GO</span>
                </div>
              </div>

              {/* Spinning wheel */}
              <motion.div
                className="w-full h-full rounded-full overflow-hidden shadow-2xl"
                style={{ border: `4px solid ${colors.primary}` }}
                animate={{ rotate: rotation }}
                transition={{
                  duration: 4.5,
                  ease: [0.17, 0.67, 0.12, 0.99],
                }}
              >
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {prizes.map((prize, i) => {
                    const startAngle = i * segmentAngle - 90;
                    const endAngle = (i + 1) * segmentAngle - 90;
                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;
                    const x1 = 100 + 100 * Math.cos(startRad);
                    const y1 = 100 + 100 * Math.sin(startRad);
                    const x2 = 100 + 100 * Math.cos(endRad);
                    const y2 = 100 + 100 * Math.sin(endRad);
                    const largeArc = segmentAngle > 180 ? 1 : 0;

                    const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
                    const textX = 100 + 62 * Math.cos(midAngle);
                    const textY = 100 + 62 * Math.sin(midAngle);
                    const textRotation = (startAngle + endAngle) / 2 + 90;

                    return (
                      <g key={i}>
                        <path
                          d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc},1 ${x2},${y2} Z`}
                          fill={prize.color || WHEEL_COLORS[i % WHEEL_COLORS.length]}
                          stroke="white"
                          strokeWidth="1.5"
                        />
                        <text
                          x={textX}
                          y={textY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize={prizes.length > 6 ? '7' : '8'}
                          fontWeight="bold"
                          transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                        >
                          {prize.emoji} {prize.label.length > 6 ? prize.label.slice(0, 6) + '..' : prize.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          /* ═══ Winner Celebration Screen ═══ */
          <motion.div
            key="celebration"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="flex flex-col items-center py-6 relative"
          >
            {/* Sparkle stars around the prize */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute pw-sparkle-star"
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0.5, 1, 0],
                  scale: [0, 1.2, 0.8, 1, 0],
                  x: Math.cos((i * Math.PI * 2) / 8) * (80 + Math.random() * 40),
                  y: Math.sin((i * Math.PI * 2) / 8) * (80 + Math.random() * 40),
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.15,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
                style={{ fontSize: i % 2 === 0 ? '16px' : '12px' }}
              >
                {i % 3 === 0 ? '✨' : i % 3 === 1 ? '⭐' : '🌟'}
              </motion.div>
            ))}

            {/* Golden ring glow */}
            <motion.div
              className="w-36 h-36 rounded-full flex items-center justify-center mb-5 relative"
              style={{
                background: `radial-gradient(circle, ${result.color}20, transparent 70%)`,
                boxShadow: `0 0 40px ${result.color}40, 0 0 80px ${result.color}20`,
              }}
              animate={{
                boxShadow: [
                  `0 0 40px ${result.color}40, 0 0 80px ${result.color}20`,
                  `0 0 60px ${result.color}60, 0 0 120px ${result.color}30`,
                  `0 0 40px ${result.color}40, 0 0 80px ${result.color}20`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {/* Inner circle */}
              <motion.div
                className="w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${result.color}15, ${result.color}30)`,
                  border: `3px solid ${result.color}60`,
                }}
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <motion.span
                  className="text-6xl"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {result.emoji}
                </motion.span>
              </motion.div>
            </motion.div>

            {/* Winner text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-6"
            >
              <div className="text-sm font-medium mb-1" style={{ color: colors.textLight }}>
                🎊 恭喜你抽中了 🎊
              </div>
              <motion.div
                className="text-2xl font-bold"
                style={{ color: result.color }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {result.label}
              </motion.div>
            </motion.div>

            {/* Claim button */}
            {!claimed ? (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={handleClaim}
                className="px-10 py-4 rounded-2xl text-lg font-bold text-white shadow-xl relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})`,
                }}
                whileHover={{ scale: 1.05, boxShadow: `0 12px 30px ${colors.primary}50` }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, transparent, white, transparent)',
                  }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                />
                <span className="relative z-10">🎁 領取獎勵</span>
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <motion.div
                  className="text-3xl mb-2"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  🎉
                </motion.div>
                <div className="text-sm font-bold" style={{ color: colors.primary }}>
                  獎勵領取中...
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spin button (only when no result yet) */}
      {!result && (
        <motion.button
          onClick={spin}
          disabled={spinning}
          className="px-8 py-3 rounded-full text-base font-bold text-white shadow-lg disabled:opacity-70"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark || colors.primary})`,
          }}
          whileHover={!spinning ? { scale: 1.05, boxShadow: `0 8px 25px ${colors.primary}40` } : {}}
          whileTap={!spinning ? { scale: 0.95 } : {}}
          animate={spinning ? {} : { scale: [1, 1.05, 1] }}
          transition={spinning ? {} : { duration: 1.5, repeat: Infinity }}
        >
          {spinning ? '轉動中...' : '🎰 轉轉看！'}
        </motion.button>
      )}
    </div>
  );
}
