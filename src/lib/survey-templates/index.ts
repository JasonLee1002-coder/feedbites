import type { SurveyTemplate } from '@/types/survey';

export const surveyTemplates: SurveyTemplate[] = [
  {
    id: 'new-product-tasting',
    name: '新品試吃回饋',
    description: '適用於新菜色試吃活動，細項評鑑每道菜的口感、香氣、份量',
    category: '新品開發',
    questions: [
      { id: 'name', type: 'text', label: '姓名', required: false, placeholder: '可不填，匿名亦可', section: '基本資料' },
      { id: 'gender', type: 'radio', label: '性別', required: true, options: ['男', '女'], section: '基本資料' },
      { id: 'age', type: 'radio', label: '年齡層', required: true, options: ['18歲以下', '18-25歲', '26-35歲', '36-45歲', '46歲以上'], section: '基本資料' },
      { id: 'first_visit', type: 'radio', label: '是否第一次來本店', required: true, options: ['是', '否'], section: '基本資料' },
      { id: 'first_impression', type: 'rating', label: '第一眼印象評分', required: true, min: 1, max: 5, section: '整體視覺印象' },
      { id: 'plating', type: 'rating', label: '擺盤精緻度', required: true, min: 1, max: 5, section: '整體視覺印象' },
      { id: 'portion_feel', type: 'radio', label: '份量感受', required: false, options: ['剛好', '稍微偏少', '太多（適合分享）'], section: '整體視覺印象' },
      { id: 'dish_taste', type: 'emoji-rating', label: '這道菜的口味', required: true, min: 1, max: 5, section: '菜品評鑑' },
      { id: 'dish_aroma', type: 'emoji-rating', label: '香氣', required: true, min: 1, max: 5, section: '菜品評鑑' },
      { id: 'dish_look', type: 'radio', label: '外觀賣相', required: false, options: ['非常加分', '普通', '不太搭'], section: '菜品評鑑' },
      { id: 'dish_overall', type: 'emoji-rating', label: '整體滿意度', required: true, min: 1, max: 5, section: '菜品評鑑' },
      { id: 'most_impressed', type: 'text', label: '最印象深刻的是哪一道？', required: false, placeholder: '請輸入菜名', section: '市場回饋' },
      { id: 'price_suggest', type: 'number', label: '合理的定價建議（NT$）', required: false, placeholder: '輸入金額', section: '市場回饋' },
      { id: 'repurchase', type: 'rating', label: '回購意願', required: true, min: 1, max: 5, section: '市場回饋' },
      { id: 'occasion', type: 'checkbox', label: '最適合的消費情境', required: false, options: ['朋友聚餐下酒', '約會慶祝', '家庭聚會'], section: '市場回饋' },
      { id: 'chef_message', type: 'textarea', label: '給主廚的悄悄話', required: false, placeholder: '如果可以調整一個細節讓這道菜更完美，您的建議是？', section: '給主廚的話' },
    ],
  },
  {
    id: 'daily-satisfaction',
    name: '日常用餐滿意度',
    description: '日常營業使用，快速收集用餐整體滿意度',
    category: '日常營運',
    questions: [
      { id: 'name', type: 'text', label: '姓名', required: false, placeholder: '可不填，匿名亦可', section: '基本資料' },
      { id: 'visit_freq', type: 'radio', label: '來店頻率', required: false, options: ['第一次', '偶爾', '每月1-2次', '每週常客'], section: '基本資料' },
      { id: 'food_quality', type: 'emoji-rating', label: '餐點品質', required: true, min: 1, max: 5, section: '用餐評價' },
      { id: 'service', type: 'emoji-rating', label: '服務態度', required: true, min: 1, max: 5, section: '用餐評價' },
      { id: 'environment', type: 'emoji-rating', label: '用餐環境', required: true, min: 1, max: 5, section: '用餐評價' },
      { id: 'speed', type: 'emoji-rating', label: '出餐速度', required: true, min: 1, max: 5, section: '用餐評價' },
      { id: 'value', type: 'emoji-rating', label: '性價比', required: true, min: 1, max: 5, section: '用餐評價' },
      { id: 'overall', type: 'emoji-rating', label: '整體滿意度', required: true, min: 1, max: 5, section: '用餐評價' },
      { id: 'favorite_dish', type: 'text', label: '今天最喜歡的菜', required: false, placeholder: '請輸入菜名', section: '其他' },
      { id: 'recommend', type: 'radio', label: '會推薦朋友來嗎？', required: true, options: ['一定會', '可能會', '不太會'], section: '其他' },
      { id: 'feedback', type: 'textarea', label: '其他建議', required: false, placeholder: '任何想告訴我們的話...', section: '其他' },
    ],
  },
  {
    id: 'bar-tasting',
    name: '酒吧品飲評鑑',
    description: '適用於酒吧、調酒吧，評鑑飲品與氛圍',
    category: '酒吧',
    questions: [
      { id: 'name', type: 'text', label: '姓名', required: false, placeholder: '可不填', section: '基本資料' },
      { id: 'age_check', type: 'radio', label: '已滿18歲', required: true, options: ['是'], section: '基本資料' },
      { id: 'drink_taste', type: 'emoji-rating', label: '飲品口味', required: true, min: 1, max: 5, section: '品飲評鑑' },
      { id: 'drink_look', type: 'emoji-rating', label: '飲品視覺', required: true, min: 1, max: 5, section: '品飲評鑑' },
      { id: 'creativity', type: 'emoji-rating', label: '創意程度', required: true, min: 1, max: 5, section: '品飲評鑑' },
      { id: 'atmosphere', type: 'emoji-rating', label: '店內氛圍', required: true, min: 1, max: 5, section: '氛圍評價' },
      { id: 'music', type: 'emoji-rating', label: '音樂選曲', required: true, min: 1, max: 5, section: '氛圍評價' },
      { id: 'bartender', type: 'emoji-rating', label: '調酒師服務', required: true, min: 1, max: 5, section: '氛圍評價' },
      { id: 'fav_drink', type: 'text', label: '今晚最愛的一杯', required: false, placeholder: '飲品名稱', section: '推薦' },
      { id: 'comeback', type: 'radio', label: '會再來嗎？', required: true, options: ['一定會', '看心情', '不太會'], section: '推薦' },
      { id: 'message', type: 'textarea', label: '想對調酒師說的話', required: false, placeholder: '寫下你的感受...', section: '推薦' },
    ],
  },
  {
    id: 'new-product-tasting-v2',
    name: '新品試吃評鑑 V2（TACB 格式）',
    description: '進階版新品試吃評鑑，支援逐品細項評鑑、原因追問、人口統計',
    category: '新品開發',
    questions: [
      // Section 1 - 基本資料
      { id: 'sec1_header', type: 'section-header', title: '基本資料', description: '請填寫您的基本資訊', required: false, section: '基本資料' },
      { id: 'gender', type: 'radio', label: '性別', required: true, options: ['男', '女'], section: '基本資料' },
      { id: 'age', type: 'radio', label: '年齡層', required: true, options: ['18歲以下', '18-25歲', '26-35歲', '36-45歲', '46歲以上'], section: '基本資料' },
      { id: 'first_visit', type: 'radio', label: '是否第一次來本店', required: true, options: ['是', '否'], section: '基本資料' },

      // Section 2 - 整體視覺印象
      { id: 'sec2_header', type: 'section-header', title: '整體視覺印象', description: '請對整體呈現做初步評分', required: false, section: '整體視覺印象' },
      { id: 'first_impression', type: 'rating', label: '第一眼印象評分', required: true, min: 1, max: 5, section: '整體視覺印象' },
      { id: 'plating', type: 'rating', label: '擺盤精緻度', required: true, min: 1, max: 5, section: '整體視覺印象' },
      { id: 'portion_feel', type: 'radio', label: '份量感受', required: false, options: ['剛好', '稍微偏少', '太多'], section: '整體視覺印象' },

      // Section 3 - 單品細項評鑑
      { id: 'sec3_header', type: 'section-header', title: '單品細項評鑑', description: '以下為逐品評鑑區，店家可依實際菜品自行增減', required: false, section: '單品細項評鑑' },
      {
        id: 'dish_demo',
        type: 'dish-group',
        dishName: '示範菜品',
        label: '示範菜品',
        description: '此為範例，請店家替換為實際菜名',
        required: false,
        section: '單品細項評鑑',
        subQuestions: [
          { id: 'look', type: 'radio-with-reason', label: '外觀賣相', required: false, options: ['非常加分', '普通', '不太搭'], reasonPlaceholder: '外觀方面的原因（選填）' },
          { id: 'aroma', type: 'radio-with-reason', label: '香氣', required: false, options: ['非常滿意', '滿意', '普通', '不滿意', '非常不滿意'], reasonPlaceholder: '香氣方面的原因（選填）' },
          { id: 'taste', type: 'radio-with-reason', label: '口味', required: true, options: ['非常滿意', '滿意', '普通', '不滿意', '非常不滿意'], reasonPlaceholder: '口味方面的原因（選填）' },
          { id: 'portion', type: 'radio-with-reason', label: '份量', required: false, options: ['太多', '剛好', '普通', '稍少', '太少'], reasonPlaceholder: '份量方面的原因（選填）' },
          { id: 'overall', type: 'radio-with-reason', label: '整體滿意度', required: true, options: ['非常滿意', '滿意', '普通', '不滿意', '非常不滿意'], reasonPlaceholder: '整體原因（選填）' },
        ],
      },

      // Section 4 - 市場競爭力
      { id: 'sec4_header', type: 'section-header', title: '市場競爭力', description: '請提供市場面的回饋', required: false, section: '市場競爭力' },
      { id: 'most_impressed', type: 'text', label: '最印象深刻的是哪一道？', required: false, placeholder: '請輸入菜名', section: '市場競爭力' },
      { id: 'price_suggest', type: 'number', label: '合理的定價建議', required: false, placeholder: 'NT$', section: '市場競爭力' },
      { id: 'repurchase', type: 'rating', label: '回購意願', required: true, min: 1, max: 5, section: '市場競爭力' },
      { id: 'occasion', type: 'checkbox', label: '最適合的消費情境', required: false, options: ['朋友聚餐下酒', '約會慶祝', '家庭聚會'], section: '市場競爭力' },

      // Section 5 - 給主廚的悄悄話
      { id: 'sec5_header', type: 'section-header', title: '給主廚的悄悄話', required: false, section: '給主廚的悄悄話' },
      { id: 'chef_message', type: 'textarea', label: '給主廚的悄悄話', required: false, placeholder: '如果可以調整一個細節讓這道菜更完美，您的建議是？', section: '給主廚的悄悄話' },
    ],
  },
];

export function getSurveyTemplate(id: string): SurveyTemplate | undefined {
  return surveyTemplates.find(t => t.id === id);
}
