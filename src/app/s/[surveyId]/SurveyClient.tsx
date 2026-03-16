'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Survey, ThemeColors, TemplateId, DiscountTier } from '@/types/survey';
import { getTemplate } from '@/lib/templates';
import SurveyRenderer from '@/components/survey/SurveyRenderer';
import DiscountCodeDisplay from '@/components/survey/DiscountCodeDisplay';

type SurveyStep = 'already-submitted' | 'survey' | 'submitting' | 'discount' | 'phone-prompt';

// Anti-abuse: check if user already submitted this survey
function getSubmissionKey(surveyId: string) {
  return `feedbites_submitted_${surveyId}`;
}

function hasAlreadySubmitted(surveyId: string): boolean {
  try {
    const data = localStorage.getItem(getSubmissionKey(surveyId));
    if (!data) return false;
    const parsed = JSON.parse(data);
    // Check if submitted within last 24 hours
    const submittedAt = new Date(parsed.at).getTime();
    const now = Date.now();
    const hoursSince = (now - submittedAt) / (1000 * 60 * 60);
    return hoursSince < 24;
  } catch {
    return false;
  }
}

function markAsSubmitted(surveyId: string, code?: string) {
  try {
    localStorage.setItem(getSubmissionKey(surveyId), JSON.stringify({
      at: new Date().toISOString(),
      code,
    }));
  } catch { /* ignore */ }
}

function getPreviousCode(surveyId: string): string | null {
  try {
    const data = localStorage.getItem(getSubmissionKey(surveyId));
    if (!data) return null;
    return JSON.parse(data).code || null;
  } catch {
    return null;
  }
}
interface SurveyWithStore extends Survey {
  stores: {
    store_name: string;
    logo_url: string | null;
    frame_id?: string | null;
    owner_avatar_url?: string | null;
  };
}

interface DiscountResult {
  code: string;
  expires_at: string;
  discount_value: string;
  tier_name?: string;
  tier_emoji?: string;
  response_id?: string;
}

