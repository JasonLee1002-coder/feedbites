import type { SurveyTemplate } from '@/types/survey';

export const surveyTemplates: SurveyTemplate[] = [
  // ═══════════════════════════════════════════════════════════════
  // 1. 連鎖餐飲完整版（王品風格）
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'chain-full',
    name: '連鎖餐飲完整版',
    description: '對標王品集團，完整消費體驗調查：來客分析 + 餐點逐項評分 + 服務環境 + 回訪意願 + 人口統計',
    category: '連鎖品牌',
    questions: [
      { id: 'sec_welcome', type: 'section-header', title: '消費體驗調查', description: '您的建議是我們前進的動力，感謝您花幾分鐘填寫！', required: false, section: '歡迎' },
      { id: 'first_visit', type: 'radio', label: '您是第一次來本店消費嗎？', required: true, options: ['是', '不是'], section: '來客分析' },
      { id: 'how_know', type: 'checkbox', label: '您如何得知本店？', required: false, options: ['網路搜尋', '親友介紹', '社群媒體', '路過發現', '美食平台', '廣告傳單', '其他'], section: '來客分析' },
      { id: 'purpose', type: 'radio', label: '您今天用餐的目的？', required: true, options: ['日常用餐', '聚餐', '慶祝（紀念日/節慶）', '慶生', '約會', '洽談公事', '其他'], section: '來客分析' },
      { id: 'companion', type: 'radio', label: '您今天跟誰一起用餐？', required: true, options: ['朋友', '家人', '同事', '自己一人', '情人/伴侶', '客戶/商務'], section: '來客分析' },

      { id: 'sec_food', type: 'section-header', title: '餐點滿意度', description: '請根據今天的用餐經驗，給星越多代表滿意度越高', required: false, section: '餐點評分' },
      { id: 'food_main', type: 'rating', label: '主餐', required: true, min: 1, max: 5, section: '餐點評分' },
      { id: 'food_side', type: 'rating', label: '配菜/小食', required: false, min: 1, max: 5, section: '餐點評分' },
      { id: 'food_soup', type: 'rating', label: '湯品', required: false, min: 1, max: 5, section: '餐點評分' },
      { id: 'food_dessert', type: 'rating', label: '甜點', required: false, min: 1, max: 5, section: '餐點評分' },
      { id: 'food_drink', type: 'rating', label: '飲料', required: false, min: 1, max: 5, section: '餐點評分' },

      { id: 'sec_service', type: 'section-header', title: '服務與環境', required: false, section: '服務環境' },
      { id: 'service', type: 'rating', label: '服務態度', required: true, min: 1, max: 5, section: '服務環境' },
      { id: 'speed', type: 'rating', label: '出餐速度', required: true, min: 1, max: 5, section: '服務環境' },
      { id: 'clean', type: 'rating', label: '環境整潔', required: true, min: 1, max: 5, section: '服務環境' },
      { id: 'overall', type: 'rating', label: '整體評價', required: true, min: 1, max: 5, section: '服務環境' },

      { id: 'sec_loyalty', type: 'section-header', title: '回饋與建議', required: false, section: '回饋' },
      { id: 'attraction', type: 'checkbox', label: '本店最吸引您的是什麼？（可複選）', required: false, options: ['餐點好吃', '服務好', '價格合理', '環境氛圍', '交通方便', '其他'], section: '回饋' },
      { id: 'revisit', type: 'radio', label: '您是否願意再次來消費？', required: true, options: ['一定會', '可能會', '不確定', '不太會'], section: '回饋' },
      { id: 'recommend_friend', type: 'radio', label: '您會推薦親友來嗎？', required: true, options: ['一定會', '可能會', '不太會'], section: '回饋' },
      { id: 'feedback', type: 'textarea', label: '您對本店的鼓勵與建議', required: false, placeholder: '任何想告訴我們的話...', section: '回饋' },

      { id: 'sec_demo', type: 'section-header', title: '基本資料', description: '僅供統計分析，不會公開', required: false, section: '人口統計' },
      { id: 'gender', type: 'radio', label: '性別', required: false, options: ['男', '女', '不便透露'], section: '人口統計' },
      { id: 'age', type: 'radio', label: '年齡', required: false, options: ['19歲以下', '20-29歲', '30-39歲', '40-49歲', '50-59歲', '60歲以上'], section: '人口統計' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 2. 快速三分鐘
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'quick-3min',
    name: '快速三分鐘',
    description: '極簡 6 題，3 分鐘填完，追求最高回覆率。適合任何餐廳',
    category: '通用',
    questions: [
      { id: 'food', type: 'emoji-rating', label: '餐點好吃嗎？', required: true, min: 1, max: 5, section: '快速評分' },
      { id: 'service', type: 'emoji-rating', label: '服務滿意嗎？', required: true, min: 1, max: 5, section: '快速評分' },
      { id: 'overall', type: 'emoji-rating', label: '整體體驗如何？', required: true, min: 1, max: 5, section: '快速評分' },
      { id: 'best_dish', type: 'text', label: '今天最喜歡哪道菜？', required: false, placeholder: '菜名', section: '推薦' },
      { id: 'recommend', type: 'radio', label: '會推薦朋友來嗎？', required: true, options: ['一定會！', '應該會', '再看看'], section: '推薦' },
      { id: 'feedback', type: 'textarea', label: '還有什麼想說的？', required: false, placeholder: '任何建議都好...', section: '推薦' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 3. 咖啡廳
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'cafe-survey',
    name: '咖啡廳問卷',
    description: '咖啡品質 + 環境氛圍 + WiFi/插座 + 甜點輕食。適合獨立咖啡廳、連鎖咖啡',
    category: '咖啡廳',
    questions: [
      { id: 'visit_freq', type: 'radio', label: '您多久來一次？', required: true, options: ['第一次', '偶爾', '每週固定', '幾乎每天'], section: '基本' },
      { id: 'purpose', type: 'radio', label: '今天來的主要目的？', required: false, options: ['喝咖啡', '工作/讀書', '跟朋友聚', '吃甜點', '純休息'], section: '基本' },

      { id: 'sec_coffee', type: 'section-header', title: '咖啡評價', required: false, section: '咖啡' },
      { id: 'coffee_taste', type: 'emoji-rating', label: '咖啡風味', required: true, min: 1, max: 5, section: '咖啡' },
      { id: 'coffee_temp', type: 'radio', label: '溫度適中嗎？', required: false, options: ['太燙', '剛好', '偏涼'], section: '咖啡' },
      { id: 'latte_art', type: 'emoji-rating', label: '拉花/視覺', required: false, min: 1, max: 5, section: '咖啡' },

      { id: 'sec_env', type: 'section-header', title: '環境體驗', required: false, section: '環境' },
      { id: 'atmosphere', type: 'emoji-rating', label: '整體氛圍', required: true, min: 1, max: 5, section: '環境' },
      { id: 'music', type: 'emoji-rating', label: '音樂選曲', required: false, min: 1, max: 5, section: '環境' },
      { id: 'seat_comfort', type: 'emoji-rating', label: '座位舒適度', required: false, min: 1, max: 5, section: '環境' },
      { id: 'wifi_power', type: 'radio', label: 'WiFi/插座方便嗎？', required: false, options: ['很棒', '還行', '需要改善', '沒用到'], section: '環境' },
      { id: 'dessert', type: 'emoji-rating', label: '甜點/輕食', required: false, min: 1, max: 5, section: '環境' },

      { id: 'comeback', type: 'radio', label: '會再來嗎？', required: true, options: ['一定會', '可能會', '不太會'], section: '回饋' },
      { id: 'feedback', type: 'textarea', label: '想對我們說的話', required: false, placeholder: '任何建議...', section: '回饋' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. 火鍋/燒烤/吃到飽
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'hotpot-bbq',
    name: '火鍋 / 燒烤 / 吃到飽',
    description: '食材新鮮度 + 湯底/醬料 + 吃到飽 CP 值 + 桌邊服務。適合火鍋店、燒肉店',
    category: '火鍋燒烤',
    questions: [
      { id: 'first_visit', type: 'radio', label: '第一次來嗎？', required: true, options: ['是', '不是'], section: '基本' },
      { id: 'group_size', type: 'radio', label: '今天幾個人？', required: false, options: ['1-2人', '3-4人', '5-6人', '7人以上'], section: '基本' },

      { id: 'sec_food', type: 'section-header', title: '食材與風味', required: false, section: '食材評價' },
      { id: 'meat_fresh', type: 'emoji-rating', label: '肉品新鮮度', required: true, min: 1, max: 5, section: '食材評價' },
      { id: 'veggie_variety', type: 'emoji-rating', label: '蔬菜/配料多樣性', required: false, min: 1, max: 5, section: '食材評價' },
      { id: 'broth_sauce', type: 'emoji-rating', label: '湯底/醬料', required: true, min: 1, max: 5, section: '食材評價' },
      { id: 'side_dishes', type: 'emoji-rating', label: '副食/甜點/飲料', required: false, min: 1, max: 5, section: '食材評價' },

      { id: 'sec_exp', type: 'section-header', title: '用餐體驗', required: false, section: '體驗' },
      { id: 'refill_speed', type: 'emoji-rating', label: '補餐速度', required: true, min: 1, max: 5, section: '體驗' },
      { id: 'table_service', type: 'emoji-rating', label: '桌邊服務', required: false, min: 1, max: 5, section: '體驗' },
      { id: 'clean', type: 'emoji-rating', label: '環境整潔', required: true, min: 1, max: 5, section: '體驗' },
      { id: 'cp_value', type: 'emoji-rating', label: 'CP 值', required: true, min: 1, max: 5, section: '體驗' },

      { id: 'best_item', type: 'text', label: '今天最推的食材是？', required: false, placeholder: '例如：安格斯牛、松阪豬...', section: '回饋' },
      { id: 'revisit', type: 'radio', label: '會再來嗎？', required: true, options: ['一定會', '可能會', '不太會'], section: '回饋' },
      { id: 'feedback', type: 'textarea', label: '其他建議', required: false, placeholder: '想跟我們說的話...', section: '回饋' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 5. 外帶/外送
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'takeout-delivery',
    name: '外帶 / 外送',
    description: '包裝完整度 + 餐點溫度 + 送達時間 + 正確性。適合便當店、外送合作餐廳',
    category: '外帶外送',
    questions: [
      { id: 'order_type', type: 'radio', label: '您今天是？', required: true, options: ['外帶自取', '外送平台', '電話訂餐'], section: '訂餐方式' },
      { id: 'platform', type: 'radio', label: '使用哪個平台？', required: false, options: ['UberEats', 'Foodpanda', '自家外送', '其他', '自取不適用'], section: '訂餐方式' },

      { id: 'sec_quality', type: 'section-header', title: '餐點品質', required: false, section: '品質' },
      { id: 'taste', type: 'emoji-rating', label: '餐點口味', required: true, min: 1, max: 5, section: '品質' },
      { id: 'temperature', type: 'radio', label: '收到時溫度如何？', required: true, options: ['熱騰騰的', '溫的還行', '有點涼了', '冷掉了'], section: '品質' },
      { id: 'portion', type: 'radio', label: '份量如何？', required: false, options: ['超大份', '剛剛好', '有點少', '太少'], section: '品質' },
      { id: 'accuracy', type: 'radio', label: '餐點正確嗎？', required: true, options: ['完全正確', '小錯誤', '漏餐/送錯'], section: '品質' },

      { id: 'sec_pkg', type: 'section-header', title: '包裝與配送', required: false, section: '包裝' },
      { id: 'packaging', type: 'emoji-rating', label: '包裝品質', required: true, min: 1, max: 5, section: '包裝' },
      { id: 'no_leak', type: 'radio', label: '有沒有灑漏？', required: true, options: ['完全沒有', '有一點', '灑得很嚴重'], section: '包裝' },
      { id: 'delivery_time', type: 'radio', label: '等待時間可接受嗎？', required: false, options: ['比預期快', '差不多', '有點久', '太久了'], section: '包裝' },

      { id: 'reorder', type: 'radio', label: '會再訂嗎？', required: true, options: ['一定會', '可能會', '不太會'], section: '回饋' },
      { id: 'feedback', type: 'textarea', label: '其他建議', required: false, placeholder: '包裝、口味、配送，任何建議...', section: '回饋' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 6. 早午餐 Brunch
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'brunch',
    name: '早午餐 Brunch',
    description: '餐點創意 + 飲品 + 等候時間 + 拍照打卡。適合早午餐店、早餐店',
    category: '早午餐',
    questions: [
      { id: 'visit_freq', type: 'radio', label: '多久來一次？', required: false, options: ['第一次', '偶爾', '每週來', '常客'], section: '基本' },
      { id: 'how_know', type: 'radio', label: '怎麼知道我們的？', required: false, options: ['Google 搜尋', 'IG/社群', '朋友推薦', '路過', '美食部落格'], section: '基本' },

      { id: 'sec_food', type: 'section-header', title: '餐點評價', required: false, section: '餐點' },
      { id: 'food_taste', type: 'emoji-rating', label: '口味', required: true, min: 1, max: 5, section: '餐點' },
      { id: 'food_look', type: 'emoji-rating', label: '擺盤顏值', required: true, min: 1, max: 5, section: '餐點' },
      { id: 'food_portion', type: 'radio', label: '份量感覺？', required: false, options: ['很飽', '剛好', '有點少'], section: '餐點' },
      { id: 'drink', type: 'emoji-rating', label: '飲品', required: true, min: 1, max: 5, section: '餐點' },
      { id: 'cp_value', type: 'emoji-rating', label: '性價比', required: true, min: 1, max: 5, section: '餐點' },

      { id: 'wait_time', type: 'radio', label: '等餐時間可以嗎？', required: true, options: ['很快', '可接受', '有點久', '太久了'], section: '體驗' },
      { id: 'photo_worthy', type: 'radio', label: '會想拍照打卡嗎？', required: false, options: ['已經拍了！', '想拍但沒拍', '還好', '不太會'], section: '體驗' },
      { id: 'comeback', type: 'radio', label: '會再來嗎？', required: true, options: ['一定會', '可能會', '不太會'], section: '回饋' },
      { id: 'feedback', type: 'textarea', label: '想跟我們說的話', required: false, placeholder: '推薦菜色、改善建議...', section: '回饋' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 7. 甜點 / 下午茶
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'dessert-tea',
    name: '甜點 / 下午茶',
    description: '甜點精緻度 + 茶飲品質 + 環境美感 + 拍照分享意願。適合甜點店、下午茶',
    category: '甜點烘焙',
    questions: [
      { id: 'occasion', type: 'radio', label: '今天來的原因？', required: false, options: ['跟朋友聚', '約會', '犒賞自己', '慶祝', '路過想吃'], section: '基本' },

      { id: 'sec_dessert', type: 'section-header', title: '甜點評價', required: false, section: '甜點' },
      { id: 'taste', type: 'emoji-rating', label: '口味', required: true, min: 1, max: 5, section: '甜點' },
      { id: 'sweetness', type: 'radio', label: '甜度如何？', required: false, options: ['太甜', '剛好', '不夠甜'], section: '甜點' },
      { id: 'look', type: 'emoji-rating', label: '外觀精緻度', required: true, min: 1, max: 5, section: '甜點' },
      { id: 'freshness', type: 'emoji-rating', label: '食材新鮮感', required: false, min: 1, max: 5, section: '甜點' },
      { id: 'creativity', type: 'emoji-rating', label: '創意/獨特性', required: false, min: 1, max: 5, section: '甜點' },

      { id: 'sec_drink', type: 'section-header', title: '飲品 & 環境', required: false, section: '飲品環境' },
      { id: 'tea_coffee', type: 'emoji-rating', label: '茶/咖啡/飲品', required: true, min: 1, max: 5, section: '飲品環境' },
      { id: 'ambiance', type: 'emoji-rating', label: '店內氛圍', required: true, min: 1, max: 5, section: '飲品環境' },
      { id: 'photo_share', type: 'radio', label: '會拍照分享嗎？', required: false, options: ['已經發 IG 了！', '會想拍', '不太會'], section: '飲品環境' },

      { id: 'fav_item', type: 'text', label: '今天最愛的甜點是？', required: false, placeholder: '甜點名稱', section: '回饋' },
      { id: 'comeback', type: 'radio', label: '會再來嗎？', required: true, options: ['一定會', '可能會', '不太會'], section: '回饋' },
      { id: 'feedback', type: 'textarea', label: '其他建議', required: false, placeholder: '口味、環境、服務...', section: '回饋' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 8. 居酒屋 / 小酌（升級版）
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'izakaya',
    name: '居酒屋 / 串燒小酌',
    description: '酒類選擇 + 下酒菜 + 氛圍 + 店員互動。適合居酒屋、串燒、熱炒',
    category: '居酒屋',
    questions: [
      { id: 'visit_freq', type: 'radio', label: '來過幾次？', required: false, options: ['第一次', '2-3次', '常客'], section: '基本' },
      { id: 'group', type: 'radio', label: '今天跟誰來？', required: false, options: ['朋友', '同事', '自己', '約會'], section: '基本' },

      { id: 'sec_drink', type: 'section-header', title: '酒水評價', required: false, section: '酒水' },
      { id: 'drink_variety', type: 'emoji-rating', label: '酒類選擇多樣性', required: true, min: 1, max: 5, section: '酒水' },
      { id: 'drink_taste', type: 'emoji-rating', label: '酒水品質', required: true, min: 1, max: 5, section: '酒水' },
      { id: 'drink_price', type: 'radio', label: '酒水價格？', required: false, options: ['很划算', '合理', '有點貴', '太貴'], section: '酒水' },

      { id: 'sec_food', type: 'section-header', title: '料理評價', required: false, section: '料理' },
      { id: 'food_taste', type: 'emoji-rating', label: '下酒菜口味', required: true, min: 1, max: 5, section: '料理' },
      { id: 'food_speed', type: 'emoji-rating', label: '出餐速度', required: false, min: 1, max: 5, section: '料理' },
      { id: 'food_portion', type: 'radio', label: '份量如何？', required: false, options: ['很夠', '剛好', '偏少'], section: '料理' },

      { id: 'sec_vibe', type: 'section-header', title: '氛圍', required: false, section: '氛圍' },
      { id: 'atmosphere', type: 'emoji-rating', label: '整體氛圍', required: true, min: 1, max: 5, section: '氛圍' },
      { id: 'staff_vibe', type: 'emoji-rating', label: '店員互動/熱情度', required: false, min: 1, max: 5, section: '氛圍' },
      { id: 'noise', type: 'radio', label: '音量舒適度？', required: false, options: ['很棒的熱鬧感', '還好', '有點太吵'], section: '氛圍' },

      { id: 'best_dish', type: 'text', label: '今晚最推哪道？', required: false, placeholder: '菜名', section: '回饋' },
      { id: 'comeback', type: 'radio', label: '會再來嗎？', required: true, options: ['一定會', '可能會', '不太會'], section: '回饋' },
      { id: 'feedback', type: 'textarea', label: '想說的話', required: false, placeholder: '推薦、建議、吐槽都行...', section: '回饋' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 以下為原有模板（保留）
  // ═══════════════════════════════════════════════════════════════

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
      { id: 'sec1_header', type: 'section-header', title: '基本資料', description: '請填寫您的基本資訊', required: false, section: '基本資料' },
      { id: 'gender', type: 'radio', label: '性別', required: true, options: ['男', '女'], section: '基本資料' },
      { id: 'age', type: 'radio', label: '年齡層', required: true, options: ['18歲以下', '18-25歲', '26-35歲', '36-45歲', '46歲以上'], section: '基本資料' },
      { id: 'first_visit', type: 'radio', label: '是否第一次來本店', required: true, options: ['是', '否'], section: '基本資料' },
      { id: 'sec2_header', type: 'section-header', title: '整體視覺印象', description: '請對整體呈現做初步評分', required: false, section: '整體視覺印象' },
      { id: 'first_impression', type: 'rating', label: '第一眼印象評分', required: true, min: 1, max: 5, section: '整體視覺印象' },
      { id: 'plating', type: 'rating', label: '擺盤精緻度', required: true, min: 1, max: 5, section: '整體視覺印象' },
      { id: 'portion_feel', type: 'radio', label: '份量感受', required: false, options: ['剛好', '稍微偏少', '太多'], section: '整體視覺印象' },
      { id: 'sec3_header', type: 'section-header', title: '單品細項評鑑', description: '以下為逐品評鑑區，店家可依實際菜品自行增減', required: false, section: '單品細項評鑑' },
      {
        id: 'dish_demo', type: 'dish-group', dishName: '示範菜品', label: '示範菜品',
        description: '此為範例，請店家替換為實際菜名', required: false, section: '單品細項評鑑',
        subQuestions: [
          { id: 'look', type: 'radio-with-reason', label: '外觀賣相', required: false, options: ['非常加分', '普通', '不太搭'], reasonPlaceholder: '外觀方面的原因（選填）' },
          { id: 'aroma', type: 'radio-with-reason', label: '香氣', required: false, options: ['非常滿意', '滿意', '普通', '不滿意', '非常不滿意'], reasonPlaceholder: '香氣方面的原因（選填）' },
          { id: 'taste', type: 'radio-with-reason', label: '口味', required: true, options: ['非常滿意', '滿意', '普通', '不滿意', '非常不滿意'], reasonPlaceholder: '口味方面的原因（選填）' },
          { id: 'portion', type: 'radio-with-reason', label: '份量', required: false, options: ['太多', '剛好', '普通', '稍少', '太少'], reasonPlaceholder: '份量方面的原因（選填）' },
          { id: 'overall', type: 'radio-with-reason', label: '整體滿意度', required: true, options: ['非常滿意', '滿意', '普通', '不滿意', '非常不滿意'], reasonPlaceholder: '整體原因（選填）' },
        ],
      },
      { id: 'sec4_header', type: 'section-header', title: '市場競爭力', description: '請提供市場面的回饋', required: false, section: '市場競爭力' },
      { id: 'most_impressed', type: 'text', label: '最印象深刻的是哪一道？', required: false, placeholder: '請輸入菜名', section: '市場競爭力' },
      { id: 'price_suggest', type: 'number', label: '合理的定價建議', required: false, placeholder: 'NT$', section: '市場競爭力' },
      { id: 'repurchase', type: 'rating', label: '回購意願', required: true, min: 1, max: 5, section: '市場競爭力' },
      { id: 'occasion', type: 'checkbox', label: '最適合的消費情境', required: false, options: ['朋友聚餐下酒', '約會慶祝', '家庭聚會'], section: '市場競爭力' },
      { id: 'sec5_header', type: 'section-header', title: '給主廚的悄悄話', required: false, section: '給主廚的悄悄話' },
      { id: 'chef_message', type: 'textarea', label: '給主廚的悄悄話', required: false, placeholder: '如果可以調整一個細節讓這道菜更完美，您的建議是？', section: '給主廚的悄悄話' },
    ],
  },
  // ═══════════════════════════════════════════════════════════════
  // 13. 情人節 / 紀念日特餐
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'valentines',
    name: '情人節 / 紀念日特餐',
    description: '針對情人節、結婚紀念日等浪漫特餐的專屬問卷，收集約會體驗與氛圍感受',
    category: '節慶活動',
    questions: [
      { id: 'sec_welcome', type: 'section-header', title: '感謝您選擇與我們共度特別時光 💕', description: '花 2 分鐘告訴我們您的感受', required: false, section: '歡迎' },
      { id: 'occasion_type', type: 'radio', label: '今天是什麼特別日子？', required: true, options: ['情人節', '結婚紀念日', '交往紀念日', '生日', '求婚', '純約會', '其他'], section: '場合' },
      { id: 'atmosphere', type: 'emoji-rating', label: '浪漫氛圍營造', required: true, min: 1, max: 5, section: '體驗' },
      { id: 'special_menu', type: 'emoji-rating', label: '特餐餐點表現', required: true, min: 1, max: 5, section: '體驗' },
      { id: 'presentation', type: 'emoji-rating', label: '擺盤與視覺', required: true, min: 1, max: 5, section: '體驗' },
      { id: 'service_detail', type: 'emoji-rating', label: '服務細心程度', required: true, min: 1, max: 5, section: '體驗' },
      { id: 'surprise', type: 'radio', label: '有沒有讓你驚喜的環節？', required: false, options: ['有，超感動！', '有一點', '還好', '沒有特別感覺'], section: '驚喜' },
      { id: 'fav_dish', type: 'text', label: '今晚最愛的一道菜？', required: false, placeholder: '菜名', section: '推薦' },
      { id: 'price_feel', type: 'radio', label: '特餐價位感覺如何？', required: true, options: ['很超值', '合理', '有點貴但值得', '偏貴'], section: '價格' },
      { id: 'will_return', type: 'radio', label: '下次重要日子還會來嗎？', required: true, options: ['一定會！', '應該會', '看看其他選擇', '不太會'], section: '回訪' },
      { id: 'photo_share', type: 'radio', label: '有拍照分享到社群嗎？', required: false, options: ['有，已發！', '有拍但沒發', '沒拍'], section: '社群' },
      { id: 'feedback', type: 'textarea', label: '給我們的悄悄話 💌', required: false, placeholder: '任何想說的...', section: '回饋' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 14. 年節 / 春節特餐
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'lunar-new-year',
    name: '年節 / 春節特餐',
    description: '農曆新年、除夕團圓飯、尾牙春酒等年節聚餐問卷，收集大桌菜體驗',
    category: '節慶活動',
    questions: [
      { id: 'sec_welcome', type: 'section-header', title: '🧧 新年快樂！感謝您的蒞臨', description: '幫助我們讓明年的年菜更好', required: false, section: '歡迎' },
      { id: 'event_type', type: 'radio', label: '今天的聚餐是？', required: true, options: ['除夕團圓', '春節聚餐', '尾牙', '春酒', '開工團拜', '其他'], section: '場合' },
      { id: 'party_size', type: 'radio', label: '今天幾位一起？', required: true, options: ['4 人以下', '5-8 人', '9-12 人', '13 人以上'], section: '場合' },
      { id: 'set_menu', type: 'emoji-rating', label: '年菜套餐整體滿意度', required: true, min: 1, max: 5, section: '餐點' },
      { id: 'portion', type: 'radio', label: '份量如何？', required: true, options: ['太多（適合分享）', '剛好', '稍微偏少'], section: '餐點' },
      { id: 'festive_feel', type: 'emoji-rating', label: '過年氣氛營造', required: true, min: 1, max: 5, section: '氣氛' },
      { id: 'fav_dish', type: 'text', label: '最受歡迎的一道年菜？', required: false, placeholder: '菜名', section: '推薦' },
      { id: 'least_fav', type: 'text', label: '最不受歡迎的一道？', required: false, placeholder: '菜名（選填）', section: '改進' },
      { id: 'price_value', type: 'radio', label: '年菜價位感受', required: true, options: ['很划算', '合理', '有點貴', '太貴'], section: '價格' },
      { id: 'book_next_year', type: 'radio', label: '明年還會來訂年菜嗎？', required: true, options: ['一定會！已經想預訂了', '應該會', '看看再說'], section: '回訪' },
      { id: 'feedback', type: 'textarea', label: '對年菜的建議', required: false, placeholder: '想加什麼菜？什麼可以改進？', section: '回饋' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 15. 母親節 / 父親節特餐
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'parents-day',
    name: '母親節 / 父親節特餐',
    description: '母親節、父親節家庭聚餐問卷，了解家庭客群的需求與期待',
    category: '節慶活動',
    questions: [
      { id: 'sec_welcome', type: 'section-header', title: '感謝您帶家人來慶祝 🌹', description: '您的回饋讓我們更用心', required: false, section: '歡迎' },
      { id: 'event_type', type: 'radio', label: '今天慶祝什麼？', required: true, options: ['母親節', '父親節', '家庭聚餐', '長輩生日', '其他'], section: '場合' },
      { id: 'party_size', type: 'radio', label: '今天幾位家人一起？', required: true, options: ['3-4 人', '5-6 人', '7-10 人', '10 人以上'], section: '場合' },
      { id: 'food_quality', type: 'emoji-rating', label: '餐點品質', required: true, min: 1, max: 5, section: '餐點' },
      { id: 'elder_friendly', type: 'emoji-rating', label: '菜色適合長輩嗎？', required: true, min: 1, max: 5, section: '餐點' },
      { id: 'kid_friendly', type: 'radio', label: '有小朋友一起嗎？餐廳對兒童友善嗎？', required: false, options: ['沒有小朋友', '很友善', '還好', '不太方便'], section: '友善' },
      { id: 'special_service', type: 'radio', label: '有感受到節日特別服務嗎？', required: false, options: ['有！很貼心', '有一點', '沒有特別'], section: '服務' },
      { id: 'service', type: 'emoji-rating', label: '服務態度', required: true, min: 1, max: 5, section: '服務' },
      { id: 'overall', type: 'emoji-rating', label: '整體滿意度', required: true, min: 1, max: 5, section: '整體' },
      { id: 'will_return', type: 'radio', label: '下個節日還會來嗎？', required: true, options: ['一定會', '可能會', '看看再說'], section: '回訪' },
      { id: 'feedback', type: 'textarea', label: '給我們的建議', required: false, placeholder: '任何想說的...', section: '回饋' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 16. 聖誕節 / 跨年特餐
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'christmas-newyear',
    name: '聖誕節 / 跨年派對',
    description: '聖誕大餐、跨年派對、耶誕交換禮物聚餐問卷，收集歡慶體驗',
    category: '節慶活動',
    questions: [
      { id: 'sec_welcome', type: 'section-header', title: '🎄 Merry Christmas & Happy New Year!', description: '感謝您選擇與我們一起歡慶', required: false, section: '歡迎' },
      { id: 'event_type', type: 'radio', label: '今天是？', required: true, options: ['平安夜', '聖誕節', '跨年夜', '新年派對', '朋友聚餐', '公司聚餐'], section: '場合' },
      { id: 'food', type: 'emoji-rating', label: '特餐料理', required: true, min: 1, max: 5, section: '體驗' },
      { id: 'decoration', type: 'emoji-rating', label: '節日裝飾與氛圍', required: true, min: 1, max: 5, section: '體驗' },
      { id: 'music_vibe', type: 'emoji-rating', label: '音樂與氣氛', required: true, min: 1, max: 5, section: '體驗' },
      { id: 'drink', type: 'emoji-rating', label: '特調飲品/酒單', required: false, min: 1, max: 5, section: '體驗' },
      { id: 'fav_moment', type: 'text', label: '今晚最棒的一刻？', required: false, placeholder: '分享你的歡樂時光', section: '回憶' },
      { id: 'photo_worthy', type: 'radio', label: '有拍照打卡嗎？', required: false, options: ['瘋狂拍！', '拍了幾張', '沒拍'], section: '社群' },
      { id: 'price', type: 'radio', label: '價位感受', required: true, options: ['超值', '合理', '小貴但 OK', '太貴'], section: '價格' },
      { id: 'next_event', type: 'radio', label: '下次節日活動還會來嗎？', required: true, options: ['一定來！', '很有可能', '考慮看看'], section: '回訪' },
      { id: 'feedback', type: 'textarea', label: '給我們的建議 🎅', required: false, placeholder: '讓明年更好...', section: '回饋' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 17. 限定活動 / 快閃 / 主題之夜
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'special-event',
    name: '限定活動 / 主題之夜',
    description: '快閃活動、品酒會、主題之夜、節日限定菜單等特殊活動問卷',
    category: '節慶活動',
    questions: [
      { id: 'sec_welcome', type: 'section-header', title: '✨ 感謝你參加本次活動！', description: '你的回饋是我們舉辦下一場的動力', required: false, section: '歡迎' },
      { id: 'how_know', type: 'radio', label: '怎麼知道這個活動的？', required: true, options: ['IG/FB', '朋友揪', '店內海報', 'LINE 通知', '路過看到', '其他'], section: '來源' },
      { id: 'expectation', type: 'radio', label: '活動符合你的期待嗎？', required: true, options: ['超乎期待！', '符合期待', '普通', '有落差'], section: '期待' },
      { id: 'food_quality', type: 'emoji-rating', label: '活動限定餐點', required: true, min: 1, max: 5, section: '體驗' },
      { id: 'event_fun', type: 'emoji-rating', label: '活動趣味度', required: true, min: 1, max: 5, section: '體驗' },
      { id: 'host_quality', type: 'emoji-rating', label: '主持/互動品質', required: false, min: 1, max: 5, section: '體驗' },
      { id: 'best_part', type: 'text', label: '最喜歡活動的哪個部分？', required: false, placeholder: '例如：品酒環節、主廚互動...', section: '亮點' },
      { id: 'price_value', type: 'radio', label: '活動票價/消費感受', required: true, options: ['很超值', '合理', '偏高但值得', '太貴'], section: '價格' },
      { id: 'join_next', type: 'radio', label: '下次有類似活動會參加嗎？', required: true, options: ['一定要！幫我留位', '很有興趣', '看活動內容', '不太會'], section: '回訪' },
      { id: 'want_theme', type: 'text', label: '你希望我們辦什麼主題的活動？', required: false, placeholder: '例如：威士忌之夜、和牛品鑑...', section: '建議' },
      { id: 'feedback', type: 'textarea', label: '其他建議', required: false, placeholder: '讓下次活動更好...', section: '回饋' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 18. 中秋節 / 烤肉季
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'mid-autumn',
    name: '中秋節 / 烤肉季',
    description: '中秋節烤肉、月餅禮盒、秋季限定菜單問卷',
    category: '節慶活動',
    questions: [
      { id: 'sec_welcome', type: 'section-header', title: '🌕 中秋快樂！', description: '感謝您的蒞臨，花 2 分鐘幫我們變更好', required: false, section: '歡迎' },
      { id: 'event_type', type: 'radio', label: '今天的聚餐類型？', required: true, options: ['中秋烤肉', '月餅下午茶', '秋季限定套餐', '家庭團聚', '朋友聚會', '公司團體'], section: '場合' },
      { id: 'food', type: 'emoji-rating', label: '餐點/烤肉品質', required: true, min: 1, max: 5, section: '餐點' },
      { id: 'ingredient', type: 'emoji-rating', label: '食材新鮮度', required: true, min: 1, max: 5, section: '餐點' },
      { id: 'variety', type: 'emoji-rating', label: '菜色豐富度', required: true, min: 1, max: 5, section: '餐點' },
      { id: 'moon_cake', type: 'radio', label: '有試我們的月餅嗎？', required: false, options: ['有，很好吃！', '有，普通', '沒試到', '不適用'], section: '月餅' },
      { id: 'atmosphere', type: 'emoji-rating', label: '中秋氛圍', required: true, min: 1, max: 5, section: '氣氛' },
      { id: 'overall', type: 'emoji-rating', label: '整體滿意度', required: true, min: 1, max: 5, section: '整體' },
      { id: 'next_year', type: 'radio', label: '明年中秋還會來嗎？', required: true, options: ['一定會！', '應該會', '看看再說'], section: '回訪' },
      { id: 'feedback', type: 'textarea', label: '給我們的建議 🎑', required: false, placeholder: '想吃什麼？希望改進什麼？', section: '回饋' },
    ],
  },
];

export function getSurveyTemplate(id: string): SurveyTemplate | undefined {
  return surveyTemplates.find(t => t.id === id);
}
