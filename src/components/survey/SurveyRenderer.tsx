'use client';

import { useState, useMemo } from 'react';
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

  const sections = useMemo(() => {
    const sectionMap: Record<string, Question[]> = {};
    questions.forEach(q => {
      const section = q.section || '問卷';
      if (!sectionMap[section]) sectionMap[section] = [];
      sectionMap[section].push(q);
    });
    return Object.entries(sectionMap).map(([title, qs]) => ({ title, questions: qs }));
  }, [questions]);

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).filter(k => {
    const v = answers[k];
    return v && (Array.isArray(v) ? v.length > 0 : v.trim() !== '');
  }).length;
  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const isLastSection = currentSection === sections.length - 1;

  function setAnswer(id: string, value: string | string[]) {
    setAnswers(prev => ({ ...prev, [id]: value }));
  }

  function toggleCheckbox(id: string, option: string) {
    setAnswers(prev => {
      const current = (prev[id] as string[]) || [];
      const next = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      return { ...prev, [id]: next };
    });
  }

  function handleSubmit() {
    onSubmit(answers);
  }

  const section = sections[currentSection];
  if (!section) return null;

  return (
    <div className="min-h-screen" style={{ background: colors.background, color: colors.text, fontFamily: "'Noto Sans TC', sans-serif" }}>
      {/* Header */}
      <div className="text-center pt-10 pb-6 px-6" style={{ background: `linear-gradient(160deg, ${colors.background}, ${colors.border})` }}>
        {logoUrl && (
          <img src={logoUrl} alt={storeName} className="h-12 mx-auto mb-3 object-contain" />
        )}
        <h1 className="text-2xl font-bold tracking-wider mb-1" style={{ fontFamily: "'Noto Serif TC', serif", color: colors.text }}>
          {surveyTitle}
        </h1>
        <p className="text-xs tracking-widest" style={{ color: colors.textLight }}>
          {storeName}
        </p>
        {discountEnabled && (
          <div className="mt-3 inline-block px-4 py-1.5 rounded-full text-xs font-medium" style={{ background: `${colors.primary}15`, color: colors.primary }}>
            🎁 完成問卷即可獲得 {discountValue}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="sticky top-0 z-50 px-4 pt-3 pb-2" style={{ background: colors.background }}>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: colors.border }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${colors.primaryLight}, ${colors.primary})` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs" style={{ color: colors.textLight }}>
          <span>{section.title}</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Section navigation */}
      <div className="flex gap-1 px-4 pb-4 overflow-x-auto">
        {sections.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrentSection(i)}
            className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all"
            style={{
              background: i === currentSection ? colors.primary : colors.border,
              color: i === currentSection ? 'white' : colors.textLight,
            }}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Questions */}
      <div className="px-4 pb-8 max-w-lg mx-auto">
        {section.questions.map(q => (
          <div
            key={q.id}
            className="mb-5 p-5 rounded-2xl"
            style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
          >
            <label className="block text-sm font-medium mb-3" style={{ color: colors.text }}>
              {q.label}
              {q.required && <span className="ml-1" style={{ color: '#D4A0A0' }}>*</span>}
            </label>

            {/* Radio */}
            {q.type === 'radio' && q.options && (
              <div className="flex flex-wrap gap-2">
                {q.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setAnswer(q.id, opt)}
                    className="px-4 py-2 rounded-full text-sm transition-all"
                    style={{
                      background: answers[q.id] === opt
                        ? `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primary})`
                        : colors.background,
                      color: answers[q.id] === opt ? 'white' : colors.text,
                      border: `1px solid ${answers[q.id] === opt ? colors.primary : colors.border}`,
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Checkbox */}
            {q.type === 'checkbox' && q.options && (
              <div className="flex flex-wrap gap-2">
                {q.options.map(opt => {
                  const checked = ((answers[q.id] as string[]) || []).includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleCheckbox(q.id, opt)}
                      className="px-4 py-2 rounded-full text-sm transition-all"
                      style={{
                        background: checked
                          ? `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primary})`
                          : colors.background,
                        color: checked ? 'white' : colors.text,
                        border: `1px solid ${checked ? colors.primary : colors.border}`,
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Rating (1-5 scale) */}
            {q.type === 'rating' && (
              <div className="flex gap-0 rounded-xl overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setAnswer(q.id, String(n))}
                    className="flex-1 py-3 text-center transition-all"
                    style={{
                      background: answers[q.id] === String(n) ? `${colors.primary}20` : colors.background,
                      color: answers[q.id] === String(n) ? colors.primary : colors.textLight,
                      fontWeight: answers[q.id] === String(n) ? 700 : 400,
                      fontSize: '18px',
                      borderRight: n < 5 ? `1px solid ${colors.border}` : 'none',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            {/* Emoji rating */}
            {q.type === 'emoji-rating' && (
              <div className="flex justify-between gap-1">
                {EMOJI_LABELS.map((emoji, i) => {
                  const val = String(i + 1);
                  const selected = answers[q.id] === val;
                  return (
                    <button
                      key={i}
                      onClick={() => setAnswer(q.id, val)}
                      className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all"
                      style={{
                        background: selected ? `${colors.primary}15` : 'transparent',
                        border: `2px solid ${selected ? colors.primary : 'transparent'}`,
                        transform: selected ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span className="text-[10px]" style={{ color: selected ? colors.primary : colors.textLight }}>
                        {EMOJI_TEXTS[i]}
                      </span>
                    </button>
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
          </div>
        ))}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {currentSection > 0 && (
            <button
              onClick={() => setCurrentSection(prev => prev - 1)}
              className="flex-1 py-3 rounded-full text-sm font-medium transition-all"
              style={{ border: `1px solid ${colors.border}`, color: colors.textLight }}
            >
              上一步
            </button>
          )}
          {!isLastSection ? (
            <button
              onClick={() => setCurrentSection(prev => prev + 1)}
              className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-all"
              style={{ background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primary})` }}
            >
              下一步
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primary})`,
                boxShadow: `0 4px 16px ${colors.primary}40`,
              }}
            >
              {isSubmitting ? '提交中...' : '提交回饋'}
            </button>
          )}
        </div>

        {/* FeedBites viral banner */}
        <div
          className="mt-8 p-5 rounded-2xl text-center"
          style={{ background: `${colors.primary}08`, border: `1px solid ${colors.border}` }}
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
        </div>

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
      </div>
    </div>
  );
}
