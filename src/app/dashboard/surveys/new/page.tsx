'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { templateList } from '@/lib/templates';
import { ArrowLeft, Check, ChevronUp, ChevronDown, X, Plus, GripVertical } from 'lucide-react';
import type { TemplateId, Question } from '@/types/survey';

type Step = 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Block types
// ---------------------------------------------------------------------------
type BlockType = 'demographics' | 'dish-evaluation' | 'impression' | 'market' | 'feedback' | 'custom';

interface DishEvalConfig {
  dishes: string[];
  aspects: {
    appearance: boolean;
    aroma: boolean;
    taste: boolean;
    portion: boolean;
    overall: boolean;
    texture: boolean;
    custom: boolean;
  };
  customAspectLabel: string;
}

interface CustomQuestionItem {
  id: string;
  type: Question['type'];
  label: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  placeholder?: string;
}

interface SurveyBlock {
  id: string;
  type: BlockType;
  dishConfig?: DishEvalConfig;
  customQuestions?: CustomQuestionItem[];
}

// ---------------------------------------------------------------------------
// Block definitions (catalog)
// ---------------------------------------------------------------------------
const blockCatalog: { type: BlockType; icon: string; name: string; desc: string }[] = [
  { type: 'demographics', icon: '\uD83D\uDCCB', name: '\u57FA\u672C\u8CC7\u6599', desc: '\u6027\u5225\u3001\u5E74\u9F61\u3001\u662F\u5426\u9996\u6B21\u4F86\u5E97' },
  { type: 'dish-evaluation', icon: '\uD83C\uDF7D\uFE0F', name: '\u83DC\u54C1\u8A55\u9452', desc: '\u8F38\u5165\u83DC\u540D\uFF0C\u81EA\u52D5\u751F\u6210\u8A55\u9452\u554F\u984C' },
  { type: 'impression', icon: '\uD83D\uDC41\uFE0F', name: '\u6574\u9AD4\u5370\u8C61', desc: '\u7B2C\u4E00\u5370\u8C61\u3001\u64FA\u76E4\u3001\u4EFD\u91CF\u611F\u53D7' },
  { type: 'market', icon: '\uD83D\uDCB0', name: '\u5E02\u5834\u5B9A\u50F9', desc: '\u6700\u5370\u8C61\u6DF1\u523B\u83DC\u8272\u3001\u50F9\u683C\u5EFA\u8B70\u3001\u56DE\u8CFC\u610F\u9858' },
  { type: 'feedback', icon: '\uD83D\uDCAC', name: '\u958B\u653E\u56DE\u994B', desc: '\u7D66\u4E3B\u5EDA/\u8001\u95C6\u7684\u81EA\u7531\u6587\u5B57\u56DE\u994B' },
  { type: 'custom', icon: '\u2795', name: '\u81EA\u8A02\u554F\u984C', desc: '\u65B0\u589E\u55AE\u9805\u81EA\u8A02\u554F\u984C' },
];

const defaultDishConfig = (): DishEvalConfig => ({
  dishes: [''],
  aspects: {
    appearance: true,
    aroma: true,
    taste: true,
    portion: true,
    overall: true,
    texture: false,
    custom: false,
  },
  customAspectLabel: '',
});

const defaultCustomQuestion = (idx: number): CustomQuestionItem => ({
  id: `custom_${idx}_${Date.now()}`,
  type: 'emoji-rating',
  label: '',
  required: true,
  min: 1,
  max: 5,
});

let blockCounter = 0;
const nextBlockId = () => `block_${++blockCounter}`;

// ---------------------------------------------------------------------------
// Question generation helpers
// ---------------------------------------------------------------------------
function generateDemographicsQuestions(): Question[] {
  return [
    { id: 'demo_header', type: 'section-header', title: '\u57FA\u672C\u8CC7\u6599', label: '\u57FA\u672C\u8CC7\u6599', required: false },
    { id: 'demo_gender', type: 'radio', label: '\u6027\u5225', required: true, options: ['\u7537', '\u5973', '\u5176\u4ED6'] },
    { id: 'demo_age', type: 'radio', label: '\u5E74\u9F61\u5C64', required: true, options: ['18\u6B72\u4EE5\u4E0B', '18-25\u6B72', '26-35\u6B72', '36-45\u6B72', '46\u6B72\u4EE5\u4E0A'] },
    { id: 'demo_first_visit', type: 'radio', label: '\u662F\u5426\u7B2C\u4E00\u6B21\u4F86\u672C\u5E97', required: true, options: ['\u662F', '\u5426'] },
  ];
}

function generateImpressionQuestions(): Question[] {
  return [
    { id: 'impression_header', type: 'section-header', title: '\u6574\u9AD4\u5370\u8C61', label: '\u6574\u9AD4\u5370\u8C61', required: false },
    { id: 'impression_first', type: 'rating', label: '\u7B2C\u4E00\u773C\u5370\u8C61\u8A55\u5206', required: true, min: 1, max: 5 },
    { id: 'impression_plating', type: 'rating', label: '\u64FA\u76E4\u7CBE\u7DFB\u5EA6', required: true, min: 1, max: 5 },
    { id: 'impression_portion', type: 'radio', label: '\u4EFD\u91CF\u611F\u53D7', required: false, options: ['\u525B\u597D', '\u7A0D\u5FAE\u504F\u5C11', '\u592A\u591A\uFF08\u9069\u5408\u5206\u4EAB\uFF09'] },
  ];
}

