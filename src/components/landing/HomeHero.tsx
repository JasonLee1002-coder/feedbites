'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

// 外圈軌道食物
const orbitItems = [
  { emoji: '🍕', offset: 0 },
  { emoji: '🍣', offset: 45 },
  { emoji: '🍜', offset: 90 },
  { emoji: '☕', offset: 135 },
  { emoji: '🍔', offset: 180 },
  { emoji: '🍰', offset: 225 },
  { emoji: '🌮', offset: 270 },
  { emoji: '🥘', offset: 315 },
];

// 內圈軌道 — 問卷/客人相關
const innerOrbitItems = [
  { emoji: '📋', offset: 0 },
  { emoji: '⭐', offset: 60 },
  { emoji: '🎫', offset: 120 },
  { emoji: '📱', offset: 180 },
  { emoji: '💬', offset: 240 },
  { emoji: '🎁', offset: 300 },
];

// 背景漂浮粒子
const floatParticles = [
  { emoji: '✨', x: 8, y: 15, size: 14, dur: 3 },
  { emoji: '✨', x: 85, y: 20, size: 10, dur: 4 },
  { emoji: '✨', x: 15, y: 75, size: 12, dur: 3.5 },
  { emoji: '✨', x: 90, y: 70, size: 16, dur: 2.8 },
  { emoji: '✨', x: 50, y: 8, size: 11, dur: 3.2 },
  { emoji: '✨', x: 30, y: 88, size: 13, dur: 4.2 },
  { emoji: '✨', x: 72, y: 85, size: 10, dur: 3.8 },
  { emoji: '✨', x: 5, y: 45, size: 15, dur: 2.5 },
  { emoji: '✨', x: 95, y: 48, size: 12, dur: 3.6 },
];

function OrbitRing({
  items,
  radius,
  duration,
  reverse = false,
}: {
  items: { emoji: string; offset: number }[];
  radius: number;
  duration: number;
  reverse?: boolean;
}) {
  return (
    <motion.div
      className="absolute inset-0 m-auto"
      style={{ width: radius * 2, height: radius * 2 }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
    >
      {items.map((item, i) => {
        const angle = (item.offset * Math.PI) / 180;
        const x = Math.cos(angle) * radius + radius;
        const y = Math.sin(angle) * radius + radius;
        return (
          <motion.div
            key={i}
            className="absolute select-none"
            style={{
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              fontSize: radius > 140 ? 28 : 22,
            }}
            // Counter-rotate so emojis stay upright
            animate={{ rotate: reverse ? 360 : -360 }}
            transition={{ duration, repeat: Infinity, ease: 'linear' }}
          >
            {item.emoji}
          </motion.div>
        );
      })}

      {/* Orbit ring trace */}
      <div
        className="absolute inset-0 rounded-full border border-dashed border-[#FF8C00]/10"
      />
    </motion.div>
  );
}

export default function HomeHero() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,140,0,0.12) 0%, rgba(255,140,0,0) 70%)',
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Secondary glow */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,0,0.08) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Sparkle particles */}
      {floatParticles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none select-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0.5, 1.2, 0.5],
            y: [0, -20, 0],
          }}
          transition={{
            duration: p.dur,
            delay: i * 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {p.emoji}
        </motion.div>
      ))}

      {/* Orbit area */}
      <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] flex items-center justify-center mb-6">
        {/* Outer orbit — food items */}
        <OrbitRing items={orbitItems} radius={170} duration={30} />

        {/* Inner orbit — survey/customer items (reverse) */}
        <OrbitRing items={innerOrbitItems} radius={115} duration={20} reverse />

        {/* Center: Logo */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.img
            src="/feedbites-logo.png"
            alt="FeedBites"
            className="h-16 sm:h-20 object-contain drop-shadow-xl"
            animate={{
              filter: [
                'drop-shadow(0 0 10px rgba(255,140,0,0.2))',
                'drop-shadow(0 0 25px rgba(255,140,0,0.4))',
                'drop-shadow(0 0 10px rgba(255,140,0,0.2))',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>

      {/* Tagline */}
      <motion.p
        className="text-[#8A8585] text-sm sm:text-base mb-2 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        餐飲問卷管理系統
      </motion.p>

      {/* Slogan */}
      <motion.p
        className="text-[#FF8C00] text-xs tracking-[0.4em] font-bold mb-10 relative z-10"
        initial={{ opacity: 0, letterSpacing: '0.1em' }}
        animate={{ opacity: 1, letterSpacing: '0.4em' }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        BITE. RATE. SAVE.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        className="space-y-3 w-full max-w-xs relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <Link href="/login">
          <motion.span
            className="block w-full px-6 py-3.5 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white rounded-xl text-sm font-bold text-center shadow-lg shadow-[#FF8C00]/25 cursor-pointer"
            whileHover={{
              scale: 1.03,
              boxShadow: '0 15px 35px rgba(255,140,0,0.35)',
              y: -2,
            }}
            whileTap={{ scale: 0.97 }}
          >
            登入
          </motion.span>
        </Link>
        <Link href="/register">
          <motion.span
            className="block w-full px-6 py-3.5 bg-white text-[#3A3A3A] rounded-xl text-sm font-bold text-center border border-[#E8E2D8] cursor-pointer mt-3"
            whileHover={{
              scale: 1.03,
              borderColor: '#FF8C00',
              color: '#FF8C00',
              y: -2,
            }}
            whileTap={{ scale: 0.97 }}
          >
            免費註冊
          </motion.span>
        </Link>
      </motion.div>

      {/* Footer */}
      <motion.footer
        className="absolute bottom-6 text-[10px] text-[#8A8585]/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        &copy; {new Date().getFullYear()} MCS Pte. Ltd.
      </motion.footer>
    </div>
  );
}
