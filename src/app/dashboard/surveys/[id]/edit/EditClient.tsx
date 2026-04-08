'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Check, Palette, Sparkles, X } from 'lucide-react';
import { templateList } from '@/lib/templates';
import type { Question, TemplateId, ThemeColors } from '@/types/survey';
import { TEXTURE_DEFS, getTextureStyle } from '@/lib/textures';

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

// Extended swatch palette for the color picker
const SWATCH_COLORS = [
  '#FF5F00', '#FF8C00', '#FFB74D', '#FFD700',
  '#66BB6A', '#26A69A', '#42A5F5', '#5C6BC0',
  '#AB47BC', '#EC407A', '#EF5350', '#8D6E63',
  '#78909C', '#C5A55A', '#FF6B6B', '#00BCD4',
];

const EMOJI_PICKER = ['🎫', '🥤', '🔥', '🍰', '💰', '👫', '🍕', '🎁', '🍜', '☕', '🧁', '🍺', '🎂', '🥗', '🍱', '💎'];

// 智慧關鍵字 → 建議選項
const QUESTION_PRESETS: Record<string, string[]> = {
  '性別': ['男', '女', '不公開'],
  '18歲': ['是', '否'],
  '已滿': ['是', '否'],
  '是否': ['是', '否'],
  '會不會': ['會', '不會'],
  '有沒有': ['有', '沒有'],
  '造訪頻率': ['第一次來', '偶爾', '常客', '每週都來'],
  '來店頻率': ['第一次來', '偶爾', '常客', '每週都來'],
  '用餐人數': ['1人', '2人', '3-4人', '5人以上'],
  '幾人': ['1人', '2人', '3-4人', '5人以上'],
  '消費金額': ['300元以下', '300-600元', '600-1000元', '1000元以上'],
  '得知': ['朋友推薦', 'Google搜尋', 'Instagram', '路過看到'],
  '如何認識': ['朋友推薦', 'Google搜尋', 'Instagram', '路過看到'],
  '訂位方式': ['電話', '網路預約', '現場候位', 'LINE'],
  '預約': ['電話', '網路預約', '現場候位', 'LINE'],
  '年齡': ['18歲以下', '18-25歲', '26-35歲', '36-45歲', '46歲以上'],
  '職業': ['學生', '上班族', '自由業', '家庭主婦/夫', '退休'],
  '交通': ['步行', '自行車', '機車', '開車', '大眾運輸'],
  '用餐方式': ['內用', '外帶', '外送'],
  '滿意度': ['非常滿意', '滿意', '普通', '不滿意'],
};

function findPreset(label: string): string[] | null {
  for (const [key, opts] of Object.entries(QUESTION_PRESETS)) {
    if (label.includes(key)) return opts;
  }
  return null;
}

// AI template prompt presets — 幫店長快速組出高質感描述
const AI_TEMPLATE_PRESETS = [
  // 底色風格
  { label: '🖤 深色底', value: '深色背景、沉穩' },
  { label: '🤍 淺色底', value: '淺色背景、乾淨清爽' },
  { label: '🪵 木紋質感', value: '木質紋理、溫潤自然' },
  { label: '🪨 大理石感', value: '大理石紋理、冷調奢華' },
  // 色彩氛圍
  { label: '✨ 奢華金', value: '金色調、奢華質感、高端' },
  { label: '🔴 中式紅', value: '深紅配金、中式傳統、大氣' },
  { label: '🌿 清新綠', value: '草綠、自然清新、健康' },
  { label: '💜 神秘紫', value: '深紫、神秘高貴' },
  { label: '🔵 海洋藍', value: '深藍海洋感、清涼' },
  { label: '🌸 柔和粉', value: '粉色系、甜點感、夢幻' },
  // 邊框風格
  { label: '📐 粗邊框', value: '邊框加粗、強烈對比' },
  { label: '💡 霓虹感', value: '霓虹色、夜店感、發光邊框' },
];