function generateDishQuestions(config: DishEvalConfig): Question[] {
  const questions: Question[] = [
    { id: 'dish_header', type: 'section-header', title: '\u83DC\u54C1\u8A55\u9452', label: '\u83DC\u54C1\u8A55\u9452', required: false },
  ];

  const aspectDefs: { key: keyof DishEvalConfig['aspects']; label: string; idSuffix: string }[] = [
    { key: 'appearance', label: '\u5916\u89C0\u8CE3\u76F8', idSuffix: 'appearance' },
    { key: 'aroma', label: '\u9999\u6C23', idSuffix: 'aroma' },
    { key: 'taste', label: '\u53E3\u5473', idSuffix: 'taste' },
    { key: 'portion', label: '\u4EFD\u91CF', idSuffix: 'portion' },
    { key: 'overall', label: '\u6574\u9AD4\u6EFF\u610F\u5EA6', idSuffix: 'overall' },
    { key: 'texture', label: '\u53E3\u611F\u63CF\u8FF0', idSuffix: 'texture' },
  ];

  config.dishes.forEach((dish, di) => {
    const dishName = dish.trim() || `\u83DC\u54C1 ${di + 1}`;
    questions.push({
      id: `dish_${di}_header`,
      type: 'section-header',
      title: dishName,
      label: dishName,
      description: `\u8ACB\u8A55\u50F9\u300C${dishName}\u300D`,
      required: false,
    });

    aspectDefs.forEach(({ key, label, idSuffix }) => {
      if (!config.aspects[key]) return;
      questions.push({
        id: `dish_${di}_${idSuffix}`,
        type: 'radio-with-reason',
        label: `${label}`,
        required: true,
        options: ['\u975E\u5E38\u6EFF\u610F', '\u6EFF\u610F', '\u666E\u901A', '\u4E0D\u592A\u6EFF\u610F', '\u4E0D\u6EFF\u610F'],
        showReason: true,
        reasonPlaceholder: '\u8ACB\u8AAA\u660E\u539F\u56E0',
        dishName,
      });
    });

    if (config.aspects.custom && config.customAspectLabel.trim()) {
      questions.push({
        id: `dish_${di}_custom`,
        type: 'radio-with-reason',
        label: config.customAspectLabel.trim(),
        required: false,
        options: ['\u975E\u5E38\u6EFF\u610F', '\u6EFF\u610F', '\u666E\u901A', '\u4E0D\u592A\u6EFF\u610F', '\u4E0D\u6EFF\u610F'],
        showReason: true,
        reasonPlaceholder: '\u8ACB\u8AAA\u660E\u539F\u56E0',
        dishName,
      });
    }
  });

  return questions;
}

function generateMarketQuestions(): Question[] {
  return [
    { id: 'market_header', type: 'section-header', title: '\u5E02\u5834\u5B9A\u50F9', label: '\u5E02\u5834\u5B9A\u50F9', required: false },
    { id: 'market_best_dish', type: 'text', label: '\u6700\u5370\u8C61\u6DF1\u523B\u7684\u662F\u54EA\u4E00\u9053\uFF1F', required: false, placeholder: '\u8ACB\u8F38\u5165\u83DC\u540D' },
    { id: 'market_price', type: 'number', label: '\u5408\u7406\u7684\u5B9A\u50F9\u5EFA\u8B70\uFF08NT$\uFF09', required: false, placeholder: '\u8F38\u5165\u91D1\u984D' },
    { id: 'market_repurchase', type: 'rating', label: '\u56DE\u8CFC\u610F\u9858', required: true, min: 1, max: 5 },
    { id: 'market_occasion', type: 'checkbox', label: '\u6700\u9069\u5408\u7684\u6D88\u8CBB\u60C5\u5883', required: false, options: ['\u670B\u53CB\u805A\u9910\u4E0B\u9152', '\u7D04\u6703\u6176\u795D', '\u5BB6\u5EAD\u805A\u6703', '\u5546\u52D9\u5BA4\u9910', '\u7368\u81EA\u7528\u9910'] },
  ];
}

function generateFeedbackQuestions(): Question[] {
  return [
    { id: 'feedback_header', type: 'section-header', title: '\u958B\u653E\u56DE\u994B', label: '\u958B\u653E\u56DE\u994B', required: false },
    { id: 'feedback_chef', type: 'textarea', label: '\u7D66\u4E3B\u5EDA/\u8001\u95C6\u7684\u60C4\u60C4\u8A71', required: false, placeholder: '\u5982\u679C\u53EF\u4EE5\u8ABF\u6574\u4E00\u500B\u7D30\u7BC0\u8B93\u9019\u9053\u83DC\u66F4\u5B8C\u7F8E\uFF0C\u60A8\u7684\u5EFA\u8B70\u662F\uFF1F' },
  ];
}

