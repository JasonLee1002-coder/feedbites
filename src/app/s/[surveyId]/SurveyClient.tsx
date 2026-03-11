'use client';

import { useState, useCallback } from 'react';
import type { Survey, ThemeColors, TemplateId } from '@/types/survey';
import { getTemplate } from '@/lib/templates';
import SurveyRenderer from '@/components/survey/SurveyRenderer';
import DiscountCodeDisplay from '@/components/survey/DiscountCodeDisplay';

type SurveyStep = 'survey' | 'phone' | 'discount';

interface SurveyWithStore extends Survey {
  stores: {
    store_name: string;
    logo_url: string | null;
  };
}

interface DiscountResult {
  code: string;
  expires_at: string;
}

export default function SurveyClient({ survey }: { survey: SurveyWithStore }) {
  const [step, setStep] = useState<SurveyStep>('survey');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [discountResult, setDiscountResult] = useState<DiscountResult | null>(null);
  const [submitError, setSubmitError] = useState('');

  const template = getTemplate(survey.template_id as TemplateId);
  const colors: ThemeColors = survey.custom_colors || template.colors;
  const storeName = survey.stores?.store_name || '';
  const logoUrl = survey.stores?.logo_url || null;

  const handleSurveySubmit = useCallback((surveyAnswers: Record<string, string | string[]>) => {
    setAnswers(surveyAnswers);
    // If discount is enabled, collect phone first; otherwise submit directly
    if (survey.discount_enabled) {
      setStep('phone');
    } else {
      submitResponse(surveyAnswers, '');
    }
  }, [survey.discount_enabled]);

  async function submitResponse(finalAnswers: Record<string, string | string[]>, phoneNumber: string) {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch(`/api/surveys/${survey.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: finalAnswers,
          phone: phoneNumber || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '提交失敗，請稍後再試');
      }

      const data = await res.json();

      if (data.discount_code) {
        setDiscountResult({
          code: data.discount_code.code,
          expires_at: data.discount_code.expires_at,
        });
      }

      setStep('discount');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '提交失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePhoneSubmit() {
    // Validate phone if entered
    if (phone && !/^09\d{8}$/.test(phone.replace(/[-\s]/g, ''))) {
      setPhoneError('請輸入正確的手機號碼格式（09xxxxxxxx）');
      return;
    }
    setPhoneError('');
    submitResponse(answers, phone.replace(/[-\s]/g, ''));
  }

  function handleSkipPhone() {
    submitResponse(answers, '');
  }

  // ─── Step: Survey ───
  if (step === 'survey') {
    return (
      <SurveyRenderer
        questions={survey.questions}
        colors={colors}
        storeName={storeName}
        surveyTitle={survey.title}
        logoUrl={logoUrl}
        discountEnabled={survey.discount_enabled}
        discountValue={survey.discount_value}
        onSubmit={handleSurveySubmit}
        isSubmitting={isSubmitting}
      />
    );
  }

  // ─── Step: Phone Collection ───
  if (step === 'phone') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: colors.background, fontFamily: "'Noto Sans TC', sans-serif" }}
      >
        <div className="w-full max-w-sm">
          {/* Animation container */}
          <div className="text-center mb-8" style={{ animation: 'slideUp 0.5s ease forwards' }}>
            <div className="text-5xl mb-4">🎊</div>
            <h2
              className="text-xl font-bold mb-2"
              style={{ fontFamily: "'Noto Serif TC', serif", color: colors.text }}
            >
              差一步就完成了！
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: colors.textLight }}>
              輸入手機號碼領取折扣碼
            </p>
          </div>

          {/* Phone input card */}
          <div
            className="p-6 rounded-2xl mb-4"
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              boxShadow: `0 4px 24px ${colors.primary}10`,
            }}
          >
            <label className="block text-sm font-medium mb-3" style={{ color: colors.text }}>
              手機號碼
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => {
                setPhone(e.target.value);
                setPhoneError('');
              }}
              placeholder="0912345678"
              autoFocus
              inputMode="numeric"
              className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all"
              style={{
                background: colors.background,
                border: `1.5px solid ${phoneError ? '#D4605A' : colors.border}`,
                color: colors.text,
                fontSize: '18px',
                letterSpacing: '0.1em',
              }}
              onFocus={e => {
                e.target.style.borderColor = colors.primary;
              }}
              onBlur={e => {
                e.target.style.borderColor = phoneError ? '#D4605A' : colors.border;
              }}
            />
            {phoneError && (
              <p className="text-xs mt-2" style={{ color: '#D4605A' }}>
                {phoneError}
              </p>
            )}
            <p className="text-xs mt-3 leading-relaxed" style={{ color: colors.textLight }}>
              我們會妥善保管您的資料，僅用於未來優惠通知。
            </p>
          </div>

          {submitError && (
            <div
              className="p-3 rounded-xl mb-4 text-center text-sm"
              style={{ background: '#D4605A15', color: '#D4605A' }}
            >
              {submitError}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handlePhoneSubmit}
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primary})`,
              boxShadow: `0 4px 16px ${colors.primary}40`,
            }}
          >
            {isSubmitting ? '提交中...' : '領取折扣碼'}
          </button>

          {/* Skip button */}
          <button
            onClick={handleSkipPhone}
            disabled={isSubmitting}
            className="w-full py-3 mt-3 text-sm transition-all disabled:opacity-50"
            style={{ color: colors.textLight }}
          >
            跳過，不需要折扣碼
          </button>

          {/* Footer */}
          <div className="text-center mt-10">
            <span className="text-xs" style={{ color: colors.textLight }}>
              Powered by{' '}
              <a href="/" target="_blank" className="font-medium" style={{ color: colors.primary }}>
                FeedBites
              </a>
            </span>
            <div className="text-[10px] mt-0.5" style={{ color: colors.textLight }}>
              Bite. Rate. Save.
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ─── Step: Discount / Thank You ───
  if (step === 'discount' && discountResult) {
    return (
      <DiscountCodeDisplay
        code={discountResult.code}
        discountValue={survey.discount_value}
        expiresAt={discountResult.expires_at}
        storeName={storeName}
        colors={colors}
      />
    );
  }

  // No discount — just show thank you
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: colors.background }}
    >
      <div className="text-center" style={{ animation: 'slideUp 0.5s ease forwards' }}>
        <div className="text-6xl mb-4">🙏</div>
        <h1
          className="text-2xl font-bold tracking-wider mb-2"
          style={{ fontFamily: "'Noto Serif TC', serif", color: colors.text }}
        >
          感謝您的回饋
        </h1>
        <p className="text-sm" style={{ color: colors.textLight }}>
          {storeName} 感謝您的寶貴意見
        </p>
      </div>

      <div className="mt-10 text-center">
        <a href="/" target="_blank" className="text-xs font-medium" style={{ color: colors.primary }}>
          FeedBites
        </a>
        <div className="text-[10px] mt-0.5" style={{ color: colors.textLight }}>
          Bite. Rate. Save.
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
