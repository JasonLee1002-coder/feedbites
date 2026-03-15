'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { templateList } from '@/lib/templates';
import { ArrowLeft, Check, ChevronUp, ChevronDown, X, Plus, GripVertical, Upload, Sparkles, Loader2, FileText } from 'lucide-react';
import type { TemplateId, Question, DiscountTier } from '@/types/survey';

// Animated progress for survey upload
function SurveyUploadProgress() {
  const [step, setStep] = useState(0);
  const steps = [
    { text: '正在讀取文件...', icon: '📄' },
    { text: '辨識問題和選項中...', icon: '🔍' },
    { text: '分析問題類型（評分、選擇、開放）...', icon: '🧠' },
    { text: '快好了！整理成 FeedBites 格式...', icon: '✨' },
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 3000),
      setTimeout(() => setStep(2), 8000),
      setTimeout(() => setStep(3), 14000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const current = steps[step];
  return (
    <div className="py-5">
      <div className="flex items-center gap-3 mb-3">
        <Loader2 className="w-6 h-6 text-[#FF8C00] animate-spin" />
        <div>
          <p className="text-sm font-medium text-[#3A3A3A]">副店長正在分析你的問卷</p>
          <p className="text-[10px] text-[#8A8585]">大約 15-25 秒，請稍候</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-2 text-xs transition-all duration-500 ${i <= step ? 'text-[#3A3A3A]' : 'text-[#E8E2D8]'}`}>
            <span>{i < step ? '✅' : i === step ? s.icon : '⬜'}</span>
            <span>{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type Step = 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Block types
// ---------------------------------------------------------------------------
type BlockType = 'demographics' | 'dish-evaluation' | 'impression' | 'market' | 'feedback' | 'custom';

interface DishEvalConfig {
  dishes: string[];
  dishPhotos?: Record<string, string>; // dishName → photoUrl
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
  { type: 'demographics', icon: '📋', name: '基本資料', desc: '性別、年齡、是否首次來店' },
  { type: 'dish-evaluation', icon: '🍽️', name: '菜品評鑒', desc: '輸入菜名，自動生成評鑒問題' },
  { type: 'impression', icon: '👁️', name: '整體印象', desc: '第一印象、擺盤、份量感受' },
  { type: 'market', icon: '💰', name: '市場定價', desc: '最印象深刻菜色、價格建議、回購意願' },
  { type: 'feedback', icon: '💬', name: '開放回饋', desc: '給主廚/老闆的自由文字回饋' },
  { type: 'custom', icon: '➕', name: '自訂問題', desc: '新增單項自訂問題' },
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
    { id: 'demo_header', type: 'section-header', title: '基本資料', label: '基本資料', required: false },
    { id: 'demo_gender', type: 'radio', label: '性別', required: true, options: ['男', '女', '其他'] },
    { id: 'demo_age', type: 'radio', label: '年齡層', required: true, options: ['18歲以下', '18-25歲', '26-35歲', '36-45歲', '46歲以上'] },
    { id: 'demo_first_visit', type: 'radio', label: '是否第一次來本店', required: true, options: ['是', '否'] },
    { id: 'demo_meal_time', type: 'radio', label: '用餐時段', required: false, options: ['早餐', '午餐', '下午茶', '晚餐', '宵夜'] },
  ];
}

function generateImpressionQuestions(): Question[] {
  return [
    { id: 'impression_header', type: 'section-header', title: '整體印象', label: '整體印象', required: false },
    { id: 'impression_first', type: 'rating', label: '第一眼印象評分', required: true, min: 1, max: 5 },
    { id: 'impression_plating', type: 'rating', label: '擺盤精緻度', required: true, min: 1, max: 5 },
    { id: 'impression_portion', type: 'radio', label: '份量感受', required: false, options: ['剛好', '稍微偏少', '太多（適合分享）'] },
  ];
}

function generateDishQuestions(config: DishEvalConfig): Question[] {
  const questions: Question[] = [
    { id: 'dish_header', type: 'section-header', title: '菜品評鑒', label: '菜品評鑒', required: false },
  ];

  const aspectDefs: { key: keyof DishEvalConfig['aspects']; label: string; idSuffix: string }[] = [
    { key: 'appearance', label: '外觀賣相', idSuffix: 'appearance' },
    { key: 'aroma', label: '香氣', idSuffix: 'aroma' },
    { key: 'taste', label: '口味', idSuffix: 'taste' },
    { key: 'portion', label: '份量', idSuffix: 'portion' },
    { key: 'overall', label: '整體滿意度', idSuffix: 'overall' },
    { key: 'texture', label: '口感描述', idSuffix: 'texture' },
  ];

  config.dishes.forEach((dish, di) => {
    const dishName = dish.trim() || `菜品 ${di + 1}`;
    const photoUrl = config.dishPhotos?.[dishName];
    questions.push({
      id: `dish_${di}_header`,
      type: 'section-header',
      title: dishName,
      label: dishName,
      description: `請評價「${dishName}」`,
      dishPhotoUrl: photoUrl,
      required: false,
    });

    aspectDefs.forEach(({ key, label, idSuffix }) => {
      if (!config.aspects[key]) return;
      questions.push({
        id: `dish_${di}_${idSuffix}`,
        type: 'radio-with-reason',
        label: `${label}`,
        required: true,
        options: ['非常滿意', '滿意', '普通', '不太滿意', '不滿意'],
        showReason: true,
        reasonPlaceholder: '請說明原因',
        dishName,
      });
    });

    if (config.aspects.custom && config.customAspectLabel.trim()) {
      questions.push({
        id: `dish_${di}_custom`,
        type: 'radio-with-reason',
        label: config.customAspectLabel.trim(),
        required: false,
        options: ['非常滿意', '滿意', '普通', '不太滿意', '不滿意'],
        showReason: true,
        reasonPlaceholder: '請說明原因',
        dishName,
      });
    }
  });

  return questions;
}

function generateMarketQuestions(): Question[] {
  return [
    { id: 'market_header', type: 'section-header', title: '市場定價與推薦', label: '市場定價與推薦', required: false },
    { id: 'market_best_dish', type: 'text', label: '最印象深刻的是哪一道？', required: false, placeholder: '請輸入菜名' },
    { id: 'market_price', type: 'number', label: '合理的定價建議（NT$）', required: false, placeholder: '輸入金額' },
    { id: 'market_repurchase', type: 'rating', label: '回購意願', required: true, min: 1, max: 5 },
    { id: 'market_nps', type: 'emoji-rating', label: '您會推薦本餐廳給親友嗎？', required: true, min: 1, max: 5 },
    { id: 'market_occasion', type: 'checkbox', label: '最適合的消費情境', required: false, options: ['朋友聚餐下酒', '約會慶祝', '家庭聚會', '商務宴客', '獨自用餐'] },
  ];
}

function generateFeedbackQuestions(): Question[] {
  return [
    { id: 'feedback_header', type: 'section-header', title: '開放回饋', label: '開放回饋', required: false },
    { id: 'feedback_chef', type: 'textarea', label: '給主廚/老闆的惄惄話', required: false, placeholder: '如果可以調整一個細節讓這道菜更完美，您的建議是？' },
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
        base.reasonPlaceholder = '請說明原因';
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

  // AI survey upload
  const [surveyUploading, setSurveyUploading] = useState(false);
  const [surveyParsed, setSurveyParsed] = useState<{ title: string; questions: Question[]; notes?: string; suggestedTemplate?: string } | null>(null);
  const [surveyUploadError, setSurveyUploadError] = useState('');

  // Step 2: Title + Blocks
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<SurveyBlock[]>([]);
  const [showBlockPicker, setShowBlockPicker] = useState(false);

  // Step 3: Discount
  const [discountEnabled, setDiscountEnabled] = useState(true);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'freebie' | 'custom_text'>('percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [discountExpiryDays, setDiscountExpiryDays] = useState(7);
  const [discountMode, setDiscountMode] = useState<'basic' | 'advanced'>('basic');
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([
    { name: '銅牌', emoji: '🥉', min_xp: 0, max_xp: 50, discount_type: 'percentage', discount_value: '95折' },
    { name: '銀牌', emoji: '🥈', min_xp: 51, max_xp: 120, discount_type: 'percentage', discount_value: '9折' },
    { name: '金牌', emoji: '🥇', min_xp: 121, max_xp: 200, discount_type: 'percentage', discount_value: '85折' },
    { name: '鑽石', emoji: '💎', min_xp: 201, max_xp: null, discount_type: 'freebie', discount_value: '免費甜點' },
  ]);

  // ---------------------------------------------------------------------------
  // Import dishes from menu
  // ---------------------------------------------------------------------------
  const [loadingDishes, setLoadingDishes] = useState(false);
  const [storeDishes, setStoreDishes] = useState<Array<{ name: string; category: string; photo_url?: string | null }>>([]);

  const fetchStoreDishes = useCallback(async () => {
    if (storeDishes.length > 0) return storeDishes;
    setLoadingDishes(true);
    try {
      const res = await fetch('/api/dishes');
      if (res.ok) {
        const data = await res.json();
        setStoreDishes(data);
        return data;
      }
    } catch { /* ignore */ }
    finally { setLoadingDishes(false); }
    return [];
  }, [storeDishes]);

  const importDishesToBlock = useCallback(async (blockId: string) => {
    const dishes = await fetchStoreDishes();
    if (dishes.length === 0) return;
    const dishNames = dishes.map((d: { name: string }) => d.name);
    const dishPhotos: Record<string, string> = {};
    for (const d of dishes) {
      if (d.photo_url) dishPhotos[d.name] = d.photo_url;
    }
    const block = blocks.find(b => b.id === blockId);
    if (!block?.dishConfig) return;
    updateBlock(blockId, {
      dishConfig: { ...block.dishConfig, dishes: dishNames, dishPhotos },
    });
  }, [fetchStoreDishes, blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // AI survey upload
  // ---------------------------------------------------------------------------
  // Convert PDF pages to images using pdf.js in browser
  async function pdfToImages(file: File): Promise<Blob[]> {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: Blob[] = [];
    const maxPages = Math.min(pdf.numPages, 3); // Max 3 pages

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const scale = 1.2; // Balance between quality and size
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (page as any).render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.7); // JPEG, 70% quality = much smaller
      });
      images.push(blob);
    }
    return images;
  }

  async function handleSurveyUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSurveyUploading(true);
    setSurveyParsed(null);
    setSurveyUploadError('');

    try {
      const formData = new FormData();
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        // Convert PDF to images first
        const images = await pdfToImages(file);
        images.forEach((img, i) => {
          formData.append(`image${i}`, img, `page_${i + 1}.png`);
        });
      } else {
        // Direct image upload
        formData.append('image0', file);
      }

      const res = await fetch('/api/ai/parse-survey', {
        method: 'POST',
        body: formData,
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('伺服器回傳異常，請重試');
      }

      if (!res.ok) throw new Error(data.error || '解析失敗');
      if (!data.questions || data.questions.length === 0) throw new Error('未辨識到任何問題，請換一份更清晰的文件');

      setSurveyParsed(data);

      // Auto-select suggested template
      if (data.suggestedTemplate && !selectedTemplate) {
        const validTemplates: TemplateId[] = ['fine-dining', 'japanese', 'industrial', 'cafe', 'chinese-classic', 'ocean', 'night-market', 'dessert', 'korean', 'bistro'];
        if (validTemplates.includes(data.suggestedTemplate as TemplateId)) {
          setSelectedTemplate(data.suggestedTemplate as TemplateId);
        }
      }
    } catch (err) {
      setSurveyUploadError(err instanceof Error ? err.message : '解析失敗，請重試');
    } finally {
      setSurveyUploading(false);
      e.target.value = '';
    }
  }

  function applySurveyParsed() {
    if (!surveyParsed) return;

    // Set title
    if (surveyParsed.title) setTitle(surveyParsed.title);

    // Convert parsed questions into a custom block
    const customQuestions: CustomQuestionItem[] = surveyParsed.questions
      .filter(q => q.type !== 'section-header')
      .map((q, i) => ({
        id: q.id || `imported_${i}`,
        type: q.type as Question['type'],
        label: q.label || '',
        required: q.required ?? true,
        options: q.options,
        min: q.min,
        max: q.max,
        placeholder: q.placeholder,
      }));

    if (customQuestions.length > 0) {
      const newBlock: SurveyBlock = {
        id: nextBlockId(),
        type: 'custom',
        customQuestions,
      };
      setBlocks(prev => [...prev, newBlock]);
    }

    setSurveyParsed(null);

    // Auto-select template if not selected
    if (!selectedTemplate) {
      setSelectedTemplate('fine-dining');
    }

    // Jump to step 2
    setStep(2);
  }

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
        discount_mode: discountMode,
        discount_type: discountType,
        discount_value: discountValue,
        discount_expiry_days: discountExpiryDays,
        discount_tiers: discountMode === 'advanced' ? discountTiers : null,
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
          {/* AI Survey Upload */}
          <div className="mb-8 bg-gradient-to-r from-[#FF8C00]/5 to-[#FF6B00]/5 rounded-2xl border border-[#FF8C00]/20 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8C00] to-[#FF6B00] flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#3A3A3A] mb-1">已有現成問卷？</h3>
                <p className="text-xs text-[#8A8585] mb-3">
                  上傳你的 PDF、圖片或 Word 問卷，副店長會自動幫你把問題轉換成 FeedBites 格式！
                </p>

                {surveyUploadError && (
                  <div className="mb-3 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 flex items-start gap-2">
                    <span className="shrink-0">⚠️</span>
                    <div>
                      <p className="font-medium">{surveyUploadError}</p>
                      <button
                        onClick={() => { setSurveyUploadError(''); }}
                        className="text-red-400 hover:text-red-600 mt-1 underline"
                      >
                        重新上傳
                      </button>
                    </div>
                  </div>
                )}

                {surveyUploading ? (
                  <SurveyUploadProgress />
                ) : surveyParsed ? (
                  <div>
                    <div className="bg-white rounded-xl border border-[#FF8C00]/20 p-4 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-[#FF8C00]" />
                        <span className="text-sm font-bold text-[#3A3A3A]">{surveyParsed.title || '問卷'}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-[#FF8C00]/10 text-[#FF8C00] rounded-full">
                          {surveyParsed.questions.filter(q => q.type !== 'section-header').length} 題
                        </span>
                      </div>
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {surveyParsed.questions.filter(q => q.type !== 'section-header').map((q, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-[#8A8585]">
                            <span className="w-5 h-5 rounded bg-[#FAF7F2] flex items-center justify-center text-[10px] font-bold text-[#A08735] shrink-0">{i + 1}</span>
                            <span className="truncate">{q.label}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#FAF7F2] text-[#A08735] rounded shrink-0">{
                              ({ 'emoji-rating': '表情評分', 'rating': '星級評分', 'radio': '單選', 'checkbox': '多選', 'text': '簡答', 'textarea': '長文回饋', 'number': '數字', 'radio-with-reason': '單選+原因', 'rating-with-reason': '評分+原因', 'section-header': '分隔', 'dish-group': '菜品評分' } as Record<string, string>)[q.type] || q.type
                            }</span>
                          </div>
                        ))}
                      </div>
                      {surveyParsed.notes && (
                        <p className="text-[10px] text-[#8A8585] mt-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#FF8C00]" />
                          {surveyParsed.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={applySurveyParsed}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF8C00] to-[#FF6B00] text-white rounded-full text-sm font-bold hover:shadow-lg hover:shadow-[#FF8C00]/20 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        套用到問卷
                      </button>
                      <button
                        onClick={() => setSurveyParsed(null)}
                        className="px-4 py-2.5 text-[#8A8585] text-sm hover:text-[#3A3A3A] transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-[#FF8C00]/30 text-[#FF8C00] rounded-full text-sm font-medium cursor-pointer hover:bg-[#FF8C00]/5 hover:border-[#FF8C00] transition-all">
                    <Upload className="w-4 h-4" />
                    上傳現有問卷
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleSurveyUpload}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

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
                      已選擇
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
          <h2 className="text-lg font-bold text-[#3A3A3A] font-serif mb-2">設定問卷內容</h2>
          <p className="text-sm text-[#8A8585] mb-6">設定標題並組合問卷區塊</p>

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

          {/* Two-column layout on larger screens */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: current blocks */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-[#3A3A3A]">問卷結構</label>
                <span className="text-xs text-[#8A8585]">{allQuestions.filter((q) => q.type !== 'section-header').length} 題</span>
              </div>

              {blocks.length === 0 && (
                <div className="border-2 border-dashed border-[#E8E2D8] rounded-2xl p-8 text-center text-[#8A8585]">
                  <p className="text-sm mb-2">尚未新增任何區塊</p>
                  <p className="text-xs">點擊右側「新增區塊」來組合問卷內容</p>
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
                          title="上移"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveBlock(index, 1)}
                          disabled={index === blocks.length - 1}
                          className="p-1 text-[#8A8585] hover:text-[#C5A55A] disabled:opacity-30 transition-colors"
                          title="下移"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="p-1 text-[#8A8585] hover:text-red-500 transition-colors"
                          title="移除區塊"
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
                          <p>✓ 性別、年齡層、是否第一次來店</p>
                          <p className="text-[10px]">以上為預設問題，無需額外設定</p>
                        </div>
                      )}

                      {/* Impression preview */}
                      {block.type === 'impression' && (
                        <div className="space-y-1 text-xs text-[#8A8585]">
                          <p>✓ 第一眼印象評分、擺盤精緻度、份量感受</p>
                          <p className="text-[10px]">以上為預設問題，無需額外設定</p>
                        </div>
                      )}

                      {/* Market preview */}
                      {block.type === 'market' && (
                        <div className="space-y-1 text-xs text-[#8A8585]">
                          <p>✓ 最印象深刻菜色、定價建議、回購意願、消費情境</p>
                          <p className="text-[10px]">以上為預設問題，無需額外設定</p>
                        </div>
                      )}

                      {/* Feedback preview */}
                      {block.type === 'feedback' && (
                        <div className="space-y-1 text-xs text-[#8A8585]">
                          <p>✓ 給主廚/老闆的自由文字回饋</p>
                          <p className="text-[10px]">以上為預設問題，無需額外設定</p>
                        </div>
                      )}

                      {/* Dish evaluation config */}
                      {block.type === 'dish-evaluation' && block.dishConfig && (
                        <div className="space-y-3">
                          {/* Dish list */}
                          <div className="space-y-2">
                            {block.dishConfig.dishes.map((dish, di) => (
                              <div key={di} className="flex items-center gap-2">
                                <span className="text-xs text-[#8A8585] shrink-0 w-16">菜品 {di + 1}:</span>
                                <input
                                  type="text"
                                  value={dish}
                                  onChange={(e) => updateDish(block.id, di, e.target.value)}
                                  placeholder="輸入菜名..."
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
                            <div className="flex items-center gap-3 ml-16">
                              <button
                                onClick={() => addDish(block.id)}
                                className="flex items-center gap-1 text-xs text-[#C5A55A] hover:text-[#A08735] transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                手動新增
                              </button>
                              <button
                                onClick={() => importDishesToBlock(block.id)}
                                disabled={loadingDishes}
                                className="flex items-center gap-1 text-xs text-[#FF8C00] hover:text-[#E07800] transition-colors font-medium disabled:opacity-50"
                              >
                                {loadingDishes ? '載入中...' : '📋 從菜單匯入'}
                              </button>
                            </div>
                          </div>

                          {/* Aspect toggles */}
                          <div className="pt-3 border-t border-[#E8E2D8]">
                            <p className="text-xs text-[#8A8585] mb-2">每道菜自動包含：</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                              {([
                                ['appearance', '外觀賣相'],
                                ['aroma', '香氣'],
                                ['taste', '口味'],
                                ['portion', '份量'],
                                ['overall', '整體滿意度'],
                                ['texture', '口感描述'],
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
                                特殊問題(自訂)
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
                                placeholder="自訂問題標題..."
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
                                  placeholder="輸入問題..."
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
                                    <option value="emoji-rating">表情評分</option>
                                    <option value="rating">星級評分</option>
                                    <option value="radio">單選</option>
                                    <option value="checkbox">多選</option>
                                    <option value="radio-with-reason">單選+原因</option>
                                    <option value="rating-with-reason">評分+原因</option>
                                    <option value="text">簡答</option>
                                    <option value="textarea">長答</option>
                                    <option value="number">數字</option>
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
                                    必填
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
                                    placeholder="選項（用逗號分隔）"
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
                            + 新增問題
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
                + 新增區塊
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
                          {alreadyAdded && <span className="text-xs text-[#8A8585] ml-2">已新增</span>}
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
              <label className="block text-sm font-medium text-[#3A3A3A] mb-3">新增區塊</label>
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
                          {alreadyAdded && <span className="text-xs text-[#8A8585] ml-1">✓</span>}
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
              {/* Mode selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#3A3A3A] mb-3">獎勵模式</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setDiscountMode('basic')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${discountMode === 'basic' ? 'border-[#C5A55A] bg-[#C5A55A]/5' : 'border-[#E8E2D8] hover:border-[#C5A55A]/50'}`}>
                    <div className="text-2xl mb-2">🎁</div>
                    <div className="font-bold text-sm text-[#3A3A3A]">基本款</div>
                    <div className="text-xs text-[#8A8585] mt-1">單一折扣，簡單設定<br/>適合小店家快速上手</div>
                  </button>
                  <button onClick={() => setDiscountMode('advanced')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${discountMode === 'advanced' ? 'border-[#C5A55A] bg-[#C5A55A]/5' : 'border-[#E8E2D8] hover:border-[#C5A55A]/50'}`}>
                    <div className="text-2xl mb-2">🏆</div>
                    <div className="font-bold text-sm text-[#3A3A3A]">進階款</div>
                    <div className="text-xs text-[#8A8585] mt-1">依填答積分分級獎勵<br/>鼓勵顧客認真作答</div>
                  </button>
                </div>
              </div>

              {/* Basic mode: existing discount settings */}
              {discountMode === 'basic' && (<>
              <div className="bg-white rounded-xl border border-[#E8E2D8] p-5">
                <label className="block text-sm font-medium text-[#3A3A3A] mb-3">折扣類型</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'percentage', label: '百分比折扣', desc: '例如：打9折' },
                    { value: 'fixed', label: '固定金額', desc: '例如：扲50元' },
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
              </>)}

              {/* Advanced mode: tier editor */}
              {discountMode === 'advanced' && (
              <div className="space-y-4">
                <p className="text-xs text-[#8A8585]">顧客填答問卷會獲得 XP 積分，積分越高獎勵越好！</p>

                {discountTiers.map((tier, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[#E8E2D8] bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{tier.emoji}</span>
                        <input
                          value={tier.name}
                          onChange={e => {
                            const next = [...discountTiers];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setDiscountTiers(next);
                          }}
                          className="font-bold text-sm text-[#3A3A3A] bg-transparent border-b border-dashed border-[#E8E2D8] focus:border-[#C5A55A] outline-none w-20"
                        />
                      </div>
                      {discountTiers.length > 1 && (
                        <button onClick={() => setDiscountTiers(prev => prev.filter((_, i) => i !== idx))}
                          className="text-xs text-red-400 hover:text-red-600">刪除</button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-[#8A8585]">最低 XP</label>
                        <input type="number" value={tier.min_xp}
                          onChange={e => {
                            const next = [...discountTiers];
                            next[idx] = { ...next[idx], min_xp: Number(e.target.value) };
                            setDiscountTiers(next);
                          }}
                          className="w-full mt-1 px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#8A8585]">獎勵內容</label>
                        <input value={tier.discount_value}
                          onChange={e => {
                            const next = [...discountTiers];
                            next[idx] = { ...next[idx], discount_value: e.target.value };
                            setDiscountTiers(next);
                          }}
                          placeholder="例：9折、免費甜點"
                          className="w-full mt-1 px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-[#8A8585]">獎勵類型</label>
                      <select value={tier.discount_type}
                        onChange={e => {
                          const next = [...discountTiers];
                          next[idx] = { ...next[idx], discount_type: e.target.value as 'percentage' | 'fixed' | 'freebie' | 'custom_text' };
                          setDiscountTiers(next);
                        }}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] bg-white">
                        <option value="percentage">百分比折扣</option>
                        <option value="fixed">固定金額</option>
                        <option value="freebie">免費贈品</option>
                        <option value="custom_text">自訂文字</option>
                      </select>
                    </div>
                  </div>
                ))}

                <button onClick={() => setDiscountTiers(prev => [...prev, {
                  name: `等級${prev.length + 1}`,
                  emoji: '⭐',
                  min_xp: (prev[prev.length - 1]?.max_xp || 200) + 1,
                  max_xp: null,
                  discount_type: 'percentage',
                  discount_value: '',
                }])}
                  className="w-full py-2 rounded-xl border border-dashed border-[#C5A55A] text-[#C5A55A] text-sm hover:bg-[#C5A55A]/5 transition-colors">
                  + 新增等級
                </button>

                <div>
                  <label className="text-xs text-[#8A8585]">折扣碼有效天數</label>
                  <input type="number" value={discountExpiryDays}
                    onChange={e => setDiscountExpiryDays(Number(e.target.value) || 30)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A]"
                  />
                </div>
              </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* Step 4: Preview                                                    */}
      {/* ================================================================== */}
      {step === 4 && (
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-[#3A3A3A] font-serif mb-2">預覽確認</h2>
          <p className="text-sm text-[#8A8585] mb-6">確認設定無誤後發布問卷</p>

          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
              <h3 className="font-bold text-lg text-[#3A3A3A] mb-4">{title}</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[#E8E2D8]">
                  <span className="text-sm text-[#8A8585]">視覺模板</span>
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
                  <span className="text-sm text-[#8A8585]">區塊數量</span>
                  <span className="text-sm text-[#3A3A3A] font-medium">{blocks.length} 個區塊</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#E8E2D8]">
                  <span className="text-sm text-[#8A8585]">問題數量</span>
                  <span className="text-sm text-[#3A3A3A] font-medium">
                    {allQuestions.filter((q) => q.type !== 'section-header').length} 題
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#E8E2D8]">
                  <span className="text-sm text-[#8A8585]">折扣獎勵</span>
                  <span className="text-sm text-[#3A3A3A] font-medium">
                    {discountEnabled ? (
                      discountMode === 'advanced' ? (
                        <>
                          進階款（{discountTiers.length} 個等級）
                          <span className="text-xs text-[#8A8585] ml-2">（{discountExpiryDays} 天有效）</span>
                        </>
                      ) : (
                        <>
                          {discountType === 'percentage' && `${discountValue}% 折扣`}
                          {discountType === 'fixed' && `NT$${discountValue} 折扣`}
                          {discountType === 'freebie' && discountValue}
                          {discountType === 'custom_text' && discountValue}
                          <span className="text-xs text-[#8A8585] ml-2">（{discountExpiryDays} 天有效）</span>
                        </>
                      )
                    ) : (
                      '未啟用'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Advanced tier preview */}
            {discountEnabled && discountMode === 'advanced' && (
              <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
                <h4 className="font-bold text-sm text-[#3A3A3A] mb-3">獎勵等級一覽</h4>
                <div className="space-y-2">
                  {discountTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 px-3 bg-[#FAF7F2] rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{tier.emoji}</span>
                        <span className="text-sm font-medium text-[#3A3A3A]">{tier.name}</span>
                      </div>
                      <div className="text-xs text-[#8A8585]">
                        {tier.min_xp} ~ {tier.max_xp ?? '∞'} XP → <span className="text-[#3A3A3A] font-medium">{tier.discount_value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Block structure preview */}
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
              <h4 className="font-bold text-sm text-[#3A3A3A] mb-3">區塊結構</h4>
              <div className="space-y-2">
                {blocks.map((block) => (
                  <div key={block.id} className="flex items-center gap-2 py-1.5 px-3 bg-[#FAF7F2] rounded-lg">
                    <span className="text-base">{blockIcon(block.type)}</span>
                    <span className="text-sm text-[#3A3A3A] font-medium">{blockLabel(block.type)}</span>
                    {block.type === 'dish-evaluation' && block.dishConfig && (
                      <span className="text-xs text-[#8A8585] ml-auto">
                        {block.dishConfig.dishes.filter((d) => d.trim()).length} 道菜
                      </span>
                    )}
                    {block.type === 'custom' && block.customQuestions && (
                      <span className="text-xs text-[#8A8585] ml-auto">
                        {block.customQuestions.filter((q) => q.label.trim()).length} 題
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Questions Preview */}
            <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6">
              <h4 className="font-bold text-sm text-[#3A3A3A] mb-3">問題清單</h4>
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
                          {({ 'emoji-rating': '表情評分', 'rating': '星級評分', 'radio': '單選', 'checkbox': '多選', 'text': '簡答', 'textarea': '長文回饋', 'number': '數字', 'radio-with-reason': '單選+原因', 'rating-with-reason': '評分+原因', 'dish-group': '菜品評分' } as Record<string, string>)[q.type] || q.type}
                        </span>
                        {q.required && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded-full shrink-0">
                            必填
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