function generateCustomBlockQuestions(items: CustomQuestionItem[]): Question[] {
  return items
    .filter((q) => q.label.trim() !== '')
    .map((q) => {
      const base: Question = {
        id: q.id,
        type: q.type,
        label: q.label,
        required: q.required,
      };
      if (q.options && (q.type === 'radio' || q.type === 'checkbox')) base.options = q.options;
      if (q.type === 'emoji-rating' || q.type === 'rating' || q.type === 'rating-with-reason') {
        base.min = q.min ?? 1;
        base.max = q.max ?? 5;
      }
      if (q.placeholder) base.placeholder = q.placeholder;
      if (q.type === 'radio-with-reason' || q.type === 'rating-with-reason') {
        base.showReason = true;
        base.reasonPlaceholder = '\u8ACB\u8AAA\u660E\u539F\u56E0';
      }
      return base;
    });
}

function blockToQuestions(block: SurveyBlock): Question[] {
  switch (block.type) {
    case 'demographics':
      return generateDemographicsQuestions();
    case 'dish-evaluation':
      return generateDishQuestions(block.dishConfig || defaultDishConfig());
    case 'impression':
      return generateImpressionQuestions();
    case 'market':
      return generateMarketQuestions();
    case 'feedback':
      return generateFeedbackQuestions();
    case 'custom':
      return generateCustomBlockQuestions(block.customQuestions || []);
    default:
      return [];
  }
}

function blockLabel(type: BlockType): string {
  return blockCatalog.find((b) => b.type === type)?.name || type;
}

