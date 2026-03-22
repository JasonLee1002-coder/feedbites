'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { getTemplate } from '@/lib/templates';
import type { TemplateId, ThemeColors } from '@/types/survey';

// ─── Types ───
interface Store {
  id: string;
  store_name: string;
  logo_url: string | null;
  template_id: string | null;
  frame_id: string | null;
}

interface Dish {
  id: string;
  name: string;
  description: string | null;
  category: string;
  photo_url: string | null;
  price: string | null;
  is_active: boolean;
}

// ─── Category Config ───
const CATEGORY_EMOJI: Record<string, string> = {
  '主食': '🍚',
  '前菜': '🥗',
  '湯品': '🍲',
  '甜點': '🍰',
  '飲品': '🥤',
  '小吃': '🍢',
  '套餐': '🎁',
  '其他': '🍽️',
};

const CATEGORY_ORDER = ['主食', '前菜', '湯品', '甜點', '飲品', '小吃', '套餐', '其他'];

// ─── Fallback Colors ───
const FALLBACK_COLORS: ThemeColors = {
  primary: '#C5A55A',
  primaryLight: '#E8D5A3',
  primaryDark: '#A08735',
  background: '#FAF7F2',
  surface: '#FFFFFF',
  text: '#3A3A3A',
  textLight: '#8A8585',
  border: '#E8E2D8',
  accent: '#B8926A',
};

