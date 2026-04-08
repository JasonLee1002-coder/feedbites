'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Check, Palette } from 'lucide-react';
import { templateList } from '@/lib/templates';
import type { Question, TemplateId } from '@/types/survey';

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

interface PrizeItem {
  label: string;
  emoji: string;
  color: string;
}

const DEFAULT_PRIZE_COLORS = [
  '#FF8C00', '#42A5F5', '#FF6B6B', '#66BB6A',
  '#EC407A', '#AB47BC', '#26A69A', '#FFB74D',
];

const EMOJI_PICKER = ['🎫', '🥤', '🔥', '🍰', '💰', '👫', '🍕', '🎁', '🍜', '☕', '🧁', '🍺', '🎂', '🥗', '🍱', '💎'];

interface EditClientProps {
  surveyId: string;
  initialTitle: string;
  initialQuestions: Question[];
  initialDiscountValue: string;
  initialDiscountEnabled: boolean;
  initialTemplateId: TemplateId | null;
  initialPrizeItems: PrizeItem[] | null;
  initialDiscountExpiryDays: number;
  initialPrizeSameDayValid: boolean;
}

export default function EditClient({
  surveyId,
  initialTitle,
  initialQuestions,
  initialDiscountValue,
  initialDiscountEnabled,
  initialTemplateId,
  initialPrizeItems,
  initialDiscountExpiryDays,
  initialPrizeSameDayValid,
}: EditClientProps) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [discountValue, setDiscountValue] = useState(initialDiscountValue);
  const [discountEnabled, setDiscountEnabled] = useState(initialDiscountEnabled);
  const [discountExpiryDays, setDiscountExpiryDays] = useState(initialDiscountExpiryDays);
  const [prizeSameDayValid, setPrizeSameDayValid] = useState(initialPrizeSameDayValid);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(initialTemplateId);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [prizeItems, setPrizeItems] = useState<PrizeItem[]>(initialPrizeItems || []);
  const [showPrizeEditor, setShowPrizeEditor] = useState(false);

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
          template_id: selectedTemplate,
          questions: questions.filter(q => q.type === 'section-header' || q.label?.trim()),
          discount_value: discountValue,
          discount_enabled: discountEnabled,
          discount_expiry_days: discountExpiryDays,
          prize_same_day_valid: prizeSameDayValid,
          prize_items: prizeItems.length > 0 ? prizeItems : null,
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

      {/* Template picker */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#C5A55A]" />
            <span className="text-sm font-medium text-[#3A3A3A]">問卷風格模板</span>
            {selectedTemplate && (
              <span className="text-xs text-[#8A8585]">
                — {templateList.find(t => t.id === selectedTemplate)?.name || selectedTemplate}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowTemplatePicker(!showTemplatePicker)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#C5A55A]/10 text-[#C5A55A] hover:bg-[#C5A55A]/20 transition-colors"
          >
            {showTemplatePicker ? '收起' : '更換模板'}
          </button>
        </div>
        {showTemplatePicker && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {templateList.map((tmpl) => {
              const isSelected = selectedTemplate === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => { setSelectedTemplate(tmpl.id); setShowTemplatePicker(false); }}
                  className={`text-left rounded-xl border-2 p-3 transition-all ${
                    isSelected ? 'border-[#C5A55A] shadow-md' : 'border-[#E8E2D8] hover:border-[#C5A55A]/50'
                  }`}
                  style={{ backgroundColor: tmpl.colors.background }}
                >
                  <div className="flex gap-1 mb-2">
                    {[tmpl.colors.primary, tmpl.colors.primaryLight, tmpl.colors.accent].map((color, i) => (
                      <div key={i} className="w-5 h-5 rounded-full" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <h3 className="font-bold text-xs mb-0.5" style={{ color: tmpl.colors.text }}>
                    {tmpl.name}
                  </h3>
                  <p className="text-[10px]" style={{ color: tmpl.colors.textLight }}>
                    {tmpl.suited}
                  </p>
                  {isSelected && (
                    <div className="mt-2 text-[10px] font-medium text-[#C5A55A] flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      目前使用
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
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

      {/* Coupon expiry + activation settings */}
      {discountEnabled && (
        <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5 mb-4 space-y-4">
          {/* Expiry days */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-[#3A3A3A]">🗓️ 優惠券時效</span>
              <p className="text-xs text-[#8A8585] mt-0.5">客人轉盤後，優惠券的有效期限</p>
            </div>
            <select
              value={discountExpiryDays}
              onChange={e => setDiscountExpiryDays(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] bg-[#FAF7F2] text-[#3A3A3A] cursor-pointer"
            >
              <option value={30}>1 個月（30天）</option>
              <option value={60}>2 個月（60天）</option>
              <option value={90}>3 個月（90天）</option>
              <option value={180}>6 個月（180天）</option>
              <option value={365}>1 年（365天）</option>
            </select>
          </div>

          {/* Same-day activation toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-[#F0EBE3]">
            <div>
              <span className="text-sm font-medium text-[#3A3A3A]">⚡ QR碼當天生效</span>
              <p className="text-xs text-[#8A8585] mt-0.5">
                {prizeSameDayValid
                  ? '客人轉盤當天即可使用優惠'
                  : '優惠碼次日起才能使用（防止同日重複消費）'}
              </p>
            </div>
            <button
              onClick={() => setPrizeSameDayValid(!prizeSameDayValid)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                prizeSameDayValid ? 'bg-emerald-400' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  prizeSameDayValid ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Prize wheel editor */}
      {discountEnabled && (
        <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🎰</span>
              <span className="text-sm font-medium text-[#3A3A3A]">輪盤獎品設定</span>
              <span className="text-xs text-[#8A8585]">
                {prizeItems.length > 0 ? `${prizeItems.length} 個獎品` : '使用預設獎品'}
              </span>
            </div>
            <button
              onClick={() => setShowPrizeEditor(!showPrizeEditor)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#C5A55A]/10 text-[#C5A55A] hover:bg-[#C5A55A]/20 transition-colors"
            >
              {showPrizeEditor ? '收起' : '自訂獎品'}
            </button>
          </div>

          {showPrizeEditor && (
            <div className="mt-4 space-y-3">
              <p className="text-[10px] text-[#8A8585]">
                自訂輪盤上顯示的獎品（建議 3-8 個）。留空則使用系統預設獎品。
              </p>

              {prizeItems.map((prize, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D8]">
                  {/* Emoji picker */}
                  <div className="relative group">
                    <button
                      className="w-10 h-10 rounded-lg bg-white border border-[#E8E2D8] text-xl flex items-center justify-center hover:border-[#C5A55A] transition-colors"
                      title="選擇表情"
                    >
                      {prize.emoji}
                    </button>
                    <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-[#E8E2D8] p-2 hidden group-hover:grid grid-cols-4 gap-1 z-10 min-w-[140px]">
                      {EMOJI_PICKER.map(em => (
                        <button
                          key={em}
                          onClick={() => {
                            const updated = [...prizeItems];
                            updated[i] = { ...updated[i], emoji: em };
                            setPrizeItems(updated);
                          }}
                          className="w-8 h-8 rounded-lg hover:bg-[#FAF7F2] text-lg flex items-center justify-center"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Label */}
                  <input
                    type="text"
                    value={prize.label}
                    onChange={e => {
                      const updated = [...prizeItems];
                      updated[i] = { ...updated[i], label: e.target.value };
                      setPrizeItems(updated);
                    }}
                    placeholder="獎品名稱（如：9折優惠）"
                    className="flex-1 px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] bg-white text-[#3A3A3A]"
                  />

                  {/* Color */}
                  <input
                    type="color"
                    value={prize.color}
                    onChange={e => {
                      const updated = [...prizeItems];
                      updated[i] = { ...updated[i], color: e.target.value };
                      setPrizeItems(updated);
                    }}
                    className="w-8 h-8 rounded-lg border border-[#E8E2D8] cursor-pointer"
                    title="獎品顏色"
                  />

                  {/* Delete */}
                  <button
                    onClick={() => setPrizeItems(ps => ps.filter((_, j) => j !== i))}
                    className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {prizeItems.length < 8 && (
                <button
                  onClick={() => setPrizeItems(ps => [
                    ...ps,
                    {
                      label: '',
                      emoji: EMOJI_PICKER[ps.length % EMOJI_PICKER.length],
                      color: DEFAULT_PRIZE_COLORS[ps.length % DEFAULT_PRIZE_COLORS.length],
                    },
                  ])}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#E8E2D8] text-xs text-[#8A8585] hover:border-[#C5A55A] hover:text-[#C5A55A] transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新增獎品（{prizeItems.length}/8）
                </button>
              )}

              {prizeItems.length > 0 && (
                <button
                  onClick={() => setPrizeItems([])}
                  className="text-[10px] text-[#8A8585] hover:text-red-500 transition-colors"
                >
                  清除全部（恢復預設獎品）
                </button>
              )}
            </div>
          )}
        </div>
      )}

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
