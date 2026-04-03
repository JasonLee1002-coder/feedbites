'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';

// AI 功能亮點 — 輪播顯示
const aiFeatures = [
  { icon: '🤖', text: '副店長 AI 全程陪伴' },
  { icon: '🎙️', text: '客人用說的就能回饋' },
  { icon: '📸', text: '拍菜單自動建檔' },
  { icon: '📊', text: 'AI 自動洞察分析' },
  { icon: '🎰', text: '刮刮卡折扣回饋' },
  { icon: '💬', text: 'AI 精靈對話式收集' },
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

// 環繞食物 emoji — 只放 6 個，間距更大更乾淨
const orbitFoods = ['🍕', '🍣', '🍜', '🍔', '🍰', '🌮'];

export default function HomeHero() {
  const [featureIdx, setFeatureIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFeatureIdx(prev => (prev + 1) % aiFeatures.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0D0D0F] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow — orange core */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,140,0,0.15) 0%, rgba(255,140,0,0) 70%)',
        }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Secondary glow — warm accent */}
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full pointer-events-none translate-y-[-60px]"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,0,0.1) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.5, 0.2],
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
            opacity: [0, 0.5, 0],
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

      {/* Orbiting food emojis — subtle, far from text */}
      <div className="absolute w-[360px] h-[360px] sm:w-[460px] sm:h-[460px] pointer-events-none -translate-y-[30px]">
        <motion.div
          className="w-full h-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        >
          {orbitFoods.map((emoji, i) => {
            const angle = (i * 60 * Math.PI) / 180;
            const r = 170;
            return (
              <motion.span
                key={i}
                className="absolute text-lg sm:text-xl select-none opacity-40"
                style={{
                  left: `calc(50% + ${Math.cos(angle) * r}px)`,
                  top: `calc(50% + ${Math.sin(angle) * r}px)`,
                  transform: 'translate(-50%, -50%)',
                }}
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              >
                {emoji}
              </motion.span>
            );
          })}
        </motion.div>
      </div>

      {/* ═══ Main Title Area ═══ */}
      <div className="relative z-10 text-center mb-8">
        {/* AI badge */}
        <motion.div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF8C00]/10 border border-[#FF8C00]/20 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-[#FF8C00]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-[#FF8C00] text-xs font-medium tracking-wider">AI-POWERED</span>
        </motion.div>

        {/* Hero title — 直球 */}
        <motion.h1
          className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-3"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-white">AI 智慧</span>
          <br />
          <motion.span
            className="bg-gradient-to-r from-[#FF8C00] via-[#FFB347] to-[#FF6B00] bg-clip-text text-transparent"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            style={{ backgroundSize: '200% 200%' }}
          >
            餐飲問卷調查
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-white/50 text-sm sm:text-base max-w-xs mx-auto mb-6 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          不只是問卷 — AI 幫你聽見客人的心聲
          <br />
          <span className="text-white/30 text-xs">填完自動送折扣碼，填答率提升 3 倍</span>
        </motion.p>

        {/* AI Feature carousel */}
        <motion.div
          className="h-8 relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {aiFeatures.map((feat, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 flex items-center justify-center gap-2"
              initial={false}
              animate={{
                opacity: featureIdx === i ? 1 : 0,
                y: featureIdx === i ? 0 : 10,
              }}
              transition={{ duration: 0.4 }}
            >
              <span className="text-lg">{feat.icon}</span>
              <span className="text-white/70 text-sm font-medium">{feat.text}</span>
            </motion.div>
          ))}
          {/* Progress dots */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1">
            {aiFeatures.map((_, i) => (
              <motion.div
                key={i}
                className="w-1 h-1 rounded-full"
                animate={{
                  backgroundColor: featureIdx === i ? '#FF8C00' : 'rgba(255,255,255,0.15)',
                  scale: featureIdx === i ? 1.3 : 1,
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* CTA Buttons */}
      <motion.div
        className="space-y-3 w-full max-w-xs relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <Link href="/login">
          <motion.span
            className="block w-full px-6 py-3.5 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white rounded-xl text-sm font-bold text-center shadow-lg shadow-[#FF8C00]/30 cursor-pointer"
            whileHover={{
              scale: 1.03,
              boxShadow: '0 15px 40px rgba(255,140,0,0.4)',
              y: -2,
            }}
            whileTap={{ scale: 0.97 }}
          >
            登入
          </motion.span>
        </Link>
        <Link href="/register">
          <motion.span
            className="block w-full px-6 py-3.5 bg-white/5 text-white/90 rounded-xl text-sm font-bold text-center border border-white/10 cursor-pointer mt-3 backdrop-blur-sm"
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

      {/* Bottom comparison hint */}
      <motion.p
        className="text-white/20 text-[10px] mt-8 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        比 Google 表單有質感 · 比 SurveyCake 更懂餐飲 · 完全免費
      </motion.p>

      {/* Footer */}
      <motion.footer
        className="absolute bottom-6 text-[10px] text-white/15"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        &copy; {new Date().getFullYear()} MCS Pte. Ltd.
      </motion.footer>
    </div>
  );
}
