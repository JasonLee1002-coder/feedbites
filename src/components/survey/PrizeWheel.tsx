'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
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
  const [rotation, setRotation] = useState(0);
  const hasSpun = useRef(false);

  if (prizes.length === 0) return null;

  const segmentAngle = 360 / prizes.length;

  function spin() {
    if (spinning || hasSpun.current) return;
    hasSpun.current = true;
    setSpinning(true);

    // Random result
    const winIndex = Math.floor(Math.random() * prizes.length);
    // Calculate rotation: at least 5 full spins + land on the winning segment
    // The pointer is at top (12 o'clock), segments start from right (3 o'clock)
    // So we need to rotate to align winIndex segment with the top
    const targetAngle = 360 * 6 + (360 - winIndex * segmentAngle - segmentAngle / 2);

    setRotation(targetAngle);

    // After spin completes
    setTimeout(() => {
      setSpinning(false);
      setResult(prizes[winIndex]);
      onResult(prizes[winIndex]);

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
              style={{ background: `${WHEEL_COLORS[i % WHEEL_COLORS.length]}15`, color: WHEEL_COLORS[i % WHEEL_COLORS.length], border: `1px solid ${WHEEL_COLORS[i % WHEEL_COLORS.length]}30` }}
            >
              <span>{p.emoji}</span>
              <span>{p.label}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Wheel */}
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
          style={{
            border: `4px solid ${colors.primary}`,
          }}
          animate={{ rotate: rotation }}
          transition={{
            duration: 4.5,
            ease: [0.17, 0.67, 0.12, 0.99], // Custom easing — fast start, slow end
          }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {prizes.map((prize, i) => {
              const startAngle = i * segmentAngle - 90; // -90 to start from top
              const endAngle = (i + 1) * segmentAngle - 90;
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;
              const x1 = 100 + 100 * Math.cos(startRad);
              const y1 = 100 + 100 * Math.sin(startRad);
              const x2 = 100 + 100 * Math.cos(endRad);
              const y2 = 100 + 100 * Math.sin(endRad);
              const largeArc = segmentAngle > 180 ? 1 : 0;

              // Text position (middle of arc, at 65% radius)
              const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
              const textX = 100 + 62 * Math.cos(midAngle);
              const textY = 100 + 62 * Math.sin(midAngle);
              const textRotation = (startAngle + endAngle) / 2 + 90;

              return (
                <g key={i}>
                  <path
                    d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc},1 ${x2},${y2} Z`}
                    fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
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

      {/* Spin button or result */}
      {result ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-3xl mb-2">{result.emoji}</div>
          <div className="text-lg font-bold" style={{ color: colors.primary }}>
            恭喜獲得：{result.label}
          </div>
        </motion.div>
      ) : (
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