function blockIcon(type: BlockType): string {
  return blockCatalog.find((b) => b.type === type)?.icon || '';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NewSurveyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Template
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);

  // Step 2: Title + Blocks
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<SurveyBlock[]>([]);
  const [showBlockPicker, setShowBlockPicker] = useState(false);

  // Step 3: Discount
  const [discountEnabled, setDiscountEnabled] = useState(true);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'freebie' | 'custom_text'>('percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [discountExpiryDays, setDiscountExpiryDays] = useState(7);

  // ---------------------------------------------------------------------------
  // Derived questions
  // ---------------------------------------------------------------------------
  const getQuestions = useCallback((): Question[] => {
    return blocks.flatMap(blockToQuestions);
  }, [blocks]);

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return selectedTemplate !== null;
      case 2:
        return title.trim() !== '' && blocks.length > 0 && getQuestions().length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  // ---------------------------------------------------------------------------
  // Block CRUD
  // ---------------------------------------------------------------------------
  const addBlock = (type: BlockType) => {
    // demographics, impression, market, feedback: allow only one each
    if (['demographics', 'impression', 'market', 'feedback'].includes(type)) {
      if (blocks.some((b) => b.type === type)) return; // already added
    }
    const newBlock: SurveyBlock = { id: nextBlockId(), type };
    if (type === 'dish-evaluation') newBlock.dishConfig = defaultDishConfig();
    if (type === 'custom') newBlock.customQuestions = [defaultCustomQuestion(0)];
    setBlocks([...blocks, newBlock]);
    setShowBlockPicker(false);
  };

  const removeBlock = (id: string) => setBlocks(blocks.filter((b) => b.id !== id));

  const moveBlock = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
  };

  const updateBlock = (id: string, updates: Partial<SurveyBlock>) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  // ---------------------------------------------------------------------------
  // Dish config helpers
  // ---------------------------------------------------------------------------
  const updateDish = (blockId: string, dishIndex: number, value: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.dishConfig) return;
    const dishes = [...block.dishConfig.dishes];
    dishes[dishIndex] = value;
    updateBlock(blockId, { dishConfig: { ...block.dishConfig, dishes } });
  };

  const addDish = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.dishConfig) return;
    updateBlock(blockId, { dishConfig: { ...block.dishConfig, dishes: [...block.dishConfig.dishes, ''] } });
  };

  const removeDish = (blockId: string, dishIndex: number) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.dishConfig || block.dishConfig.dishes.length <= 1) return;
    const dishes = block.dishConfig.dishes.filter((_, i) => i !== dishIndex);
    updateBlock(blockId, { dishConfig: { ...block.dishConfig, dishes } });
  };

  const toggleAspect = (blockId: string, aspect: keyof DishEvalConfig['aspects']) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.dishConfig) return;
    updateBlock(blockId, {
      dishConfig: {
        ...block.dishConfig,
        aspects: { ...block.dishConfig.aspects, [aspect]: !block.dishConfig.aspects[aspect] },
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Custom question helpers
  // ---------------------------------------------------------------------------
  const addCustomQuestion = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.customQuestions) return;
    updateBlock(blockId, {
      customQuestions: [...block.customQuestions, defaultCustomQuestion(block.customQuestions.length)],
    });
  };

  const removeCustomQuestion = (blockId: string, qIndex: number) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.customQuestions || block.customQuestions.length <= 1) return;
    updateBlock(blockId, { customQuestions: block.customQuestions.filter((_, i) => i !== qIndex) });
  };

  const updateCustomQuestion = (blockId: string, qIndex: number, updates: Partial<CustomQuestionItem>) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block?.customQuestions) return;
    updateBlock(blockId, {
      customQuestions: block.customQuestions.map((q, i) => (i === qIndex ? { ...q, ...updates } : q)),
    });
  };

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
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
        throw new Error(data.error || '\u5EFA\u7ACB\u554F\u5377\u5931\u6557');
      }

      const data = await res.json();
      router.push(`/dashboard/surveys/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '\u767C\u751F\u932F\u8AA4');
      setSubmitting(false);
    }
  };

  const stepLabels = ['\u9078\u64C7\u6A21\u677F', '\u8A2D\u5B9A\u554F\u5377', '\u6298\u6263\u8A2D\u5B9A', '\u9810\u89BD\u767C\u5E03'];

  // Questions for preview
  const allQuestions = getQuestions();

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Back Link */}
      <Link
        href="/dashboard/surveys"
        className="inline-flex items-center gap-1.5 text-sm text-[#8A8585] hover:text-[#A08735] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        \u8FD4\u56DE\u554F\u5377\u5217\u8868
      </Link>

      <h1 className="text-2xl font-bold text-[#3A3A3A] font-serif mb-2">\u5EFA\u7ACB\u65B0\u554F\u5377</h1>
      <p className="text-sm text-[#8A8585] mb-8">\u6309\u6B65\u9A5F\u5B8C\u6210\u554F\u5377\u8A2D\u5B9A</p>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {stepLabels.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-px ${isDone ? 'bg-[#C5A55A]' : 'bg-[#E8E2D8]'}`} />}
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

      {/* ================================================================== */}
      {/* Step 1: Choose Template                                            */}
      {/* ================================================================== */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-bold text-[#3A3A3A] font-serif mb-2">\u9078\u64C7\u554F\u5377\u6A21\u677F</h2>
          <p className="text-sm text-[#8A8585] mb-6">\u9078\u64C7\u4E00\u500B\u98A8\u683C\u6A21\u677F\uFF0C\u6C7A\u5B9A\u554F\u5377\u7684\u8996\u89BA\u5916\u89C0</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templateList.map((tmpl) => {
              const isSelected = selectedTemplate === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`text-left rounded-2xl border-2 p-4 transition-all ${
                    isSelected ? 'border-[#C5A55A] shadow-md' : 'border-[#E8E2D8] hover:border-[#C5A55A]/50'
                  }`}
                  style={{ backgroundColor: tmpl.colors.background }}
                >
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
                      \u5DF2\u9078\u64C7
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Step 2: Build Survey Content (Block-based)                         */}
      {/* ================================================================== */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-bold text-[#3A3A3A] font-serif mb-2">\u8A2D\u5B9A\u554F\u5377\u5167\u5BB9</h2>
          <p className="text-sm text-[#8A8585] mb-6">\u8A2D\u5B9A\u6A19\u984C\u4E26\u7D44\u5408\u554F\u5377\u5340\u584A</p>

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#3A3A3A] mb-2">\u554F\u5377\u6A19\u984C</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="\u4F8B\u5982\uFF1A\u7528\u9910\u6EFF\u610F\u5EA6\u8ABF\u67E5"
              className="w-full px-4 py-3 rounded-xl border border-[#E8E2D8] bg-white text-[#3A3A3A] text-sm focus:outline-none focus:border-[#C5A55A] focus:ring-2 focus:ring-[#C5A55A]/20 placeholder:text-[#8A8585]/60"
            />
          </div>

          {/* Two-column layout on larger screens */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: current blocks */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-[#3A3A3A]">\u554F\u5377\u7D50\u69CB</label>
                <span className="text-xs text-[#8A8585]">{allQuestions.filter((q) => q.type !== 'section-header').length} \u984C</span>
              </div>

              {blocks.length === 0 && (
                <div className="border-2 border-dashed border-[#E8E2D8] rounded-2xl p-8 text-center text-[#8A8585]">
                  <p className="text-sm mb-2">\u5C1A\u672A\u65B0\u589E\u4EFB\u4F55\u5340\u584A</p>
                  <p className="text-xs">\u9EDE\u64CA\u53F3\u5074\u300C\u65B0\u589E\u5340\u584A\u300D\u4F86\u7D44\u5408\u554F\u5377\u5167\u5BB9</p>
                </div>
              )}

              <div className="space-y-3">
                {blocks.map((block, index) => (
                  <div key={block.id} className="bg-white rounded-2xl border border-[#E8E2D8] overflow-hidden">
                    {/* Block header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-[#FAF7F2] border-b border-[#E8E2D8]">
                      <GripVertical className="w-4 h-4 text-[#8A8585] shrink-0" />
                      <span className="text-base mr-1">{blockIcon(block.type)}</span>
                      <span className="text-sm font-medium text-[#3A3A3A] flex-1">{blockLabel(block.type)}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveBlock(index, -1)}
                          disabled={index === 0}
                          className="p-1 text-[#8A8585] hover:text-[#C5A55A] disabled:opacity-30 transition-colors"
                          title="\u4E0A\u79FB"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveBlock(index, 1)}
                          disabled={index === blocks.length - 1}
                          className="p-1 text-[#8A8585] hover:text-[#C5A55A] disabled:opacity-30 transition-colors"
                          title="\u4E0B\u79FB"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="p-1 text-[#8A8585] hover:text-red-500 transition-colors"
                          title="\u79FB\u9664\u5340\u584A"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Block body */}
                    <div className="p-4">
                      {/* Demographics preview */}
                      {block.type === 'demographics' && (
                        <div className="space-y-1 text-xs text-[#8A8585]">
                          <p>\u2713 \u6027\u5225\u3001\u5E74\u9F61\u5C64\u3001\u662F\u5426\u7B2C\u4E00\u6B21\u4F86\u5E97</p>
                          <p className="text-[10px]">\u4EE5\u4E0A\u70BA\u9810\u8A2D\u554F\u984C\uFF0C\u7121\u9700\u984D\u5916\u8A2D\u5B9A</p>
                        </div>
                      )}

                      {/* Impression preview */}
                      {block.type === 'impression' && (
                        <div className="space-y-1 text-xs text-[#8A8585]">
                          <p>\u2713 \u7B2C\u4E00\u773C\u5370\u8C61\u8A55\u5206\u3001\u64FA\u76E4\u7CBE\u7DFB\u5EA6\u3001\u4EFD\u91CF\u611F\u53D7</p>
                          <p className="text-[10px]">\u4EE5\u4E0A\u70BA\u9810\u8A2D\u554F\u984C\uFF0C\u7121\u9700\u984D\u5916\u8A2D\u5B9A</p>
                        </div>
                      )}

                      {/* Market preview */}
                      {block.type === 'market' && (
                        <div className="space-y-1 text-xs text-[#8A8585]">
                          <p>\u2713 \u6700\u5370\u8C61\u6DF1\u523B\u83DC\u8272\u3001\u5B9A\u50F9\u5EFA\u8B70\u3001\u56DE\u8CFC\u610F\u9858\u3001\u6D88\u8CBB\u60C5\u5883</p>
                          <p className="text-[10px]">\u4EE5\u4E0A\u70BA\u9810\u8A2D\u554F\u984C\uFF0C\u7121\u9700\u984D\u5916\u8A2D\u5B9A</p>
                        </div>
                      )}

                      {/* Feedback preview */}
                      {block.type === 'feedback' && (
                        <div className="space-y-1 text-xs text-[#8A8585]">
                          <p>\u2713 \u7D66\u4E3B\u5EDA/\u8001\u95C6\u7684\u81EA\u7531\u6587\u5B57\u56DE\u994B</p>
                          <p className="text-[10px]">\u4EE5\u4E0A\u70BA\u9810\u8A2D\u554F\u984C\uFF0C\u7121\u9700\u984D\u5916\u8A2D\u5B9A</p>
                        </div>
                      )}

                      {/* Dish evaluation config */}
                      {block.type === 'dish-evaluation' && block.dishConfig && (
                        <div className="space-y-3">
                          {/* Dish list */}
                          <div className="space-y-2">
                            {block.dishConfig.dishes.map((dish, di) => (
                              <div key={di} className="flex items-center gap-2">
                                <span className="text-xs text-[#8A8585] shrink-0 w-16">\u83DC\u54C1 {di + 1}:</span>
                                <input
                                  type="text"
                                  value={dish}
                                  onChange={(e) => updateDish(block.id, di, e.target.value)}
                                  placeholder="\u8F38\u5165\u83DC\u540D..."
                                  className="flex-1 px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm text-[#3A3A3A] focus:outline-none focus:border-[#C5A55A] placeholder:text-[#8A8585]/60"
                                />
                                <button
                                  onClick={() => removeDish(block.id, di)}
                                  disabled={block.dishConfig!.dishes.length <= 1}
                                  className="p-1.5 text-[#8A8585] hover:text-red-500 disabled:opacity-30 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => addDish(block.id)}
                              className="flex items-center gap-1 text-xs text-[#C5A55A] hover:text-[#A08735] transition-colors ml-16"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              \u65B0\u589E\u83DC\u54C1
                            </button>
                          </div>

                          {/* Aspect toggles */}
                          <div className="pt-3 border-t border-[#E8E2D8]">
                            <p className="text-xs text-[#8A8585] mb-2">\u6BCF\u9053\u83DC\u81EA\u52D5\u5305\u542B\uFF1A</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                              {([
                                ['appearance', '\u5916\u89C0\u8CE3\u76F8'],
                                ['aroma', '\u9999\u6C23'],
                                ['taste', '\u53E3\u5473'],
                                ['portion', '\u4EFD\u91CF'],
                                ['overall', '\u6574\u9AD4\u6EFF\u610F\u5EA6'],
                                ['texture', '\u53E3\u611F\u63CF\u8FF0'],
                              ] as [keyof DishEvalConfig['aspects'], string][]).map(([key, label]) => (
                                <label key={key} className="flex items-center gap-1.5 text-xs text-[#3A3A3A] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={block.dishConfig!.aspects[key]}
                                    onChange={() => toggleAspect(block.id, key)}
                                    className="accent-[#C5A55A] w-3.5 h-3.5"
                                  />
                                  {label}
                                </label>
                              ))}
                              <label className="flex items-center gap-1.5 text-xs text-[#3A3A3A] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={block.dishConfig.aspects.custom}
                                  onChange={() => toggleAspect(block.id, 'custom')}
                                  className="accent-[#C5A55A] w-3.5 h-3.5"
                                />
                                \u7279\u6B8A\u554F\u984C(\u81EA\u8A02)
                              </label>
                            </div>
                            {block.dishConfig.aspects.custom && (
                              <input
                                type="text"
                                value={block.dishConfig.customAspectLabel}
                                onChange={(e) =>
                                  updateBlock(block.id, {
                                    dishConfig: { ...block.dishConfig!, customAspectLabel: e.target.value },
                                  })
                                }
                                placeholder="\u81EA\u8A02\u554F\u984C\u6A19\u984C..."
                                className="mt-2 w-full px-3 py-2 rounded-lg border border-[#E8E2D8] text-xs text-[#3A3A3A] focus:outline-none focus:border-[#C5A55A] placeholder:text-[#8A8585]/60"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Custom questions */}
                      {block.type === 'custom' && block.customQuestions && (
                        <div className="space-y-3">
                          {block.customQuestions.map((q, qi) => (
                            <div key={qi} className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-[#C5A55A]/10 text-[#A08735] text-[10px] font-bold flex items-center justify-center shrink-0 mt-1">
                                {qi + 1}
                              </span>
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  value={q.label}
                                  onChange={(e) => updateCustomQuestion(block.id, qi, { label: e.target.value })}
                                  placeholder="\u8F38\u5165\u554F\u984C..."
                                  className="w-full px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm text-[#3A3A3A] focus:outline-none focus:border-[#C5A55A] placeholder:text-[#8A8585]/60"
                                />
                                <div className="flex items-center gap-3">
                                  <select
                                    value={q.type}
                                    onChange={(e) =>
                                      updateCustomQuestion(block.id, qi, { type: e.target.value as Question['type'] })
                                    }
                                    className="px-3 py-1.5 rounded-lg border border-[#E8E2D8] text-xs text-[#3A3A3A] bg-white focus:outline-none focus:border-[#C5A55A]"
                                  >
                                    <option value="emoji-rating">\u8868\u60C5\u8A55\u5206</option>
                                    <option value="rating">\u661F\u7D1A\u8A55\u5206</option>
                                    <option value="radio">\u55AE\u9078</option>
                                    <option value="checkbox">\u591A\u9078</option>
                                    <option value="radio-with-reason">\u55AE\u9078+\u539F\u56E0</option>
                                    <option value="rating-with-reason">\u8A55\u5206+\u539F\u56E0</option>
                                    <option value="text">\u7C21\u7B54</option>
                                    <option value="textarea">\u9577\u7B54</option>
                                    <option value="number">\u6578\u5B57</option>
                                  </select>
                                  <label className="flex items-center gap-1.5 text-xs text-[#8A8585]">
                                    <input
                                      type="checkbox"
                                      checked={q.required}
                                      onChange={(e) =>
                                        updateCustomQuestion(block.id, qi, { required: e.target.checked })
                                      }
                                      className="accent-[#C5A55A]"
                                    />
                                    \u5FC5\u586B
                                  </label>
                                </div>
                                {(q.type === 'radio' || q.type === 'checkbox' || q.type === 'radio-with-reason') && (
                                  <input
                                    type="text"
                                    value={(q.options || []).join(', ')}
                                    onChange={(e) =>
                                      updateCustomQuestion(block.id, qi, {
                                        options: e.target.value
                                          .split(',')
                                          .map((s) => s.trim())
                                          .filter(Boolean),
                                      })
                                    }
                                    placeholder="\u9078\u9805\uFF08\u7528\u9017\u865F\u5206\u9694\uFF09"
                                    className="w-full px-3 py-2 rounded-lg border border-[#E8E2D8] text-xs text-[#3A3A3A] focus:outline-none focus:border-[#C5A55A] placeholder:text-[#8A8585]/60"
                                  />
                                )}
                              </div>
                              <button
                                onClick={() => removeCustomQuestion(block.id, qi)}
                                disabled={(block.customQuestions?.length ?? 0) <= 1}
                                className="p-1.5 text-[#8A8585] hover:text-red-500 disabled:opacity-30 transition-colors mt-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addCustomQuestion(block.id)}
                            className="w-full py-2 border-2 border-dashed border-[#E8E2D8] rounded-xl text-xs text-[#8A8585] hover:border-[#C5A55A] hover:text-[#A08735] transition-colors"
                          >
                            + \u65B0\u589E\u554F\u984C
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add block button (small screens) */}
              <button
                onClick={() => setShowBlockPicker(!showBlockPicker)}
                className="w-full mt-4 py-3 border-2 border-dashed border-[#E8E2D8] rounded-2xl text-sm text-[#8A8585] hover:border-[#C5A55A] hover:text-[#A08735] transition-colors lg:hidden"
              >
                + \u65B0\u589E\u5340\u584A
              </button>

              {/* Block picker (mobile dropdown) */}
              {showBlockPicker && (
                <div className="mt-2 bg-white rounded-2xl border border-[#E8E2D8] p-3 space-y-2 lg:hidden">
                  {blockCatalog.map((cat) => {
                    const alreadyAdded =
                      ['demographics', 'impression', 'market', 'feedback'].includes(cat.type) &&
                      blocks.some((b) => b.type === cat.type);
                    return (
                      <button
                        key={cat.type}
                        onClick={() => addBlock(cat.type)}
                        disabled={alreadyAdded}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                          alreadyAdded
                            ? 'border-[#E8E2D8] bg-[#FAF7F2] opacity-50 cursor-not-allowed'
                            : 'border-[#E8E2D8] hover:border-[#C5A55A] hover:bg-[#C5A55A]/5'
                        }`}
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <span className="text-sm font-medium text-[#3A3A3A]">{cat.name}</span>
                          {alreadyAdded && <span className="text-xs text-[#8A8585] ml-2">\u5DF2\u65B0\u589E</span>}
                          <p className="text-xs text-[#8A8585]">{cat.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: block catalog (desktop sidebar) */}
            <div className="hidden lg:block w-64 shrink-0">
              <label className="block text-sm font-medium text-[#3A3A3A] mb-3">\u65B0\u589E\u5340\u584A</label>
              <div className="space-y-2">
                {blockCatalog.map((cat) => {
                  const alreadyAdded =
                    ['demographics', 'impression', 'market', 'feedback'].includes(cat.type) &&
                    blocks.some((b) => b.type === cat.type);
                  return (
                    <button
                      key={cat.type}
                      onClick={() => addBlock(cat.type)}
                      disabled={alreadyAdded}
                      className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
                        alreadyAdded
                          ? 'border-[#E8E2D8] bg-[#FAF7F2] opacity-50 cursor-not-allowed'
                          : 'border-[#E8E2D8] hover:border-[#C5A55A] hover:bg-[#C5A55A]/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.icon}</span>
                        <div>
                          <span className="text-sm font-medium text-[#3A3A3A]">{cat.name}</span>
                          {alreadyAdded && <span className="text-xs text-[#8A8585] ml-1">\u2713</span>}
                          <p className="text-xs text-[#8A8585] leading-tight">{cat.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Step 3: Discount                                                   */}
      {/* ================================================================== */}
      {step === 3 && (
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-[#3A3A3A] font-serif mb-2">\u6298\u6263\u8A2D\u5B9A</h2>
          <p className="text-sm text-[#8A8585] mb-6">\u8A2D\u5B9A\u5B8C\u6210\u554F\u5377\u5F8C\u7684\u6298\u6263\u734E\u52F5</p>

          {/* Enable/Disable */}
          <div className="bg-white rounded-xl border border-[#E8E2D8] p-5 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#3A3A3A]">\u555F\u7528\u6298\u6263\u734E\u52F5</h4>
                <p className="text-xs text-[#8A8585] mt-0.5">\u9867\u5BA2\u5B8C\u6210\u554F\u5377\u5F8C\u6703\u6536\u5230\u6298\u6263\u78BC</p>
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
              <div className="bg-white rounded-xl border border-[#E8E2D8] p-5">
                <label className="block text-sm font-medium text-[#3A3A3A] mb-3">\u6298\u6263\u985E\u578B</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'percentage', label: '\u767E\u5206\u6BD4\u6298\u6263', desc: '\u4F8B\u5982\uFF1A\u62539\u6298' },
                    { value: 'fixed', label: '\u56FA\u5B9A\u91D1\u984D', desc: '\u4F8B\u5982\uFF1A\u627250\u5143' },
                    { value: 'freebie', label: '\u514D\u8CBB\u8D08\u54C1', desc: '\u4F8B\u5982\uFF1A\u9001\u5C0F\u83DC\u4E00\u4EFD' },
                    { value: 'custom_text', label: '\u81EA\u8A02\u6587\u5B57', desc: '\u81EA\u7531\u8F38\u5165\u512A\u60E0\u5167\u5BB9' },
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

              <div className="bg-white rounded-xl border border-[#E8E2D8] p-5">
                <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                  {discountType === 'percentage'
                    ? '\u6298\u6263\u767E\u5206\u6BD4'
                    : discountType === 'fixed'
                    ? '\u6298\u6263\u91D1\u984D\uFF08NT$\uFF09'
                    : '\u512A\u60E0\u5167\u5BB9'}
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
                      : '\u514D\u8CBB\u8D08\u9001\u5C0F\u83DC\u4E00\u4EFD'
                  }
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E2D8] bg-white text-[#3A3A3A] text-sm focus:outline-none focus:border-[#C5A55A] focus:ring-2 focus:ring-[#C5A55A]/20 placeholder:text-[#8A8585]/60"
                />
                {discountType === 'percentage' && (
                  <p className="text-xs text-[#8A8585] mt-1.5">\u8F38\u5165\u6298\u6263\u767E\u5206\u6BD4\uFF0C\u4F8B\u5982 10 \u4EE3\u8868\u62539\u6298</p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-[#E8E2D8] p-5">
                <label className="block text-sm font-medium text-[#3A3A3A] mb-2">\u6298\u6263\u78BC\u6709\u6548\u5929\u6578</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={discountExpiryDays}
                    onChange={(e) => setDiscountExpiryDays(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={365}
                    className="w-24 px-4 py-3 rounded-xl border border-[#E8E2D8] bg-white text-[#3A3A3A] text-sm focus:outline-none focus:border-[#C5A55A] focus:ring-2 focus:ring-[#C5A55A]/20"
                  />
                  <span className="text-sm text-[#8A8585]">\u5929</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* Step 4: Preview                                                    */}
      {/* ================================================================== */}
      {step === 4 && (
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-[#3A3A3A] font-serif mb-2">\u9810\u89BD\u78BA\u8A8D</h2>
          <p className="text-sm text-[#8A8585] mb-6">\u78BA\u8A8D\u8A2D\u5B9A\u7121\u8AA4\u5F8C\u767C\u5E03\u554F\u5377</p>

          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
              <h3 className="font-bold text-lg text-[#3A3A3A] mb-4">{title}</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[#E8E2D8]">
                  <span className="text-sm text-[#8A8585]">\u8996\u89BA\u6A21\u677F</span>
                  <span className="text-sm text-[#3A3A3A] font-medium flex items-center gap-2">
                    {selectedTemplate && (
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: templateList.find((t) => t.id === selectedTemplate)?.colors.primary,
                        }}
                      />
                    )}
                    {templateList.find((t) => t.id === selectedTemplate)?.name}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#E8E2D8]">
                  <span className="text-sm text-[#8A8585]">\u5340\u584A\u6578\u91CF</span>
                  <span className="text-sm text-[#3A3A3A] font-medium">{blocks.length} \u500B\u5340\u584A</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#E8E2D8]">
                  <span className="text-sm text-[#8A8585]">\u554F\u984C\u6578\u91CF</span>
                  <span className="text-sm text-[#3A3A3A] font-medium">
                    {allQuestions.filter((q) => q.type !== 'section-header').length} \u984C
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#E8E2D8]">
                  <span className="text-sm text-[#8A8585]">\u6298\u6263\u734E\u52F5</span>
                  <span className="text-sm text-[#3A3A3A] font-medium">
                    {discountEnabled ? (
                      <>
                        {discountType === 'percentage' && `${discountValue}% \u6298\u6263`}
                        {discountType === 'fixed' && `NT$${discountValue} \u6298\u6263`}
                        {discountType === 'freebie' && discountValue}
                        {discountType === 'custom_text' && discountValue}
                        <span className="text-xs text-[#8A8585] ml-2">\uFF08{discountExpiryDays} \u5929\u6709\u6548\uFF09</span>
                      </>
                    ) : (
                      '\u672A\u555F\u7528'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Block structure preview */}
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
              <h4 className="font-bold text-sm text-[#3A3A3A] mb-3">\u5340\u584A\u7D50\u69CB</h4>
              <div className="space-y-2">
                {blocks.map((block) => (
                  <div key={block.id} className="flex items-center gap-2 py-1.5 px-3 bg-[#FAF7F2] rounded-lg">
                    <span className="text-base">{blockIcon(block.type)}</span>
                    <span className="text-sm text-[#3A3A3A] font-medium">{blockLabel(block.type)}</span>
                    {block.type === 'dish-evaluation' && block.dishConfig && (
                      <span className="text-xs text-[#8A8585] ml-auto">
                        {block.dishConfig.dishes.filter((d) => d.trim()).length} \u9053\u83DC
                      </span>
                    )}
                    {block.type === 'custom' && block.customQuestions && (
                      <span className="text-xs text-[#8A8585] ml-auto">
                        {block.customQuestions.filter((q) => q.label.trim()).length} \u984C
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Questions Preview */}
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
              <h4 className="font-bold text-sm text-[#3A3A3A] mb-3">\u554F\u984C\u6E05\u55AE</h4>
              <div className="space-y-1.5">
                {(() => {
                  let qNum = 0;
                  return allQuestions.map((q, i) => {
                    if (q.type === 'section-header') {
                      return (
                        <div key={i} className="pt-3 pb-1 first:pt-0">
                          <span className="text-xs font-bold text-[#C5A55A] uppercase tracking-wide">
                            {q.title || q.label}
                          </span>
                          {q.description && <p className="text-[10px] text-[#8A8585]">{q.description}</p>}
                        </div>
                      );
                    }
                    qNum++;
                    return (
                      <div key={i} className="flex items-center gap-3 py-1">
                        <span className="w-5 h-5 rounded bg-[#C5A55A]/10 text-[#A08735] text-[10px] font-bold flex items-center justify-center shrink-0">
                          {qNum}
                        </span>
                        <span className="text-sm text-[#3A3A3A] flex-1 truncate">
                          {q.dishName && <span className="text-[#8A8585]">[{q.dishName}] </span>}
                          {q.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-[#FAF7F2] text-[#8A8585] rounded-full shrink-0">
                          {q.type}
                        </span>
                        {q.required && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded-full shrink-0">
                            \u5FC5\u586B
                          </span>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Navigation Buttons                                                 */}
      {/* ================================================================== */}
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
          {step === 1 ? '\u53D6\u6D88' : '\u4E0A\u4E00\u6B65'}
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep((step + 1) as Step)}
            disabled={!canProceed()}
            className="px-6 py-2.5 bg-[#C5A55A] text-white text-sm font-medium rounded-xl hover:bg-[#A08735] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            \u4E0B\u4E00\u6B65
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-[#C5A55A] text-white text-sm font-medium rounded-xl hover:bg-[#A08735] transition-colors disabled:opacity-60"
          >
            {submitting ? '\u767C\u5E03\u4E2D...' : '\u767C\u5E03\u554F\u5377'}
          </button>
        )}
      </div>
    </div>
  );
}
