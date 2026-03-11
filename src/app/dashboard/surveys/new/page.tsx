'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { templateList } from '@/lib/templates';
import { surveyTemplates } from '@/lib/survey-templates';
import { ArrowLeft, Check } from 'lucide-react';
import type { TemplateId, Question } from '@/types/survey';

type Step = 1 | 2 | 3 | 4;

export default function NewSurveyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Template
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);

  // Step 2: Title + Questions
  const [title, setTitle] = useState('');
  const [questionSource, setQuestionSource] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customQuestions, setCustomQuestions] = useState<Question[]>([
    { id: 'q1', type: 'emoji-rating', label: '', required: true, min: 1, max: 5 },
  ]);

  // Step 3: Discount
  const [discountEnabled, setDiscountEnabled] = useState(true);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'freebie' | 'custom_text'>('percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [discountExpiryDays, setDiscountExpiryDays] = useState(7);

  const getQuestions = (): Question[] => {
    if (questionSource === 'preset' && selectedPreset) {
      const tmpl = surveyTemplates.find(t => t.id === selectedPreset);
      return tmpl?.questions || [];
    }
    return customQuestions.filter(q => (q.title || q.label || '').trim() !== '');
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return selectedTemplate !== null;
      case 2: return title.trim() !== '' && getQuestions().length > 0;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  const handleAddQuestion = () => {
    const newId = `q${customQuestions.length + 1}`;
    setCustomQuestions([
      ...customQuestions,
      { id: newId, type: 'emoji-rating', label: '', required: true, min: 1, max: 5 },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (customQuestions.length <= 1) return;
    setCustomQuestions(customQuestions.filter((_, i) => i !== index));
  };

  const handleUpdateQuestion = (index: number, updates: Partial<Question>) => {
    setCustomQuestions(customQuestions.map((q, i) => (i === index ? { ...q, ...updates } : q)));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const body = {
        title: title.trim(),
        template_id: selectedTemplate,
        questions: getQuestions(),
        discount_enabled: discountEnabled,
        discount_type: discountType,
        discount_value: discountValue,
        discount_expiry_days: discountExpiryDays,
      };

      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '建立問卷失敗');
      }

      const data = await res.json();
      router.push(`/dashboard/surveys/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '發生錯誤');
      setSubmitting(false);
    }
  };

  const stepLabels = ['選擇模板', '設定問卷', '折扣設定', '預覽發布'];

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Back Link */}
      <Link
        href="/dashboard/surveys"
        className="inline-flex items-center gap-1.5 text-sm text-[#8A8585] hover:text-[#A08735] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回問卷列表
      </Link>

      <h1 className="text-2xl font-bold text-[#3A3A3A] font-serif mb-2">建立新問卷</h1>
      <p className="text-sm text-[#8A8585] mb-8">按步驟完成問卷設定</p>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {stepLabels.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && (
                <div className={`w-8 h-px ${isDone ? 'bg-[#C5A55A]' : 'bg-[#E8E2D8]'}`} />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive
                      ? 'bg-[#C5A55A] text-white'
                      : isDone
                      ? 'bg-[#C5A55A]/20 text-[#A08735]'
                      : 'bg-[#E8E2D8] text-[#8A8585]'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : stepNum}
                </div>
                <span className={`text-xs hidden sm:inline ${isActive ? 'text-[#3A3A3A] font-medium' : 'text-[#8A8585]'}`}>
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Choose Template */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-bold text-[#3A3A3A] font-serif mb-2">選擇問卷模板</h2>
          <p className="text-sm text-[#8A8585] mb-6">選擇一個風格模板，決定問卷的視覺外觀</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templateList.map((tmpl) => {
              const isSelected = selectedTemplate === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`text-left rounded-2xl border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-[#C5A55A] shadow-md'
                      : 'border-[#E8E2D8] hover:border-[#C5A55A]/50'
                  }`}
                  style={{ backgroundColor: tmpl.colors.background }}
                >
                  {/* Color Preview */}
                  <div className="flex gap-1.5 mb-3">
                    {[tmpl.colors.primary, tmpl.colors.primaryLight, tmpl.colors.accent].map((color, i) => (
                      <div key={i} className="w-6 h-6 rounded-full" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <h3 className="font-bold text-sm mb-0.5" style={{ color: tmpl.colors.text }}>
                    {tmpl.name}
                  </h3>
                  <p className="text-xs mb-1" style={{ color: tmpl.colors.textLight }}>
                    {tmpl.nameEn}
                  </p>
                  <p className="text-xs" style={{ color: tmpl.colors.textLight }}>
                    {tmpl.description}
                  </p>
                  <p className="text-xs mt-2 opacity-70" style={{ color: tmpl.colors.textLight }}>
                    {tmpl.suited}
                  </p>
                  {isSelected && (
                    <div className="mt-3 text-xs font-medium text-[#C5A55A] flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      已選擇
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Title + Questions */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-bold text-[#3A3A3A] font-serif mb-2">設定問卷內容</h2>
          <p className="text-sm text-[#8A8585] mb-6">設定標題並選擇問題</p>

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#3A3A3A] mb-2">問卷標題</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：用餐滿意度調查"
              className="w-full px-4 py-3 rounded-xl border border-[#E8E2D8] bg-white text-[#3A3A3A] text-sm focus:outline-none focus:border-[#C5A55A] focus:ring-2 focus:ring-[#C5A55A]/20 placeholder:text-[#8A8585]/60"
            />
          </div>

          {/* Question Source */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#3A3A3A] mb-3">問題來源</label>
            <div className="flex gap-3">
              <button
                onClick={() => setQuestionSource('preset')}
                className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                  questionSource === 'preset'
                    ? 'border-[#C5A55A] bg-[#C5A55A]/5 text-[#3A3A3A] font-medium'
                    : 'border-[#E8E2D8] text-[#8A8585] hover:border-[#C5A55A]/50'
                }`}
              >
                使用預設問題組
              </button>
              <button
                onClick={() => setQuestionSource('custom')}
                className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                  questionSource === 'custom'
                    ? 'border-[#C5A55A] bg-[#C5A55A]/5 text-[#3A3A3A] font-medium'
                    : 'border-[#E8E2D8] text-[#8A8585] hover:border-[#C5A55A]/50'
                }`}
              >
                自訂問題
              </button>
            </div>
          </div>

          {/* Preset Question Sets */}
          {questionSource === 'preset' && (
            <div className="space-y-3">
              {surveyTemplates.map((tmpl) => {
                const isSelected = selectedPreset === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedPreset(tmpl.id)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                      isSelected
                        ? 'border-[#C5A55A] bg-[#C5A55A]/5'
                        : 'border-[#E8E2D8] bg-white hover:border-[#C5A55A]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-[#3A3A3A]">{tmpl.name}</h4>
                        <p className="text-xs text-[#8A8585] mt-0.5">{tmpl.description}</p>
                        <span className="inline-block mt-2 px-2 py-0.5 bg-[#FAF7F2] text-[#8A8585] text-xs rounded-full">
                          {tmpl.category} / {tmpl.questions.length} 題
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-[#C5A55A] shrink-0 mt-1">
                          <Check className="w-5 h-5" />
                        </span>
                      )}
                    </div>
                    {/* Show questions preview when selected */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-[#E8E2D8]">
                        <div className="space-y-1.5">
                          {tmpl.questions.slice(0, 6).map((q, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-[#8A8585]">
                              <span className="w-4 h-4 rounded bg-[#E8E2D8] flex items-center justify-center text-[10px] text-[#8A8585] shrink-0">
                                {i + 1}
                              </span>
                              <span className="truncate">{q.label}</span>
                              <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-[#FAF7F2] rounded text-[#8A8585]">
                                {q.type}
                              </span>
                            </div>
                          ))}
                          {tmpl.questions.length > 6 && (
                            <p className="text-[10px] text-[#8A8585] pl-6">
                              ...還有 {tmpl.questions.length - 6} 題
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom Questions */}
          {questionSource === 'custom' && (
            <div className="space-y-4">
              {customQuestions.map((q, index) => (
                <div key={index} className="bg-white rounded-xl border border-[#E8E2D8] p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#C5A55A]/10 text-[#A08735] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={q.label}
                        onChange={(e) => handleUpdateQuestion(index, { label: e.target.value })}
                        placeholder="輸入問題..."
                        className="w-full px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm text-[#3A3A3A] focus:outline-none focus:border-[#C5A55A] placeholder:text-[#8A8585]/60"
                      />
                      <div className="flex items-center gap-3">
                        <select
                          value={q.type}
                          onChange={(e) => handleUpdateQuestion(index, { type: e.target.value as Question['type'] })}
                          className="px-3 py-1.5 rounded-lg border border-[#E8E2D8] text-xs text-[#3A3A3A] bg-white focus:outline-none focus:border-[#C5A55A]"
                        >
                          <option value="emoji-rating">表情評分</option>
                          <option value="rating">星級評分</option>
                          <option value="radio">單選</option>
                          <option value="checkbox">多選</option>
                          <option value="text">簡答</option>
                          <option value="textarea">長答</option>
                          <option value="number">數字</option>
                        </select>
                        <label className="flex items-center gap-1.5 text-xs text-[#8A8585]">
                          <input
                            type="checkbox"
                            checked={q.required}
                            onChange={(e) => handleUpdateQuestion(index, { required: e.target.checked })}
                            className="accent-[#C5A55A]"
                          />
                          必填
                        </label>
                      </div>
                      {/* Options for radio/checkbox */}
                      {(q.type === 'radio' || q.type === 'checkbox') && (
                        <div>
                          <input
                            type="text"
                            value={(q.options || []).join(', ')}
                            onChange={(e) =>
                              handleUpdateQuestion(index, {
                                options: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                              })
                            }
                            placeholder="選項（用逗號分隔）"
                            className="w-full px-3 py-2 rounded-lg border border-[#E8E2D8] text-xs text-[#3A3A3A] focus:outline-none focus:border-[#C5A55A] placeholder:text-[#8A8585]/60"
                          />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveQuestion(index)}
                      disabled={customQuestions.length <= 1}
                      className="p-1.5 text-[#8A8585] hover:text-red-500 disabled:opacity-30 transition-colors"
                      title="移除問題"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={handleAddQuestion}
                className="w-full py-3 border-2 border-dashed border-[#E8E2D8] rounded-xl text-sm text-[#8A8585] hover:border-[#C5A55A] hover:text-[#A08735] transition-colors"
              >
                + 新增問題
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Discount */}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-bold text-[#3A3A3A] font-serif mb-2">折扣設定</h2>
          <p className="text-sm text-[#8A8585] mb-6">設定完成問卷後的折扣獎勵</p>

          {/* Enable/Disable */}
          <div className="bg-white rounded-xl border border-[#E8E2D8] p-5 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#3A3A3A]">啟用折扣獎勵</h4>
                <p className="text-xs text-[#8A8585] mt-0.5">顧客完成問卷後會收到折扣碼</p>
              </div>
              <button
                type="button"
                onClick={() => setDiscountEnabled(!discountEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  discountEnabled ? 'bg-[#C5A55A]' : 'bg-[#E8E2D8]'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    discountEnabled ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {discountEnabled && (
            <div className="space-y-4">
              {/* Discount Type */}
              <div className="bg-white rounded-xl border border-[#E8E2D8] p-5">
                <label className="block text-sm font-medium text-[#3A3A3A] mb-3">折扣類型</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'percentage', label: '百分比折扣', desc: '例如：打9折' },
                    { value: 'fixed', label: '固定金額', desc: '例如：折50元' },
                    { value: 'freebie', label: '免費贈品', desc: '例如：送小菜一份' },
                    { value: 'custom_text', label: '自訂文字', desc: '自由輸入優惠內容' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDiscountType(opt.value as typeof discountType)}
                      className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${
                        discountType === opt.value
                          ? 'border-[#C5A55A] bg-[#C5A55A]/5'
                          : 'border-[#E8E2D8] hover:border-[#C5A55A]/50'
                      }`}
                    >
                      <span className="text-sm font-medium text-[#3A3A3A]">{opt.label}</span>
                      <p className="text-xs text-[#8A8585] mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount Value */}
              <div className="bg-white rounded-xl border border-[#E8E2D8] p-5">
                <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                  {discountType === 'percentage'
                    ? '折扣百分比'
                    : discountType === 'fixed'
                    ? '折扣金額（NT$）'
                    : '優惠內容'}
                </label>
                <input
                  type="text"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={
                    discountType === 'percentage'
                      ? '10'
                      : discountType === 'fixed'
                      ? '50'
                      : '免費贈送小菜一份'
                  }
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E2D8] bg-white text-[#3A3A3A] text-sm focus:outline-none focus:border-[#C5A55A] focus:ring-2 focus:ring-[#C5A55A]/20 placeholder:text-[#8A8585]/60"
                />
                {discountType === 'percentage' && (
                  <p className="text-xs text-[#8A8585] mt-1.5">輸入折扣百分比，例如 10 代表打9折</p>
                )}
              </div>

              {/* Expiry Days */}
              <div className="bg-white rounded-xl border border-[#E8E2D8] p-5">
                <label className="block text-sm font-medium text-[#3A3A3A] mb-2">折扣碼有效天數</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={discountExpiryDays}
                    onChange={(e) => setDiscountExpiryDays(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={365}
                    className="w-24 px-4 py-3 rounded-xl border border-[#E8E2D8] bg-white text-[#3A3A3A] text-sm focus:outline-none focus:border-[#C5A55A] focus:ring-2 focus:ring-[#C5A55A]/20"
                  />
                  <span className="text-sm text-[#8A8585]">天</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Preview */}
      {step === 4 && (
        <div>
          <h2 className="text-lg font-bold text-[#3A3A3A] font-serif mb-2">預覽確認</h2>
          <p className="text-sm text-[#8A8585] mb-6">確認設定無誤後發布問卷</p>

          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
              <h3 className="font-bold text-lg text-[#3A3A3A] mb-4">{title}</h3>

              <div className="space-y-3">
                {/* Template */}
                <div className="flex items-center justify-between py-2 border-b border-[#E8E2D8]">
                  <span className="text-sm text-[#8A8585]">視覺模板</span>
                  <span className="text-sm text-[#3A3A3A] font-medium flex items-center gap-2">
                    {selectedTemplate && (
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: templateList.find(t => t.id === selectedTemplate)?.colors.primary,
                        }}
                      />
                    )}
                    {templateList.find(t => t.id === selectedTemplate)?.name}
                  </span>
                </div>

                {/* Questions */}
                <div className="flex items-center justify-between py-2 border-b border-[#E8E2D8]">
                  <span className="text-sm text-[#8A8585]">問題數量</span>
                  <span className="text-sm text-[#3A3A3A] font-medium">{getQuestions().length} 題</span>
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between py-2 border-b border-[#E8E2D8]">
                  <span className="text-sm text-[#8A8585]">折扣獎勵</span>
                  <span className="text-sm text-[#3A3A3A] font-medium">
                    {discountEnabled ? (
                      <>
                        {discountType === 'percentage' && `${discountValue}% 折扣`}
                        {discountType === 'fixed' && `NT$${discountValue} 折扣`}
                        {discountType === 'freebie' && discountValue}
                        {discountType === 'custom_text' && discountValue}
                        <span className="text-xs text-[#8A8585] ml-2">（{discountExpiryDays} 天有效）</span>
                      </>
                    ) : (
                      '未啟用'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Questions Preview */}
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
              <h4 className="font-bold text-sm text-[#3A3A3A] mb-3">問題清單</h4>
              <div className="space-y-2">
                {getQuestions().map((q, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <span className="w-5 h-5 rounded bg-[#C5A55A]/10 text-[#A08735] text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-[#3A3A3A] flex-1">{q.label}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-[#FAF7F2] text-[#8A8585] rounded-full">{q.type}</span>
                    {q.required && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded-full">必填</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#E8E2D8]">
        <button
          onClick={() => {
            if (step === 1) {
              router.push('/dashboard/surveys');
            } else {
              setStep((step - 1) as Step);
            }
          }}
          className="px-5 py-2.5 border border-[#E8E2D8] rounded-xl text-sm text-[#8A8585] hover:border-[#C5A55A] hover:text-[#A08735] transition-colors"
        >
          {step === 1 ? '取消' : '上一步'}
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep((step + 1) as Step)}
            disabled={!canProceed()}
            className="px-6 py-2.5 bg-[#C5A55A] text-white text-sm font-medium rounded-xl hover:bg-[#A08735] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            下一步
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-[#C5A55A] text-white text-sm font-medium rounded-xl hover:bg-[#A08735] transition-colors disabled:opacity-60"
          >
            {submitting ? '發布中...' : '發布問卷'}
          </button>
        )}
      </div>
    </div>
  );
}
