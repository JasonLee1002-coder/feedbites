'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const templateList = [
  { name: '奶油金', en: 'Elegant', bg: '#FAF7F2', primary: '#C5A55A', suited: '西餐 Fine Dining', id: 'fine-dining' },
  { name: '和風', en: 'Zen', bg: '#F5F0E8', primary: '#8B7355', suited: '日料 壽司', id: 'japanese' },
  { name: '工業風', en: 'Industrial', bg: '#1A1A1A', primary: '#D4A14A', suited: '酒吧 燒烤', dark: true, id: 'industrial' },
  { name: '清新', en: 'Fresh', bg: '#F8FAF5', primary: '#6B9B76', suited: '咖啡廳 輕食', id: 'cafe' },
  { name: '古典紅', en: 'Heritage', bg: '#FFF8F0', primary: '#B22222', suited: '中餐 火鍋', id: 'chinese-classic' },
];

export default function TemplatesSection() {
  return (
    <section id="demo" className="max-w-6xl mx-auto px-6 py-24">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold text-[#3A3A3A] font-serif mb-3">
          5 種質感模板
        </h2>
        <p className="text-[#8A8585]">
          每一種都為特定餐飲風格量身打造
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {templateList.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <Link href={`/register?template=${t.id}`}>
              <motion.div
                className="block rounded-2xl overflow-hidden border border-[#E8E2D8] shadow-sm cursor-pointer"
                style={{ background: t.bg }}
                whileHover={{
                  y: -8,
                  boxShadow: `0 20px 40px ${t.primary}25`,
                  scale: 1.03,
                }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="p-6 text-center" style={{ minHeight: 180 }}>
                  {/* Animated color orb */}
                  <motion.div
                    className="w-12 h-12 rounded-full mx-auto mb-3 shadow-lg"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${t.primary}cc, ${t.primary})`,
                      boxShadow: `0 4px 20px ${t.primary}40`,
                    }}
                    whileHover={{
                      scale: 1.2,
                      boxShadow: `0 8px 30px ${t.primary}60`,
                    }}
                  />
                  <div className="font-bold text-lg mb-0.5" style={{ color: t.dark ? '#F0ECE0' : '#3A3A3A' }}>
                    {t.name}
                  </div>
                  <div className="text-xs mb-2" style={{ color: t.dark ? '#A0A0A0' : '#8A8585' }}>
                    {t.en}
                  </div>
                  <div className="text-xs font-medium" style={{ color: t.primary }}>
                    {t.suited}
                  </div>
                  <motion.div
                    className="mt-3 text-xs font-bold px-3 py-1.5 rounded-full inline-block"
                    style={{
                      background: `${t.primary}15`,
                      color: t.primary,
                    }}
                    whileHover={{
                      background: t.primary,
                      color: '#fff',
                    }}
                  >
                    使用此模板 →
                  </motion.div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
