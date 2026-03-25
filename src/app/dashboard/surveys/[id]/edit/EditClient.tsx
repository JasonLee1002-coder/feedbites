'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Check } from 'lucide-react';
import type { Question } from '@/types/survey';

const TYPE_OPTIONS: { value: Question['type']; label: string }[] = [
  { value: 'emoji-rating', label: '表情評分' },
  { value: 'rating', label: '星級評分' },
  { value: 'radio', label: '單選' },
  { value: 'checkbox', label: '多選' },
  { value: 'text', label: '簡答' },
  { value: 'textarea', label: '長文回饋' },
  { value: 'number', label: '數字' },
  { value: 'radio-with-reason', label: '單選+原因' },
  { value: 'section-header', label: '分隔標題' },
];

interface EditClientProps {
  surveyId: string;
  initialTitle: string;
  initialQuestions: Question[];
  initialDiscountValue: string;
  initialDiscountEnabled: boolean;
}

export default function EditClient({
  surveyId,
  initialTitle,
  initialQuestions,
  initialDiscountValue,
  initialDiscountEnabled,
}: EditClientProps) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [discountValue, setDiscountValue] = useState(initialDiscountValue);
  const [discountEnabled, setDiscountEnabled] = useState(initialDiscountEnabled);

  function updateQuestion(index: number, updates: Partial<Question>) {
    setQuestions(qs => qs.map((q, i) => i === index ? { ...q, ...updates } : q));
  }

  function removeQuestion(index: number) {
    setQuestions(qs => qs.filter((_, i) => i !== index));
  }

  function addQuestion() {
    const id = `custom_${Date.now()}`;
    setQuestions(qs => [...qs, { id, type: 'emoji-rating', label: '', required: true, min: 1, max: 5 }]);
  }

  function moveQuestion(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions(qs => {
      const next = [...qs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          questions: questions.filter(q => q.type === 'section-header' || q.label?.trim()),
          discount_value: discountValue,
          discount_enabled: discountEnabled,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/surveys/${surveyId}`} className="text-[#8A8585] hover:text-[#3A3A3A]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-[#3A3A3A] font-serif">快速編輯問卷</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white transition-all ${
            saved ? 'bg-emerald-500' : 'bg-[#C5A55A] hover:bg-[#A08735]'
          } disabled:opacity-50`}
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />儲存中</>
            : saved ? <><Check className="w-4 h-4" />已儲存</>
            : <><Save className="w-4 h-4" />儲存變更</>}
        </button>
      </div>

      {/* Title */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5 mb-4">
        <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">問卷標題</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-[#E8E2D8] text-base font-bold outline-none focus:border-[#C5A55A] bg-[#FAF7F2] font-serif text-[#3A3A3A]"
        />
      </div>

      {/* Discount quick toggle */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5 mb-4 flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-[#3A3A3A]">折扣獎勵</span>
          <span className="text-xs text-[#8A8585] ml-2">{discountEnabled ? discountValue : '已關閉'}</span>
        </div>
        <div className="flex items-center gap-3">
          {discountEnabled && (
            <input
              type="text"
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              placeholder="例如：9折"
              className="w-24 px-3 py-1.5 rounded-lg border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] bg-[#FAF7F2]"
            />
          )}
          <button
            onClick={() => setDiscountEnabled(!discountEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              discountEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {discountEnabled ? '啟用中' : '已關閉'}
          </button>
        </div>
      </div>

      {/* Questions list */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#3A3A3A]">問題清單（{questions.filter(q => q.type !== 'section-header').length} 題）</h2>
          <button
            onClick={addQuestion}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A55A] text-white text-xs font-medium rounded-lg hover:bg-[#A08735]"
          >
            <Plus className="w-3.5 h-3.5" />
            新增問題
          </button>
        </div>

        <div className="space-y-2">
          {questions.map((q, i) => (
            <div
              key={q.id || i}
              className={`flex items-start gap-2 p-3 rounded-xl border transition-all ${
                q.type === 'section-header'
                  ? 'bg-[#C5A55A]/5 border-[#C5A55A]/20'
                  : 'bg-[#FAF7F2] border-[#E8E2D8]'
              }`}
            >
              {/* Drag handle + order */}
              <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                <button onClick={() => moveQuestion(i, -1)} className="text-[#8A8585] hover:text-[#3A3A3A] text-[10px]">▲</button>
                <span className="text-[10px] text-[#8A8585]">{i + 1}</span>
                <button onClick={() => moveQuestion(i, 1)} className="text-[#8A8585] hover:text-[#3A3A3A] text-[10px]">▼</button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Label */}
                <input
                  type="text"
                  value={q.type === 'section-header' ? (q.title || q.label || '') : (q.label || '')}
                  onChange={e => {
                    if (q.type === 'section-header') {
                      updateQuestion(i, { title: e.target.value, label: e.target.value });
                    } else {
                      updateQuestion(i, { label: e.target.value });
                    }
                  }}
                  placeholder={q.type === 'section-header' ? '分隔標題' : '問題內容'}
                  className="w-full px-3 py-1.5 rounded-lg border border-transparent text-sm outline-none focus:border-[#C5A55A] bg-transparent font-medium text-[#3A3A3A]"
                />

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Type selector */}
                  <select
                    value={q.type}
                    onChange={e => updateQuestion(i, { type: e.target.value as Question['type'] })}
                    className="px-2 py-1 rounded-lg border border-[#E8E2D8] text-[10px] outline-none bg-white text-[#8A8585]"
                  >
                    {TYPE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>

                  {/* Required toggle */}
                  {q.type !== 'section-header' && (
                    <button
                      onClick={() => updateQuestion(i, { required: !q.required })}
                      className={`px-2 py-0.5 rounded text-[10px] ${q.required ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {q.required ? '必填' : '選填'}
                    </button>
                  )}

                  {/* Options editor for radio/checkbox */}
                  {(q.type === 'radio' || q.type === 'checkbox' || q.type === 'radio-with-reason') && (
                    <input
                      type="text"
                      value={(q.options || []).join('、')}
                      onChange={e => updateQuestion(i, { options: e.target.value.split('、').map(s => s.trim()).filter(Boolean) })}
                      placeholder="選項（用「、」分隔）"
                      className="flex-1 px-2 py-1 rounded-lg border border-[#E8E2D8] text-[10px] outline-none focus:border-[#C5A55A] bg-white min-w-[150px]"
                    />
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => removeQuestion(i)}
                className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {questions.length === 0 && (
          <p className="text-sm text-[#8A8585] text-center py-8">沒有問題，點「新增問題」開始</p>
        )}
      </div>

      {/* Bottom save */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/surveys/${surveyId}`}
          className="text-sm text-[#8A8585] hover:text-[#3A3A3A]"
        >
          ← 返回問卷詳情
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl text-white transition-all ${
            saved ? 'bg-emerald-500' : 'bg-[#C5A55A] hover:bg-[#A08735]'
          } disabled:opacity-50`}
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />儲存中</>
            : saved ? <><Check className="w-4 h-4" />已儲存</>
            : <><Save className="w-4 h-4" />儲存變更</>}
        </button>
      </div>
    </div>
  );
}
