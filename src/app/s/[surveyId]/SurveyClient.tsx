'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Survey, ThemeColors, TemplateId, DiscountTier } from '@/types/survey';
import { getTemplate } from '@/lib/templates';
import SurveyRenderer from '@/components/survey/SurveyRenderer';
import DiscountCodeDisplay from '@/components/survey/DiscountCodeDisplay';
import { getTextureStyle } from '@/lib/textures';

type SurveyStep = 'already-submitted' | 'survey' | 'submitting' | 'discount' | 'phone-prompt';

// Anti-abuse: check if user already submitted this survey
function getSubmissionKey(surveyId: string) {
  return `feedbites_submitted_${surveyId}`;
}

function hasAlreadySubmitted(_surveyId: string): boolean {
  // Disabled: allow unlimited submissions for testing
  return false;
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

function PreviewBar({ surveyId }: { surveyId: string }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-2.5 bg-[#1a1a2e]/95 backdrop-blur-sm shadow-lg">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-medium text-white/80">店長預覽模式</span>
      </div>
      <a
        href={`/dashboard/surveys/${surveyId}`}
        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#C5A55A] text-white text-xs font-bold rounded-full hover:bg-[#A08735] transition-colors"
      >
        ← 返回後台
      </a>
    </div>
  );
}

export default function SurveyClient({ survey }: { survey: SurveyWithStore }) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

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
      <>
      {isPreview && <PreviewBar surveyId={survey.id} />}
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: colors.background, fontFamily: "'Noto Sans TC', sans-serif", ...getTextureStyle(colors.texture) }}
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
      </>
    );
  }

  // ─── Step: Survey ───
  if (step === 'survey') {
    return (
      <>
      {isPreview && <PreviewBar surveyId={survey.id} />}
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
      </>
    );
  }

  // ─── Step: Submitting (loading) ───
  if (step === 'submitting') {
    return (
      <>
      {isPreview && <PreviewBar surveyId={survey.id} />}
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: colors.background, fontFamily: "'Noto Sans TC', sans-serif", ...getTextureStyle(colors.texture) }}
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
      </>
    );
  }

  // ─── Step: Discount / Thank You ───
  if (step === 'discount' && discountResult) {
    return (
      <>
      {isPreview && <PreviewBar surveyId={survey.id} />}
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
        prizeItems={survey.prize_items}
        prizeValidToday={survey.prize_same_day_valid !== false}
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
      </>
    );
  }

  // No discount — just show thank you
  return (
    <>
    {isPreview && <PreviewBar surveyId={survey.id} />}
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

      <div
        className="mt-8 w-full max-w-sm p-5 rounded-2xl text-center"
        style={{ background: `${colors.primary}08`, border: `1px solid ${colors.border}`, animation: 'slideUp 0.5s ease 0.3s both' }}
      >
        <div className="text-2xl mb-2">💬</div>
        <p className="text-sm font-medium mb-1" style={{ color: colors.text }}>
          您的意見對我們非常重要
        </p>
        <p className="text-xs leading-relaxed" style={{ color: colors.textLight }}>
          感謝撥冗填寫，{storeName} 會持續改進，期待您下次光臨！
        </p>
      </div>

      <div className="mt-6 text-center">
        <div className="text-[10px]" style={{ color: colors.textLight }}>
          Powered by FeedBites
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
    </>
  );
}
