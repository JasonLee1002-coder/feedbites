'use client';

import { motion } from 'framer-motion';

const features = [
  {
    icon: '🎨',
    title: '5 種高質感模板',
    desc: '奶油金、和風、工業風、清新、古典紅。上傳你的 Logo，問卷就是你的品牌延伸。',
    gradient: 'from-orange-400 to-amber-500',
  },
  {
    icon: '🎁',
    title: '填完送折扣碼',
    desc: '客人填問卷像玩遊戲，XP 積分 + 刮刮卡揭曉獎勵。回填率提升 3 倍。',
    gradient: 'from-pink-400 to-rose-500',
  },
  {
    icon: '📊',
    title: '即時統計儀表板',
    desc: '每一筆回饋即時入帳，圖表化分析，隨時掌握客人的真實想法。',
    gradient: 'from-blue-400 to-indigo-500',
  },
  {
    icon: '🍽️',
    title: '菜品評分管理',
    desc: '上傳菜單讓客人逐道評分，找出人氣王和需改進的菜色。',
    gradient: 'from-emerald-400 to-teal-500',
  },
  {
    icon: '📱',
    title: 'QR Code 即掃即填',
    desc: '精美花框列印貼桌上，客人掃碼就填，零門檻零下載。',
    gradient: 'from-violet-400 to-purple-500',
  },
  {
    icon: '🏪',
    title: '多店管理',
    desc: '一個帳號管理多家分店，各店獨立問卷、獨立數據。',
    gradient: 'from-cyan-400 to-sky-500',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

export default function FeaturesSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold text-[#3A3A3A] font-serif mb-3">
          為什麼選 FeedBites？
        </h2>
        <p className="text-[#8A8585]">不只是問卷，是完整的餐飲回饋系統</p>
      </motion.div>

      <motion.div
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
      >
        {features.map((f, i) => (
          <motion.div
            key={i}
            variants={cardVariants}
            whileHover={{
              y: -8,
              boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
            }}
            className="group relative bg-white rounded-2xl p-7 border border-[#E8E2D8] shadow-sm cursor-default overflow-hidden"
          >
            {/* Hover gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />

            <motion.div
              className="text-4xl mb-4 inline-block"
              whileHover={{ scale: 1.3, rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.4 }}
            >
              {f.icon}
            </motion.div>
            <h3 className="text-lg font-bold text-[#3A3A3A] mb-2">{f.title}</h3>
            <p className="text-sm text-[#8A8585] leading-relaxed">{f.desc}</p>

            {/* Bottom accent line */}
            <div className={`absolute bottom-0 left-0 h-1 w-0 group-hover:w-full bg-gradient-to-r ${f.gradient} transition-all duration-500`} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