// 範例描述 — 給店長靈感
const AI_TEMPLATE_EXAMPLES = [
  '黑底紅邊框金字，霸氣中式風',
  '深木紋底、粗金框、奶白文字，日式禪風',
  '深海軍藍底、銀白邊框、冰藍點綴，高端海鮮館',
  '奶油白底、玫瑰金邊框、粉棕文字，法式甜點店',
  '炭黑底、霓虹橘邊框、電光白字，現代燒烤居酒屋',
];

interface EditClientProps {
  surveyId: string;
  storeId: string;
  initialTitle: string;
  initialQuestions: Question[];
  initialDiscountValue: string;
  initialDiscountEnabled: boolean;
  initialTemplateId: TemplateId | null;
  initialPrizeItems: PrizeItem[] | null;
  initialDiscountExpiryDays: number;
  initialPrizeSameDayValid: boolean;
  initialCustomColors?: ThemeColors | null;
}

export default function EditClient({
  surveyId,
  storeId,
  initialTitle,
  initialQuestions,
  initialDiscountValue,
  initialDiscountEnabled,
  initialTemplateId,
  initialPrizeItems,
  initialDiscountExpiryDays,
  initialPrizeSameDayValid,
  initialCustomColors,
}: EditClientProps) {
  const router = useRouter();

  const HIDDEN_TMPL_KEY = `fb_hidden_tmpl_${storeId}`;
  const AI_TMPL_KEY = `fb_ai_tmpl_${surveyId}`;

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [discountValue, setDiscountValue] = useState(initialDiscountValue);
  const [discountEnabled, setDiscountEnabled] = useState(initialDiscountEnabled);
  const [discountExpiryDays, setDiscountExpiryDays] = useState(initialDiscountExpiryDays);
  const [prizeSameDayValid, setPrizeSameDayValid] = useState(initialPrizeSameDayValid);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(initialTemplateId);
  const [customColors, setCustomColors] = useState<ThemeColors | null>(initialCustomColors || null);
  const [hiddenTemplates, setHiddenTemplates] = useState<string[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [prizeItems, setPrizeItems] = useState<PrizeItem[]>(initialPrizeItems || []);
  const [showPrizeEditor, setShowPrizeEditor] = useState(false);
  const [openSwatchIdx, setOpenSwatchIdx] = useState<number | null>(null);
  const [optionInputs, setOptionInputs] = useState<Record<string, string>>({});

  // Template picker hover preview
  const [hoveredTemplateId, setHoveredTemplateId] = useState<TemplateId | null>(null);

  // AI template modal state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiSelectedPresets, setAiSelectedPresets] = useState<string[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiVariants, setAiVariants] = useState<(ThemeColors & { name: string; vibe: string })[]>([]);
  const [hoveredAiVariantIdx, setHoveredAiVariantIdx] = useState<number | null>(null);
  const [aiAppliedName, setAiAppliedName] = useState<string | null>(null);
  // Saved AI templates (persisted per survey)
  const [savedAiTemplates, setSavedAiTemplates] = useState<(ThemeColors & { name: string; vibe: string })[]>([]);
  const [selectedAiTemplateName, setSelectedAiTemplateName] = useState<string | null>(null);

  // Load hidden templates from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_TMPL_KEY);
      if (stored) setHiddenTemplates(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [HIDDEN_TMPL_KEY]);

  // Load saved AI templates from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AI_TMPL_KEY);
      if (stored) setSavedAiTemplates(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [AI_TMPL_KEY]);

  function hideTemplate(id: string) {
    const next = [...hiddenTemplates, id];
    setHiddenTemplates(next);
    localStorage.setItem(HIDDEN_TMPL_KEY, JSON.stringify(next));
    // If we're deleting the currently selected template, clear selection
    if (selectedTemplate === id) setSelectedTemplate(null);
  }

  function restoreAllTemplates() {
    setHiddenTemplates([]);
    localStorage.removeItem(HIDDEN_TMPL_KEY);
  }

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

  function togglePreset(val: string) {
    setAiSelectedPresets(prev =>
      prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]
    );
  }

  async function handleGenerateTemplate() {
    const combined = [aiDescription.trim(), ...aiSelectedPresets].filter(Boolean).join('、');
    if (!combined) { setAiError('請先描述您想要的風格'); return; }
    setAiGenerating(true);
    setAiError('');
    setAiVariants([]);
    try {
      const res = await fetch('/api/ai/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: combined }),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error || '產生失敗，請重試'); return; }
      setAiVariants(data.variants || []);
    } catch {
      setAiError('網路錯誤，請稍後再試');
    } finally {
      setAiGenerating(false);
    }
  }

  function handleSelectVariant(variant: ThemeColors & { name: string; vibe: string }) {
    const { name: _n, vibe: _v, ...colors } = variant;
    setCustomColors(colors as ThemeColors);
    setSelectedTemplate(null);
    setSelectedAiTemplateName(variant.name);
    setShowAiModal(false);
    setAiVariants([]);
    setAiDescription('');
    setAiSelectedPresets([]);
    setHoveredAiVariantIdx(null);
    setAiAppliedName(variant.name);
    setTimeout(() => setAiAppliedName(null), 3000);
    // Save AI template to localStorage list
    const newList = [variant, ...savedAiTemplates.filter(t => t.name !== variant.name)];
    setSavedAiTemplates(newList);
    localStorage.setItem(AI_TMPL_KEY, JSON.stringify(newList));
  }

  function deleteAiTemplate(name: string) {
    const newList = savedAiTemplates.filter(t => t.name !== name);
    setSavedAiTemplates(newList);
    localStorage.setItem(AI_TMPL_KEY, JSON.stringify(newList));
    if (selectedAiTemplateName === name) {
      setSelectedAiTemplateName(null);
      setCustomColors(null);
      setSelectedTemplate(null);
    }
  }

  function selectSavedAiTemplate(tmpl: ThemeColors & { name: string; vibe: string }) {
    const { name: _n, vibe: _v, ...colors } = tmpl;
    setCustomColors(colors as ThemeColors);
    setSelectedTemplate(null);
    setSelectedAiTemplateName(tmpl.name);
    setShowTemplatePicker(false);
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
          custom_colors: customColors,
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
          <Link href={`/dashboard/surveys/${surveyId}`} className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#F0EBE3] hover:bg-[#E0D5C5] active:scale-95 transition-all text-[#3A3A3A] shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-[#3A3A3A] font-serif">快速編輯問卷</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl text-white transition-all active:scale-[0.96] shadow-md hover:shadow-lg hover:-translate-y-0.5 ${
            saved ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#C5A55A] hover:bg-[#A08735]'
          } disabled:opacity-50 disabled:hover:translate-y-0`}
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
            {customColors ? (
              <span className="text-xs text-purple-500">— ✨ AI 自訂配色</span>
            ) : selectedTemplate ? (
              <span className="text-xs text-[#8A8585]">
                — {templateList.find(t => t.id === selectedTemplate)?.name || selectedTemplate}
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            {customColors && (
              <button
                onClick={() => setCustomColors(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all shadow-sm flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />刪除自訂
              </button>
            )}
            <button
              onClick={() => setShowTemplatePicker(!showTemplatePicker)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C5A55A] text-white hover:bg-[#A08735] active:scale-95 transition-all shadow-sm hover:shadow-md"
            >
              {showTemplatePicker ? '收起 ↑' : '🎨 更換模板'}
            </button>
          </div>
        </div>
        {showTemplatePicker && (
          <div className="mt-4">
            {/* ── Live preview at top ── */}
            {(() => {
              const pid = hoveredTemplateId || selectedTemplate;
              const { templateList: tl, ..._ } = { templateList } as { templateList: typeof templateList };
              void _;
              const prev = templateList.find(t => t.id === pid) || templateList[0];
              return (
                <div className="mb-4 rounded-2xl overflow-hidden border border-[#E8E2D8] shadow-md">
                  {/* Mini header */}
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ background: prev.colors.primary }}>
                    <span className="text-white text-xs font-bold tracking-wide">{prev.name} · {prev.nameEn}</span>
                    <span className="text-white/80 text-[10px]">{prev.description}</span>
                  </div>
                  {/* Mini survey body */}
                  <div className="p-4" style={{ background: prev.colors.background, ...getTextureStyle(prev.colors.texture) }}>
                    {/* Fake question card */}
                    <div className="rounded-xl p-3 mb-3" style={{ background: prev.colors.surface, border: `1.5px solid ${prev.colors.border}` }}>
                      <p className="text-[11px] font-bold mb-2.5" style={{ color: prev.colors.text }}>⭐ 請評分您的用餐體驗</p>
                      <div className="flex gap-1.5">
                        {['😫','😕','😐','😊','🤩'].map((e, i) => (
                          <div key={i} className="flex-1 text-center text-base py-1.5 rounded-lg transition-all"
                            style={{ background: i === 3 ? prev.colors.primary + '28' : prev.colors.background, border: i === 3 ? `1.5px solid ${prev.colors.primary}` : `1.5px solid ${prev.colors.border}` }}>
                            {e}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Fake CTA button */}
                    <div className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-white shadow-sm"
                      style={{ background: prev.colors.primary }}>
                      提交問卷 →
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* ── Section: 預設模板 ── */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-[#5A5050]">🎨 預設模板</span>
              <div className="flex-1 h-px bg-[#E8E2D8]" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {templateList.filter(t => !hiddenTemplates.includes(t.id)).map((tmpl) => {
                const isSelected = !customColors && selectedTemplate === tmpl.id;
                return (
                  <div key={tmpl.id} className="relative group"
                    onMouseEnter={() => setHoveredTemplateId(tmpl.id as TemplateId)}
                    onMouseLeave={() => setHoveredTemplateId(null)}
                  >
                    <button
                      onClick={() => { setSelectedTemplate(tmpl.id as TemplateId); setCustomColors(null); setSelectedAiTemplateName(null); setShowTemplatePicker(false); }}
                      className={`w-full text-left rounded-xl border-2 p-3 transition-all ${
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
                    {/* Delete button — appears on hover */}
                    <button
                      onClick={(e) => { e.stopPropagation(); hideTemplate(tmpl.id); }}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm"
                      title="從列表中移除此模板"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

            </div>

            {/* ── Section: AI 生成模板 ── */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> AI 生成模板
              </span>
              <div className="flex-1 h-px bg-purple-100" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {/* Generate new AI template button */}
              <button
                onClick={() => { setShowAiModal(true); setShowTemplatePicker(false); }}
                className="text-left rounded-xl border-2 border-dashed border-purple-300 hover:border-purple-400 active:scale-[0.97] p-3 transition-all bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-md"
              >
                <div className="flex gap-1 mb-2">
                  <div className="w-5 h-5 rounded-full bg-purple-400" />
                  <div className="w-5 h-5 rounded-full bg-pink-400" />
                  <div className="w-5 h-5 rounded-full bg-yellow-400" />
                </div>
                <h3 className="font-bold text-xs mb-0.5 text-purple-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> 生成新 AI 模板
                </h3>
                <p className="text-[10px] text-purple-400">描述風格，AI 幫你客製</p>
              </button>

              {/* Saved AI template cards */}
              {savedAiTemplates.map((tmpl) => {
                const isSelected = selectedAiTemplateName === tmpl.name;
                return (
                  <div key={tmpl.name} className="relative group">
                    <button
                      onClick={() => selectSavedAiTemplate(tmpl)}
                      className="w-full text-left rounded-xl border-2 p-3 transition-all overflow-hidden active:scale-[0.97]"
                      style={{
                        backgroundColor: tmpl.background,
                        ...getTextureStyle(tmpl.texture),
                        borderColor: isSelected ? tmpl.primary : 'transparent',
                        boxShadow: isSelected ? `0 0 0 1px ${tmpl.primary}40, 0 2px 12px ${tmpl.primary}25` : '0 1px 3px rgba(0,0,0,0.07)',
                      }}
                    >
                      {/* Color strip */}
                      <div className="h-1.5 w-full flex rounded-full overflow-hidden mb-2">
                        {[tmpl.primary, tmpl.accent, tmpl.primaryLight].map((c, ci) => (
                          <div key={ci} className="flex-1" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="flex gap-1 mb-1.5">
                        {[tmpl.primary, tmpl.accent, tmpl.border].map((c, ci) => (
                          <div key={ci} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                        ))}
                        <span className="text-[9px] ml-1 px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: tmpl.primary + '22', color: tmpl.primary }}>AI</span>
                      </div>
                      <p className="text-[11px] font-bold truncate" style={{ color: tmpl.text }}>{tmpl.name}</p>
                      <p className="text-[9px] truncate" style={{ color: tmpl.textLight }}>{tmpl.vibe}</p>
                      {isSelected && (
                        <div className="mt-1.5 text-[10px] font-medium flex items-center gap-1" style={{ color: tmpl.primary }}>
                          <Check className="w-3 h-3" /> 目前使用
                        </div>
                      )}
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteAiTemplate(tmpl.name); }}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm"
                      title="刪除此 AI 模板"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Restore factory templates */}
            {hiddenTemplates.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#F0EBE3] flex items-center justify-between">
                <span className="text-xs text-[#8A8585]">已隱藏 {hiddenTemplates.length} 個模板</span>
                <button
                  onClick={restoreAllTemplates}
                  className="text-xs text-[#C5A55A] hover:text-[#A08735] font-medium underline underline-offset-2"
                >
                  恢復出廠模板設定
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI applied success toast */}
      {aiAppliedName && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-5 py-3 bg-[#1a1a2e] text-white rounded-2xl shadow-2xl animate-bounce-in text-sm font-semibold">
          <span className="text-emerald-400 text-base">✅</span>
          <span>「{aiAppliedName}」已套用！記得儲存變更</span>
        </div>
      )}

      {/* AI Template Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 my-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#3A3A3A] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" /> AI 模板生成器
              </h2>
              <button onClick={() => { setShowAiModal(false); setAiVariants([]); }} className="text-[#8A8585] hover:text-[#3A3A3A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input phase */}
            {aiVariants.length === 0 && (
              <>
                <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">描述你想要的風格</label>
                <textarea
                  value={aiDescription}
                  onChange={e => setAiDescription(e.target.value)}
                  placeholder="例如：黑底紅邊框金字、木紋底金框黑字、奶油白底玫瑰金邊框..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-purple-400 bg-[#FAF7F2] resize-none mb-2"
                />

                {/* Example prompts */}
                <p className="text-[10px] text-[#8A8585] mb-1">💡 點擊範例快速套入：</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {AI_TEMPLATE_EXAMPLES.map(ex => (
                    <button
                      key={ex}
                      onClick={() => setAiDescription(ex)}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>

                <p className="text-xs font-medium text-[#3A3A3A] mb-2">或快速勾選風格（可多選）</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {AI_TEMPLATE_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => togglePreset(p.value)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        aiSelectedPresets.includes(p.value)
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-purple-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {aiError && <p className="text-xs text-red-500 mb-3">{aiError}</p>}

                <button
                  onClick={handleGenerateTemplate}
                  disabled={aiGenerating}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                >
                  {aiGenerating
                    ? <><Loader2 className="w-4 h-4 animate-spin" />AI 生成 3 套方案中...</>
                    : <><Sparkles className="w-4 h-4" />生成 3 套配色方案</>}
                </button>
              </>
            )}

            {/* Result phase — 3 variant cards */}
            {aiVariants.length > 0 && (
              <>
                {/* Live preview — updates on hover */}
                {(() => {
                  const idx = hoveredAiVariantIdx ?? 0;
                  const prev = aiVariants[idx];
                  return (
                    <div className="mb-4 rounded-2xl overflow-hidden border border-purple-200 shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between px-4 py-2" style={{ background: prev.primary }}>
                        <span className="text-white text-xs font-bold">{prev.name}</span>
                        <span className="text-white/80 text-[10px]">{prev.vibe}</span>
                      </div>
                      <div className="p-4" style={{ background: prev.background, ...getTextureStyle(prev.texture) }}>
                        <div className="rounded-xl p-3 mb-3" style={{ background: prev.surface, border: `1.5px solid ${prev.border}` }}>
                          <p className="text-[11px] font-bold mb-2.5" style={{ color: prev.text }}>⭐ 請評分您的用餐體驗</p>
                          <div className="flex gap-1.5">
                            {['😫','😕','😐','😊','🤩'].map((e, i) => (
                              <div key={i} className="flex-1 text-center text-base py-1.5 rounded-lg"
                                style={{ background: i === 3 ? prev.primary + '28' : prev.background, border: i === 3 ? `1.5px solid ${prev.primary}` : `1.5px solid ${prev.border}` }}>
                                {e}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-white"
                          style={{ background: prev.primary }}>
                          提交問卷 →
                        </div>
                      </div>
                      <div className="px-4 py-2 text-[10px] text-center" style={{ background: prev.surface, color: prev.textLight }}>
                        ↑ Hover 下方方案卡片即時預覽
                      </div>
                    </div>
                  );
                })()}
                <p className="text-xs text-[#8A8585] mb-3">✨ AI 生成了 {aiVariants.length} 套方案，點擊選用：</p>
                <div className="space-y-3">
                  {aiVariants.map((v, i) => {
                    const isHovered = hoveredAiVariantIdx === i;
                    return (
                    <button
                      key={i}
                      onClick={() => handleSelectVariant(v)}
                      onMouseEnter={() => setHoveredAiVariantIdx(i)}
                      onMouseLeave={() => setHoveredAiVariantIdx(null)}
                      className="w-full text-left rounded-xl overflow-hidden transition-all duration-150 cursor-pointer active:scale-[0.97]"
                      style={{
                        backgroundColor: v.background,
                        ...getTextureStyle(v.texture),
                        border: isHovered ? `2.5px solid ${v.primary}` : '2.5px solid transparent',
                        boxShadow: isHovered ? `0 4px 20px ${v.primary}40, 0 0 0 1px ${v.primary}30` : '0 1px 4px rgba(0,0,0,0.08)',
                        transform: isHovered ? 'scale(1.015)' : 'scale(1)',
                      }}
                    >
                      {/* Color strip */}
                      <div className="h-2 w-full flex">
                        {[v.primary, v.accent, v.primaryLight, v.border, v.surface].map((c, ci) => (
                          <div key={ci} className="flex-1" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="p-3 flex items-center gap-3">
                        {/* Color dots */}
                        <div className="flex gap-1 shrink-0">
                          {[v.primary, v.accent, v.border].map((c, ci) => (
                            <div key={ci} className="w-5 h-5 rounded-full border-2" style={{ backgroundColor: c, borderColor: v.surface }} />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: v.text }}>{v.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: v.primary + '25', color: v.primary }}>方案 {i + 1}</span>
                          </div>
                          <p className="text-[10px] mt-0.5" style={{ color: v.textLight }}>{v.vibe}</p>
                          {v.texture && v.texture !== 'none' && (
                            <span className="inline-flex items-center gap-0.5 mt-1 text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: v.accent + '22', color: v.accent }}>
                              {TEXTURE_DEFS[v.texture as keyof typeof TEXTURE_DEFS]?.emoji} {TEXTURE_DEFS[v.texture as keyof typeof TEXTURE_DEFS]?.name}
                            </span>
                          )}
                        </div>
                        {/* Select button — lights up on hover */}
                        <div
                          className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150"
                          style={{
                            backgroundColor: isHovered ? v.primary : v.primary + '20',
                            color: isHovered ? '#fff' : v.primary,
                            transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                          }}
                        >
                          {isHovered ? '✓ 點擊選用' : '選用'}
                        </div>
                      </div>
                    </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => { setAiVariants([]); setAiError(''); }}
                  className="mt-3 w-full py-2 rounded-xl text-xs text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  ← 重新描述
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Discount quick toggle */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-[#3A3A3A]">🎁 填問卷送優惠</span>
            <p className="text-xs text-[#8A8585] mt-0.5">客人填完問卷後，獲得一張優惠券</p>
          </div>
          <button
            onClick={() => setDiscountEnabled(!discountEnabled)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm ${
              discountEnabled
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200 hover:shadow-emerald-300 hover:shadow-md'
                : 'bg-gray-300 text-gray-600 hover:bg-gray-400 hover:text-gray-700'
            }`}
          >
            {discountEnabled ? '啟用中' : '已關閉'}
          </button>
        </div>
        {discountEnabled && (
          <div className="mt-4 pt-4 border-t border-[#F0EBE3]">
            <label className="text-xs font-medium text-[#3A3A3A] block mb-1.5">優惠內容說明</label>
            <input
              type="text"
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              placeholder="例如：9折、滿百折20、免費招待飲品一杯"
              className="w-full px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] bg-[#FAF7F2]"
            />
            <p className="text-[11px] text-[#8A8585] mt-1.5">這段文字會印在客人的優惠券上，讓客人知道享有什麼折扣</p>
          </div>
        )}
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
              className={`relative flex items-center w-16 h-8 rounded-full transition-all duration-300 active:scale-95 shadow-inner ${
                prizeSameDayValid ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
              title={prizeSameDayValid ? '點擊關閉' : '點擊開啟'}
            >
              {/* Track label */}
              <span className={`absolute text-[9px] font-bold transition-all ${prizeSameDayValid ? 'left-2 text-white' : 'right-2 text-gray-500'}`}>
                {prizeSameDayValid ? 'ON' : 'OFF'}
              </span>
              {/* Thumb */}
              <span
                className={`absolute w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                  prizeSameDayValid ? 'translate-x-9' : 'translate-x-1'
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
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">🎰</span>
                <span className="text-sm font-medium text-[#3A3A3A]">轉盤抽獎設定</span>
                <span className="text-xs text-[#8A8585]">
                  {prizeItems.length > 0 ? `${prizeItems.length} 個獎品` : '使用預設獎品'}
                </span>
              </div>
              <p className="text-[11px] text-[#8A8585] mt-0.5">轉盤只是趣味抽獎環節，客人每次都能得到上方設定的優惠券</p>
            </div>
            <button
              onClick={() => setShowPrizeEditor(!showPrizeEditor)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all shadow-sm hover:shadow-md"
            >
              {showPrizeEditor ? '收起 ↑' : '🎰 自訂獎品'}
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

                  {/* Color swatch picker */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenSwatchIdx(openSwatchIdx === i ? null : i)}
                      className="w-8 h-8 rounded-lg border-2 border-white shadow-md hover:scale-110 transition-transform"
                      style={{ background: prize.color }}
                      title="選擇顏色"
                    />
                    {openSwatchIdx === i && (
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-[#E8E2D8] p-2.5 w-[160px]">
                        <div className="grid grid-cols-4 gap-1.5 mb-2">
                          {SWATCH_COLORS.map(c => (
                            <button
                              key={c}
                              onClick={() => {
                                const updated = [...prizeItems];
                                updated[i] = { ...updated[i], color: c };
                                setPrizeItems(updated);
                                setOpenSwatchIdx(null);
                              }}
                              className="w-7 h-7 rounded-lg hover:scale-110 transition-transform border-2"
                              style={{
                                background: c,
                                borderColor: prize.color === c ? 'white' : 'transparent',
                                boxShadow: prize.color === c ? `0 0 0 2px ${c}` : 'none',
                              }}
                            />
                          ))}
                        </div>
                        <div className="border-t border-[#F0EBE3] pt-2 flex items-center gap-1.5">
                          <span className="text-[10px] text-[#8A8585]">自訂</span>
                          <input
                            type="color"
                            value={prize.color}
                            onChange={e => {
                              const updated = [...prizeItems];
                              updated[i] = { ...updated[i], color: e.target.value };
                              setPrizeItems(updated);
                            }}
                            className="w-8 h-6 rounded cursor-pointer border-0"
                          />
                        </div>
                      </div>
                    )}
                  </div>

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
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C5A55A] text-white text-xs font-bold rounded-xl hover:bg-[#A08735] active:scale-95 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
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
                    onChange={e => {
                      const newType = e.target.value as Question['type'];
                      const isChoice = newType === 'radio' || newType === 'checkbox' || newType === 'radio-with-reason';
                      const preset = findPreset(q.label || '');
                      if (isChoice && preset && (!q.options || q.options.length === 0)) {
                        updateQuestion(i, { type: newType, options: preset });
                      } else {
                        updateQuestion(i, { type: newType });
                      }
                    }}
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

                </div>

                {/* Options chip editor for radio/checkbox */}
                {(q.type === 'radio' || q.type === 'checkbox' || q.type === 'radio-with-reason') && (() => {
                  const opts = q.options || [];
                  const preset = findPreset(q.label || '');
                  const inputVal = optionInputs[q.id] || '';
                  const addOpt = (val: string) => {
                    const t = val.trim();
                    if (!t || opts.includes(t)) { setOptionInputs(p => ({ ...p, [q.id]: '' })); return; }
                    updateQuestion(i, { options: [...opts, t] });
                    setOptionInputs(p => ({ ...p, [q.id]: '' }));
                  };
                  return (
                    <div className="space-y-1.5">
                      {/* Chip row */}
                      <div className="flex flex-wrap gap-1.5 px-2.5 py-2 rounded-xl border border-[#E8E2D8] bg-white items-center min-h-[38px] focus-within:border-[#C5A55A] transition-colors">
                        {opts.map((opt, oi) => (
                          <span key={oi} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#C5A55A]/15 text-[#3A3A3A] text-xs font-medium">
                            {opt}
                            <button
                              onClick={() => updateQuestion(i, { options: opts.filter((_, j) => j !== oi) })}
                              className="text-[#8A8585] hover:text-red-500 leading-none ml-0.5"
                            >×</button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={inputVal}
                          onChange={e => setOptionInputs(p => ({ ...p, [q.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ',' || e.key === '、') {
                              e.preventDefault();
                              addOpt(inputVal);
                            }
                            if (e.key === 'Backspace' && !inputVal && opts.length > 0) {
                              updateQuestion(i, { options: opts.slice(0, -1) });
                            }
                          }}
                          onBlur={() => { if (inputVal.trim()) addOpt(inputVal); }}
                          placeholder={opts.length === 0 ? '輸入選項，按 Enter 新增...' : '再加一個...'}
                          className="flex-1 min-w-[90px] text-xs outline-none bg-transparent text-[#3A3A3A] placeholder-[#C0BAB4]"
                        />
                      </div>
                      {/* Smart suggestions */}
                      {preset && preset.some(p => !opts.includes(p)) && (
                        <div className="flex items-center gap-1.5 flex-wrap pl-0.5">
                          <span className="text-[10px] text-[#C5A55A] font-medium">💡</span>
                          {preset.filter(p => !opts.includes(p)).map(p => (
                            <button
                              key={p}
                              onClick={() => updateQuestion(i, { options: [...opts, p] })}
                              className="px-2 py-0.5 rounded-full border border-[#C5A55A]/50 text-[10px] text-[#C5A55A] hover:bg-[#C5A55A]/10 transition-colors"
                            >+ {p}</button>
                          ))}
                          {opts.length === 0 && (
                            <button
                              onClick={() => updateQuestion(i, { options: [...preset] })}
                              className="px-2.5 py-0.5 rounded-full bg-[#C5A55A] text-[10px] text-white hover:bg-[#A08735] transition-colors font-medium"
                            >一鍵全選</button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
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