export default function MenuClient({ store, dishes }: { store: Store; dishes: Dish[] }) {
  const [activeCategory, setActiveCategory] = useState('全部');
  const tabsRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  // Get theme colors
  const template = store.template_id ? getTemplate(store.template_id as TemplateId) : null;
  const colors: ThemeColors = template?.colors || FALLBACK_COLORS;
  const fontHeading = template?.fontHeading || "'Noto Serif TC', serif";
  const fontBody = template?.fontBody || "'Noto Sans TC', sans-serif";
  const borderRadius = template?.borderRadius || '16px';

  // Build category list from actual dishes
  const categorySet = new Set(dishes.map(d => d.category));
  const categories = CATEGORY_ORDER.filter(c => categorySet.has(c));
  // Add any categories not in the predefined order
  dishes.forEach(d => {
    if (!categories.includes(d.category)) {
      categories.push(d.category);
    }
  });

  // Filter dishes
  const filteredDishes = activeCategory === '全部'
    ? dishes
    : dishes.filter(d => d.category === activeCategory);

  // Sticky detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    );
    const sentinel = document.getElementById('tabs-sentinel');
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Scroll active tab into view
  useEffect(() => {
    if (!tabsRef.current) return;
    const activeTab = tabsRef.current.querySelector('[data-active="true"]');
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeCategory]);

  // Determine if dark theme
  const isDark = isColorDark(colors.background);

  return (
    <div
      className="min-h-screen"
      style={{ background: colors.background, fontFamily: fontBody }}
    >
      {/* ─── Header ─── */}
      <header
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}18 0%, ${colors.background} 50%, ${colors.accent || colors.primaryLight}15 100%)`,
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-[0.07]"
          style={{ background: colors.primary }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-[0.05]"
          style={{ background: colors.accent || colors.primaryLight }}
        />

        <div className="relative px-6 pt-10 pb-8 text-center">
          {/* Logo */}
          {store.logo_url ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="mx-auto mb-4 w-20 h-20 rounded-full overflow-hidden shadow-lg"
              style={{ border: `3px solid ${colors.primary}30` }}
            >
              <Image
                src={store.logo_url}
                alt={store.store_name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="mx-auto mb-4 w-20 h-20 rounded-full flex items-center justify-center shadow-lg text-3xl"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}20, ${colors.primaryLight}30)`,
                border: `3px solid ${colors.primary}30`,
              }}
            >
              🍽️
            </motion.div>
          )}

          {/* Store Name */}
          <motion.h1
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-2xl font-bold tracking-wide mb-1"
            style={{ fontFamily: fontHeading, color: colors.text }}
          >
            {store.store_name}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-sm tracking-[0.3em] font-medium"
            style={{ color: colors.primary }}
          >
            線上菜單
          </motion.p>

          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mx-auto mt-4 h-[2px] w-12 rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)` }}
          />
        </div>
      </header>

      {/* ─── Tabs Sentinel (for sticky detection) ─── */}
      <div id="tabs-sentinel" className="h-0" />

      {/* ─── Category Tabs ─── */}
      {categories.length > 1 && (
        <div
          className="sticky top-0 z-30 transition-shadow duration-300"
          style={{
            background: colors.background,
            boxShadow: isSticky ? `0 2px 12px ${colors.text}10` : 'none',
            borderBottom: isSticky ? `1px solid ${colors.border}` : '1px solid transparent',
          }}
        >
          <div
            ref={tabsRef}
            className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* "All" tab */}
            <TabButton
              label="全部"
              emoji="📋"
              isActive={activeCategory === '全部'}
              colors={colors}
              borderRadius={borderRadius}
              onClick={() => setActiveCategory('全部')}
            />
            {categories.map(cat => (
              <TabButton
                key={cat}
                label={cat}
                emoji={CATEGORY_EMOJI[cat] || '🍽️'}
                isActive={activeCategory === cat}
                colors={colors}
                borderRadius={borderRadius}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── Dish Count ─── */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-xs" style={{ color: colors.textLight }}>
          {activeCategory === '全部' ? '全部' : activeCategory}
          {' '}
          <span style={{ color: colors.primary, fontWeight: 600 }}>{filteredDishes.length}</span>
          {' 道'}
        </p>
      </div>

      {/* ─── Dish Grid ─── */}
      <div className="px-4 pb-8">
        {filteredDishes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-5xl mb-3">🍃</div>
            <p className="text-sm" style={{ color: colors.textLight }}>
              此分類暫無菜品
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-2 gap-3"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: { staggerChildren: 0.06 },
              },
            }}
          >
            <AnimatePresence mode="popLayout">
              {filteredDishes.map((dish) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  colors={colors}
                  fontHeading={fontHeading}
                  borderRadius={borderRadius}
                  isDark={isDark}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ─── Footer ─── */}
      <footer className="pb-8 pt-4 text-center">
        <div
          className="mx-auto mb-6 h-[1px] w-16"
          style={{ background: `linear-gradient(90deg, transparent, ${colors.border}, transparent)` }}
        />
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs font-semibold tracking-wider transition-opacity hover:opacity-70"
          style={{ color: colors.primary }}
        >
          Powered by FeedBites
        </a>
        <p className="text-[10px] mt-1 tracking-widest" style={{ color: colors.textLight }}>
          Bite. Rate. Save.
        </p>
      </footer>

      {/* ─── Hide scrollbar CSS ─── */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ─── Tab Button Component ───
function TabButton({
  label,
  emoji,
  isActive,
  colors,
  borderRadius,
  onClick,
}: {
  label: string;
  emoji: string;
  isActive: boolean;
  colors: ThemeColors;
  borderRadius: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      data-active={isActive}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className="flex-shrink-0 px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap"
      style={{
        borderRadius,
        background: isActive ? colors.primary : `${colors.primary}08`,
        color: isActive ? '#FFFFFF' : colors.textLight,
        border: `1px solid ${isActive ? colors.primary : colors.border}`,
        boxShadow: isActive ? `0 2px 8px ${colors.primary}30` : 'none',
      }}
    >
      <span className="mr-1">{emoji}</span>
      {label}
    </motion.button>
  );
}

// ─── Dish Card Component ───
function DishCard({
  dish,
  colors,
  fontHeading,
  borderRadius,
  isDark,
}: {
  dish: Dish;
  colors: ThemeColors;
  fontHeading: string;
  borderRadius: string;
  isDark: boolean;
}) {
  const emoji = CATEGORY_EMOJI[dish.category] || '🍽️';

  return (
    <motion.div
      layout
      variants={{
        hidden: { opacity: 0, y: 24, scale: 0.96 },
        visible: { opacity: 1, y: 0, scale: 1 },
      }}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -4, boxShadow: `0 8px 24px ${colors.primary}15` }}
      whileTap={{ scale: 0.97 }}
      className="overflow-hidden cursor-default"
      style={{
        borderRadius,
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 1px 4px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)'}`,
      }}
    >
      {/* Photo / Placeholder */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '4/3' }}
      >
        {dish.photo_url ? (
          <Image
            src={dish.photo_url}
            alt={dish.name}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 hover:scale-110"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}10, ${colors.primaryLight || colors.primary}18)`,
            }}
          >
            <span className="text-4xl opacity-60 select-none">{emoji}</span>
          </div>
        )}

        {/* Price badge */}
        {dish.price && (
          <div
            className="absolute bottom-2 right-2 px-2.5 py-1 text-xs font-bold backdrop-blur-sm"
            style={{
              borderRadius: '999px',
              background: `${isDark ? colors.surface : 'rgba(255,255,255,0.92)'}`,
              color: colors.primary,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {dish.price}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3
          className="text-sm font-bold leading-snug mb-1 line-clamp-2"
          style={{ fontFamily: fontHeading, color: colors.text }}
        >
          {dish.name}
        </h3>
        {dish.description && (
          <p
            className="text-[11px] leading-relaxed line-clamp-2"
            style={{ color: colors.textLight }}
          >
            {dish.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Helpers ───
function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}
