'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    step: '01',
    title: '免費註冊',
    desc: 'Google 一鍵登入，不綁信用卡',
    icon: '✨',
  },
  {
    step: '02',
    title: '選模板建問卷',
    desc: '選風格、傳 Logo、調整問題，5 分鐘搞定',
    icon: '🎨',
  },
  {
    step: '03',
    title: '印 QR Code 貼桌上',
    desc: '客人掃碼填問卷，你即時看統計',
    icon: '📱',
  },
];

export default function StepsSection() {
  return (
    <section className="relative bg-white py-24 border-t border-[#E8E2D8] overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'radial-gradient(circle, #FF8C00 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.h2
          className="text-3xl font-bold text-center text-[#3A3A3A] font-serif mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          3 步驟開始
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-[#FF8C00]/20 via-[#FF8C00]/40 to-[#FF8C00]/20" />

          {steps.map((s, i) => (
            <motion.div
              key={i}
              className="text-center relative"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 0.6 }}
            >
              <motion.div
                className="relative w-24 h-24 mx-auto mb-6"
                whileHover={{ scale: 1.1 }}
              >
                {/* Outer ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-dashed border-[#FF8C00]/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                />
                {/* Inner circle */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[#FF8C00] to-[#FF6B00] shadow-lg shadow-[#FF8C00]/20 flex items-center justify-center">
                  <span className="text-3xl">{s.icon}</span>
                </div>
                {/* Step number badge */}
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-[#FF8C00] flex items-center justify-center text-xs font-bold text-[#FF8C00] shadow-sm">
                  {s.step}
                </div>
              </motion.div>

              <h3 className="text-lg font-bold text-[#3A3A3A] mb-2">{s.title}</h3>
              <p className="text-sm text-[#8A8585]">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
