'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { Question, ThemeColors } from '@/types/survey';

const EMOJI_LABELS = ['😢', '😕', '😐', '😊', '😍'];
const EMOJI_TEXTS = ['非常不滿意', '不滿意', '普通', '滿意', '非常滿意'];

interface SurveyRendererProps {
  questions: Question[];
  colors: ThemeColors;
  storeName: string;
  surveyTitle: string;
  logoUrl?: string | null;
  discountEnabled: boolean;
  discountValue: string;
  onSubmit: (answers: Record<string, string | string[]>) => void;
  isSubmitting: boolean;
}

/* ───── spring presets ───── */
const springBounce = { type: 'spring' as const, stiffness: 400, damping: 17 };
const springSmooth = { type: 'spring' as const, stiffness: 300, damping: 24 };

export default function SurveyRenderer({
  questions,
  colors,
  storeName,
  surveyTitle,
  logoUrl,
  discountEnabled,
  discountValue,
  onSubmit,
  isSubmitting,
}: SurveyRendererProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [combo, setCombo] = useState(0);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sections = useMemo(() => {
    const sectionMap: Record<string, Question[]> = {};
    questions.forEach(q => {
      const section = q.section || '問卷';
      if (!sectionMap[section]) sectionMap[section] = [];
      sectionMap[section].push(q);
    });
    return Object.entries(sectionMap).map(([title, qs]) => ({ title, questions: qs }));
  }, [questions]);

  // Count actual answerable questions (exclude section-header, count dish-group subQuestions)
  const countAnswerable = (qs: Question[]): number =>
    qs.reduce((acc, q) => {
      if (q.type === 'section-header') return acc;
      if (q.type === 'dish-group' && q.subQuestions) return acc + q.subQuestions.length;
      return acc + 1;
    }, 0);

  const totalQuestions = countAnswerable(questions);
  const answeredCount = Object.keys(answers).filter(k => {
    if (k.endsWith('_reason')) return false;
    const v = answers[k];
    return v && (Array.isArray(v) ? v.length > 0 : v.trim() !== '');
  }).length;
  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const isLastSection = currentSection === sections.length - 1;

  const setAnswer = useCallback((id: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
    setCombo(prev => prev + 1);
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    comboTimeoutRef.current = setTimeout(() => setCombo(0), 3000);
  }, []);

  function toggleCheckbox(id: string, option: string) {
    setAnswers(prev => {
      const current = (prev[id] as string[]) || [];
      const next = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      return { ...prev, [id]: next };
    });
    setCombo(prev => prev + 1);
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    comboTimeoutRef.current = setTimeout(() => setCombo(0), 3000);
  }

  function handleSubmit() {
    // Fire confetti
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.7 },
      colors: [colors.primary, colors.primaryLight, colors.accent, '#FFD700', '#FF6B6B'],
    });
    // Second burst
    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { y: 0.5, x: 0.3 },
        colors: [colors.primary, colors.primaryLight, colors.accent],
      });
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { y: 0.5, x: 0.7 },
        colors: [colors.primary, colors.primaryLight, colors.accent],
      });
    }, 200);
    onSubmit(answers);
  }

  function goNext() {
    setDirection(1);
    setCurrentSection(prev => prev + 1);
  }

  function goPrev() {
    setDirection(-1);
    setCurrentSection(prev => prev - 1);
  }

  const section = sections[currentSection];
  if (!section) return null;

  /* ───── slide variants for section transitions ───── */
  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  };

  /* ───── helper: render a radio/checkbox pill ───── */
  const renderPill = (
    opt: string,
    isSelected: boolean,
    onClick: () => void,
    size: 'sm' | 'md' = 'md',
  ) => (
    <motion.button
      key={opt}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      animate={{
        background: isSelected
          ? `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primary})`
          : colors.background,
        borderColor: isSelected ? colors.primary : colors.border,
      }}
      transition={springSmooth}
      layout
      className={`${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} rounded-full transition-colors`}
      style={{
        background: isSelected
          ? `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primary})`
          : colors.background,
        color: isSelected ? 'white' : colors.text,
        border: `1px solid ${isSelected ? colors.primary : colors.border}`,
      }}
    >
      {opt}
    </motion.button>
  );

  /* ───── helper: render rating row ───── */
  const renderRating = (qId: string, compact = false) => (
    <div className="flex gap-0 rounded-xl overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
      {[1, 2, 3, 4, 5].map(n => {
        const selected = answers[qId] === String(n);
        return (
          <motion.button
            key={n}
            onClick={() => setAnswer(qId, String(n))}
            whileTap={{ scale: 0.92 }}
            animate={{
              backgroundColor: selected ? `${colors.primary}20` : colors.background,
            }}
            transition={springSmooth}
            className={`flex-1 ${compact ? 'py-2 text-sm' : 'py-3'} text-center transition-all`}
            style={{
              background: selected ? `${colors.primary}20` : colors.background,
              color: selected ? colors.primary : colors.textLight,
              fontWeight: selected ? 700 : 400,
              fontSize: compact ? undefined : '18px',
              borderRight: n < 5 ? `1px solid ${colors.border}` : 'none',
            }}
          >
            {n}
          </motion.button>
        );
      })}
    </div>
  );

  /* ───── helper: reason field with expand animation ───── */
  const renderReasonField = (qId: string, placeholder?: string) => (
    <AnimatePresence>
      {answers[qId] && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ ...springSmooth, opacity: { duration: 0.2 } }}
          className="overflow-hidden"
        >
          <div className="mt-3">
            <input
              type="text"
              value={(answers[`${qId}_reason`] as string) || ''}
              onChange={e => setAnswer(`${qId}_reason`, e.target.value)}
              placeholder={placeholder || '原因（選填）'}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: colors.background,
                border: `1px solid ${colors.border}`,
                color: colors.text,
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: colors.background, color: colors.text, fontFamily: "'Noto Sans TC', sans-serif" }}>
      {/* Keyframe animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { opacity: 0.7; }
          100% { transform: translateY(-120px) scale(0.6); opacity: 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 4px 16px var(--glow-color); }
          50% { box-shadow: 0 4px 28px var(--glow-color), 0 0 40px var(--glow-color); }
        }
        @keyframes combo-pop {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Header with floating particles */}
      <div className="text-center pt-10 pb-6 px-6 relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${colors.background}, ${colors.border})` }}>
        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${4 + (i % 3) * 3}px`,
                height: `${4 + (i % 3) * 3}px`,
                background: `${colors.primary}${30 + (i % 3) * 10}`,
                left: `${10 + i * 11}%`,
                bottom: `-5px`,
                animation: `float-up ${4 + (i % 3) * 2}s ease-in-out infinite`,
                animationDelay: `${i * 0.7}s`,
              }}
            />
          ))}
        </div>

        {logoUrl && (
          <motion.img
            src={logoUrl}
            alt={storeName}
            className="h-12 mx-auto mb-3 object-contain"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
        <motion.h1
          className="text-2xl font-bold tracking-wider mb-1"
          style={{ fontFamily: "'Noto Serif TC', serif", color: colors.text }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {surveyTitle}
        </motion.h1>
        <motion.p
          className="text-xs tracking-widest"
          style={{ color: colors.textLight }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          {storeName}
        </motion.p>
        {discountEnabled && (
          <motion.div
            className="mt-3 inline-block px-4 py-1.5 rounded-full text-xs font-medium"
            style={{ background: `${colors.primary}15`, color: colors.primary }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            🎁 完成問卷即可獲得 {discountValue}
          </motion.div>
        )}
      </div>

      {/* Progress bar with shimmer */}
      <div className="sticky top-0 z-50 px-4 pt-3 pb-2" style={{ background: colors.background }}>
        <div className="h-1.5 rounded-full overflow-hidden relative" style={{ background: colors.border }}>
          <motion.div
            className="h-full rounded-full relative overflow-hidden"
            style={{ background: `linear-gradient(90deg, ${colors.primaryLight}, ${colors.primary})` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Shimmer overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)`,
                animation: 'shimmer 2s ease-in-out infinite',
              }}
            />
          </motion.div>
        </div>
        <div className="flex justify-between mt-1.5 text-xs" style={{ color: colors.textLight }}>
          <span>{section.title}</span>
          <div className="flex items-center gap-2">
            {/* Combo counter */}
            <AnimatePresence>
              {combo >= 2 && (
                <motion.span
                  key={combo}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={springBounce}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: `linear-gradient(135deg, #FF6B35, #FF4444)`,
                    color: 'white',
                  }}
                >
                  🔥 x{combo}
                </motion.span>
              )}
            </AnimatePresence>
            <span>{progress}%</span>
          </div>
        </div>
      </div>

      {/* Section navigation */}
      <div className="flex gap-1 px-4 pb-4 overflow-x-auto">
        {sections.map((s, i) => (
          <motion.button
            key={i}
            onClick={() => {
              setDirection(i > currentSection ? 1 : -1);
              setCurrentSection(i);
            }}
            whileTap={{ scale: 0.95 }}
            className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all"
            style={{
              background: i === currentSection ? colors.primary : colors.border,
              color: i === currentSection ? 'white' : colors.textLight,
            }}
          >
            {s.title}
          </motion.button>
        ))}
      </div>

      {/* Questions with section transition */}
      <div className="px-4 pb-8 max-w-lg mx-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSection}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ ...springSmooth, duration: 0.35 }}
          >
            {section.questions.map((q, index) => {
              // Section header: visual divider, not a question card
              if (q.type === 'section-header') {
                return (
                  <motion.div
                    key={q.id}
                    className="mb-4 mt-6"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, ...springSmooth }}
                  >
                    <h2 className="text-lg font-bold tracking-wide" style={{ color: colors.primary, fontFamily: "'Noto Serif TC', serif" }}>
                      {q.title || q.label}
                    </h2>
                    {q.description && (
                      <p className="text-xs mt-1" style={{ color: colors.textLight }}>{q.description}</p>
                    )}
                    <motion.div
                      className="mt-2 h-0.5 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.primaryLight}, transparent)` }}
                      initial={{ scaleX: 0, originX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: index * 0.1 + 0.2, duration: 0.6 }}
                    />
                  </motion.div>
                );
              }

              // Dish group: container for per-dish sub-questions
              if (q.type === 'dish-group') {
                return (
                  <motion.div
                    key={q.id}
                    className="mb-5 rounded-2xl overflow-hidden"
                    style={{
                      border: `1px solid ${colors.primary}40`,
                      borderLeft: `3px solid ${colors.primary}`,
                    }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, ...springSmooth }}
                  >
                    {/* Dish name header */}
                    <div className="px-5 py-3" style={{ background: `${colors.primary}12` }}>
                      <h3 className="text-sm font-bold" style={{ color: colors.primary }}>
                        {q.dishName || q.title || q.label}
                      </h3>
                      {q.description && (
                        <p className="text-xs mt-0.5" style={{ color: colors.textLight }}>{q.description}</p>
                      )}
                    </div>
                    {/* Sub-questions */}
                    <div className="p-4 space-y-4" style={{ background: colors.surface }}>
                      {(q.subQuestions || []).map((subQ, subIdx) => {
                        const subKey = `${q.id}_${subQ.id}`;
                        const reasonKey = `${subKey}_reason`;
                        return (
                          <motion.div
                            key={subQ.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 + subIdx * 0.05, ...springSmooth }}
                          >
                            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                              {subQ.title || subQ.label}
                              {subQ.required && <span className="ml-1" style={{ color: '#D4A0A0' }}>*</span>}
                            </label>
                            {subQ.description && (
                              <p className="text-xs mb-2" style={{ color: colors.textLight }}>{subQ.description}</p>
                            )}
                            {/* Radio options for sub-question */}
                            {(subQ.type === 'radio' || subQ.type === 'radio-with-reason') && subQ.options && (
                              <div className="flex flex-wrap gap-2">
                                {subQ.options.map(opt =>
                                  renderPill(opt, answers[subKey] === opt, () => setAnswer(subKey, opt), 'sm')
                                )}
                              </div>
                            )}
                            {/* Rating for sub-question */}
                            {(subQ.type === 'rating' || subQ.type === 'rating-with-reason') && renderRating(subKey, true)}
                            {/* Reason field for sub-questions with reason */}
                            {(subQ.type === 'radio-with-reason' || subQ.type === 'rating-with-reason') && (
                              <AnimatePresence>
                                {answers[subKey] && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ ...springSmooth, opacity: { duration: 0.2 } }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-2">
                                      <input
                                        type="text"
                                        value={(answers[reasonKey] as string) || ''}
                                        onChange={e => setAnswer(reasonKey, e.target.value)}
                                        placeholder={subQ.reasonPlaceholder || '原因（選填）'}
                                        className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                                        style={{
                                          background: colors.background,
                                          border: `1px solid ${colors.border}`,
                                          color: colors.text,
                                        }}
                                      />
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              }

              // Standard question card
              return (
                <motion.div
                  key={q.id}
                  className="mb-5 p-5 rounded-2xl"
                  style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, ...springSmooth }}
                >
                  <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                    {q.title || q.label}
                    {q.required && <span className="ml-1" style={{ color: '#D4A0A0' }}>*</span>}
                  </label>
                  {q.description && (
                    <p className="text-xs mb-3" style={{ color: colors.textLight }}>
                      {q.description}
                    </p>
                  )}
                  {!q.description && <div className="mb-3" />}

                  {/* Radio */}
                  {q.type === 'radio' && q.options && (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map(opt =>
                        renderPill(opt, answers[q.id] === opt, () => setAnswer(q.id, opt))
                      )}
                    </div>
                  )}

                  {/* Radio with reason */}
                  {q.type === 'radio-with-reason' && q.options && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map(opt =>
                          renderPill(opt, answers[q.id] === opt, () => setAnswer(q.id, opt))
                        )}
                      </div>
                      {renderReasonField(q.id, q.reasonPlaceholder)}
                    </>
                  )}

                  {/* Checkbox */}
                  {q.type === 'checkbox' && q.options && (
                    <div className="flex flex-wrap gap-2">
                      {q.options.map(opt => {
                        const checked = ((answers[q.id] as string[]) || []).includes(opt);
                        return renderPill(opt, checked, () => toggleCheckbox(q.id, opt));
                      })}
                    </div>
                  )}

                  {/* Rating (1-5 scale) */}
                  {q.type === 'rating' && renderRating(q.id)}

                  {/* Rating with reason */}
                  {q.type === 'rating-with-reason' && (
                    <>
                      {renderRating(q.id)}
                      {renderReasonField(q.id, q.reasonPlaceholder)}
                    </>
                  )}

                  {/* Emoji rating */}
                  {q.type === 'emoji-rating' && (
                    <div className="flex justify-between gap-1">
                      {EMOJI_LABELS.map((emoji, i) => {
                        const val = String(i + 1);
                        const selected = answers[q.id] === val;
                        return (
                          <motion.button
                            key={i}
                            onClick={() => setAnswer(q.id, val)}
                            whileTap={{ scale: 0.9 }}
                            animate={{
                              scale: selected ? [1, 1.3, 1] : 1,
                              borderColor: selected ? colors.primary : 'transparent',
                            }}
                            transition={springBounce}
                            className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl"
                            style={{
                              background: selected ? `${colors.primary}15` : 'transparent',
                              border: `2px solid ${selected ? colors.primary : 'transparent'}`,
                            }}
                          >
                            <motion.span
                              className="text-2xl"
                              animate={selected ? { scale: [1, 1.15, 1] } : {}}
                              transition={{ repeat: selected ? Infinity : 0, duration: 2, ease: 'easeInOut' }}
                            >
                              {emoji}
                            </motion.span>
                            <span className="text-[10px]" style={{ color: selected ? colors.primary : colors.textLight }}>
                              {EMOJI_TEXTS[i]}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {/* Text */}
                  {q.type === 'text' && (
                    <input
                      type="text"
                      value={(answers[q.id] as string) || ''}
                      onChange={e => setAnswer(q.id, e.target.value)}
                      placeholder={q.placeholder || ''}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: colors.background,
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                      }}
                    />
                  )}

                  {/* Textarea */}
                  {q.type === 'textarea' && (
                    <textarea
                      value={(answers[q.id] as string) || ''}
                      onChange={e => setAnswer(q.id, e.target.value)}
                      placeholder={q.placeholder || ''}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-y transition-all"
                      style={{
                        background: colors.background,
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                      }}
                    />
                  )}

                  {/* Number */}
                  {q.type === 'number' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: colors.textLight }}>NT$</span>
                      <input
                        type="number"
                        value={(answers[q.id] as string) || ''}
                        onChange={e => setAnswer(q.id, e.target.value)}
                        placeholder={q.placeholder || ''}
                        className="w-36 px-4 py-3 rounded-xl text-sm text-center outline-none"
                        style={{
                          background: colors.background,
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Navigation */}
            <div className="flex gap-3 mt-6">
              {currentSection > 0 && (
                <motion.button
                  onClick={goPrev}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 py-3 rounded-full text-sm font-medium transition-all"
                  style={{ border: `1px solid ${colors.border}`, color: colors.textLight }}
                >
                  上一步
                </motion.button>
              )}
              {!isLastSection ? (
                <motion.button
                  onClick={goNext}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-all"
                  style={{ background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primary})` }}
                >
                  下一步
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primary})`,
                    ['--glow-color' as string]: `${colors.primary}40`,
                    boxShadow: `0 4px 16px ${colors.primary}40`,
                    animation: !isSubmitting ? 'glow-pulse 2s ease-in-out infinite' : 'none',
                  }}
                >
                  {isSubmitting ? '提交中...' : '提交回饋'}
                </motion.button>
              )}
            </div>

            {/* FeedBites viral banner */}
            <motion.div
              className="mt-8 p-5 rounded-2xl text-center"
              style={{ background: `${colors.primary}08`, border: `1px solid ${colors.border}` }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-xs mb-2" style={{ color: colors.textLight }}>
                ☕ 你也是餐飲業主嗎？
              </p>
              <p className="text-xs leading-relaxed mb-3" style={{ color: colors.textLight }}>
                <strong style={{ color: colors.text }}>FeedBites</strong> 是由新加坡 MCS 推出的<br />
                全球免費餐飲問卷系統
              </p>
              <a
                href="/"
                target="_blank"
                className="inline-block px-5 py-2 rounded-full text-xs font-medium transition-all hover:opacity-80"
                style={{ background: colors.primary, color: 'white' }}
              >
                免費開通我的餐廳問卷 →
              </a>
            </motion.div>

            {/* Footer */}
            <div className="text-center mt-6 pb-8">
              <span className="text-xs" style={{ color: colors.textLight }}>
                Powered by{' '}
                <a href="/" target="_blank" className="font-medium" style={{ color: colors.primary }}>
                  FeedBites
                </a>
              </span>
              <div className="text-[10px] mt-1" style={{ color: colors.textLight }}>
                Bite. Rate. Save.
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