export default function SurveyClient({ survey }: { survey: SurveyWithStore }) {
  const [step, setStep] = useState<SurveyStep>(() =>
    hasAlreadySubmitted(survey.id) ? 'already-submitted' : 'survey'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [xpEarned, setXpEarned] = useState(0);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [discountResult, setDiscountResult] = useState<DiscountResult | null>(null);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');

  const template = getTemplate(survey.template_id as TemplateId);
  const colors: ThemeColors = survey.custom_colors || template.colors;
  const storeName = survey.stores?.store_name || '';
  const logoUrl = survey.stores?.logo_url || null;
  const frameId = survey.stores?.frame_id || null;

  // Submit survey immediately — discount is ALWAYS given if enabled (no phone gating)
  const handleSurveySubmit = useCallback((surveyAnswers: Record<string, string | string[]>, xp: number) => {
    setAnswers(surveyAnswers);
    setXpEarned(xp);
    submitResponse(surveyAnswers, xp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitResponse(finalAnswers: Record<string, string | string[]>, xpScore: number, phoneNumber?: string) {
    setIsSubmitting(true);
    setSubmitError('');
    if (!phoneNumber) setStep('submitting');

    try {
      const res = await fetch(`/api/surveys/${survey.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: finalAnswers,
          phone: phoneNumber || undefined,
          xp_earned: xpScore,
          skip_discount: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '提交失敗，請稍後再試');
      }

      const data = await res.json();

      if (data.response?.id) {
        setResponseId(data.response.id);
      }

      if (data.discount_code) {
        setDiscountResult({
          code: data.discount_code.code,
          expires_at: data.discount_code.expires_at,
          discount_value: data.discount_code.discount_value || survey.discount_value,
          tier_name: data.discount_code.tier_name,
          tier_emoji: data.discount_code.tier_emoji,
          response_id: data.response?.id,
        });
        // Mark as submitted to prevent abuse
        markAsSubmitted(survey.id, data.discount_code.code);
      } else {
        markAsSubmitted(survey.id);
      }

      setStep('discount');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '提交失敗，請稍後再試');
      setStep('survey'); // Go back to survey on error
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePhoneSubmit() {
    if (phone && !/^09\d{8}$/.test(phone.replace(/[-\s]/g, ''))) {
      setPhoneError('請輸入正確的手機號碼格式（09xxxxxxxx）');
      return;
    }
    setPhoneError('');
    // Update phone on existing response via PATCH
    if (responseId) {
      fetch(`/api/surveys/${survey.id}/responses`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_id: responseId,
          phone: phone.replace(/[-\s]/g, ''),
        }),
      }).catch(() => {}); // Best effort
    }
    setStep('discount');
  }

  function handleSkipPhone() {
    setStep('discount');
  }

  // ─── Step: Already Submitted (anti-abuse) ───
  if (step === 'already-submitted') {
    const prevCode = getPreviousCode(survey.id);
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: colors.background, fontFamily: "'Noto Sans TC', sans-serif" }}
      >
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">😊</div>
          <h1
            className="text-xl font-bold mb-3"
            style={{ fontFamily: "'Noto Serif TC', serif", color: colors.text }}
          >
            你已經填過這份問卷囉！
          </h1>
          <p className="text-sm mb-4" style={{ color: colors.textLight }}>
            感謝你的回饋，每人限填一次
          </p>
          {prevCode && (
            <div
              className="p-4 rounded-2xl mb-4"
              style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
            >
              <div className="text-xs mb-2" style={{ color: colors.textLight }}>你的優惠碼</div>
              <div
                className="text-2xl font-mono font-bold tracking-[0.2em]"
                style={{ color: colors.primary }}
              >
                {prevCode}
              </div>
            </div>
          )}
          <p className="text-xs" style={{ color: colors.textLight }}>
            24 小時後可以再次填寫
          </p>
        </div>
      </div>
    );
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
        ownerAvatarUrl={survey.stores?.owner_avatar_url}
        frameId={frameId}
        discountEnabled={survey.discount_enabled}
        discountValue={survey.discount_value}
        onSubmit={handleSurveySubmit}
        isSubmitting={isSubmitting}
        discountMode={survey.discount_mode || 'basic'}
        discountTiers={survey.discount_tiers}
      />
    );
  }

  // ─── Step: Submitting (loading) ───
  if (step === 'submitting') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: colors.background, fontFamily: "'Noto Sans TC', sans-serif" }}
      >
        <div className="text-center" style={{ animation: 'slideUp 0.5s ease forwards' }}>
          <div className="text-5xl mb-4">🎊</div>
          <h2
            className="text-xl font-bold mb-2"
            style={{ fontFamily: "'Noto Serif TC', serif", color: colors.text }}
          >
            正在提交...
          </h2>
          <p className="text-sm" style={{ color: colors.textLight }}>
            請稍候
          </p>
          {submitError && (
            <div
              className="p-3 rounded-xl mt-4 text-center text-sm"
              style={{ background: '#D4605A15', color: '#D4605A' }}
            >
              {submitError}
            </div>
          )}
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
        discountValue={discountResult.discount_value || survey.discount_value}
        expiresAt={discountResult.expires_at}
        storeName={storeName}
        colors={colors}
        discountMode={survey.discount_mode || 'basic'}
        tierName={discountResult.tier_name}
        tierEmoji={discountResult.tier_emoji}
        xpEarned={xpEarned}
        responseId={responseId || undefined}
        surveyId={survey.id}
        onPhoneSubmit={(phoneNumber) => {
          // Update phone on existing response via PATCH
          if (responseId) {
            fetch(`/api/surveys/${survey.id}/responses`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                response_id: responseId,
                phone: phoneNumber,
              }),
            }).catch(() => {});
          }
        }}
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

      {/* Viral banner */}
      <div
        className="mt-8 w-full max-w-sm p-5 rounded-2xl text-center"
        style={{ background: `${colors.primary}08`, border: `1px solid ${colors.border}`, animation: 'slideUp 0.5s ease 0.3s both' }}
      >
        <p className="text-xs mb-2" style={{ color: colors.textLight }}>
          你也是餐飲業主嗎？
        </p>
        <p className="text-xs leading-relaxed mb-3" style={{ color: colors.textLight }}>
          <strong style={{ color: colors.text }}>FeedBites</strong> — 全球免費餐飲問卷系統
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

      <div className="mt-6 text-center">
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
