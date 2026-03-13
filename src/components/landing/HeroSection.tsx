'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const floatingIcons = ['🍕', '🍣', '🍜', '🥗', '🍰', '☕', '🍔', '🌮', '🍱', '🥘', '🧁', '🍷'];

export default function HeroSection() {
  const [particles, setParticles] = useState<Array<{ id: number; emoji: string; x: number; y: number; size: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    const items = floatingIcons.map((emoji, i) => ({
      id: i,
      emoji,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 20 + Math.random() * 24,
      delay: Math.random() * 3,
      duration: 4 + Math.random() * 4,
    }));
    setParticles(items);
  }, []);

  return (
    <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-32 text-center overflow-hidden">
      {/* Floating food emoji background */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute select-none"
            style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: [0, 0.3, 0.15, 0.3, 0],
              y: [20, -30, -10, -40, -60],
              rotate: [0, 10, -10, 5, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {p.emoji}
          </motion.div>
        ))}
      </div>

      {/* Glowing orb behind logo */}
      <motion.div
        className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,140,0,0.15) 0%, rgba(255,140,0,0) 70%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Logo with entrance animation */}
      <motion.div
        className="relative z-10 mb-6"
        initial={{ opacity: 0, scale: 0.5, rotateY: 90 }}
        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.img
          src="/feedbites-logo.png"
          alt="FeedBites"
          className="h-24 md:h-32 mx-auto object-contain drop-shadow-2xl"
          whileHover={{
            scale: 1.05,
            filter: 'drop-shadow(0 0 30px rgba(255,140,0,0.5))',
          }}
          transition={{ type: 'spring', stiffness: 300 }}
        />
      </motion.div>

      {/* Badge */}
      <motion.div
        className="inline-block px-4 py-1.5 bg-[#FF8C00]/10 text-[#FF8C00] text-xs rounded-full mb-6 tracking-widest font-medium border border-[#FF8C00]/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        BY MCS &middot; SINGAPORE
      </motion.div>

      {/* Headline */}
      <motion.h1
        className="relative z-10 text-4xl md:text-6xl font-bold text-[#3A3A3A] font-serif leading-tight mb-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7, ease: 'easeOut' }}
      >
        餐廳問卷<br className="md:hidden" />不該長得像<br />
        <motion.span
          className="relative inline-block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <span className="text-[#FF8C00]">Google 表單</span>
          {/* Strikethrough animation */}
          <motion.span
            className="absolute left-0 top-1/2 h-1 bg-[#FF8C00]/30 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 1.4, duration: 0.4 }}
          />
        </motion.span>
      </motion.h1>

      {/* Subtext */}
      <motion.p
        className="relative z-10 text-lg text-[#8A8585] max-w-xl mx-auto mb-4 leading-relaxed"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
      >
        FeedBites 讓你的問卷和你的餐廳一樣有質感。<br />
        客人掃碼填問卷，填完自動拿折扣碼。
      </motion.p>

      {/* Slogan */}
      <motion.p
        className="relative z-10 text-sm text-[#FF8C00] tracking-[0.3em] mb-10 font-bold"
        initial={{ opacity: 0, letterSpacing: '0.1em' }}
        animate={{ opacity: 1, letterSpacing: '0.3em' }}
        transition={{ delay: 0.9, duration: 0.8 }}
      >
        Bite. Rate. Save.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.6 }}
      >
        <Link href="/register">
          <motion.span
            className="inline-block px-8 py-4 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white rounded-full text-lg font-semibold shadow-lg shadow-[#FF8C00]/30 cursor-pointer"
            whileHover={{
              scale: 1.05,
              boxShadow: '0 20px 40px rgba(255,140,0,0.4)',
              y: -2,
            }}
            whileTap={{ scale: 0.97 }}
          >
            免費開通我的餐廳問卷
          </motion.span>
        </Link>
        <Link href="#demo">
          <motion.span
            className="inline-block px-8 py-4 border-2 border-[#FF8C00]/30 text-[#FF8C00] rounded-full text-lg font-medium cursor-pointer"
            whileHover={{
              borderColor: '#FF8C00',
              backgroundColor: 'rgba(255,140,0,0.05)',
            }}
          >
            看 Demo
          </motion.span>
        </Link>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-[#E8E2D8] rounded-full flex justify-center pt-2">
          <motion.div
            className="w-1.5 h-1.5 bg-[#FF8C00] rounded-full"
            animate={{ opacity: [1, 0.3, 1], y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}
