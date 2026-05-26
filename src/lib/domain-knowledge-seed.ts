// src/lib/domain-knowledge-seed.ts
// 台灣餐飲業行業知識種子資料（共 25 筆）

export interface DomainKnowledgeSeed {
  project: string;
  category: string;
  subject: string | null;
  content: string;
  source: string;
  valid_until: string | null;
  confidence: number;
}

export const seeds: DomainKnowledgeSeed[] = [
  // ── regulation（食安法規）──────────────────────────────────────────────────
  {
    project: 'feedbites',
    category: 'regulation',
    subject: '熱食保存溫度',
    content: '熱食保存溫度須維持 ≥ 60°C，冷藏食品 ≤ 7°C，冷凍食品 ≤ -18°C（台灣食品安全衛生管理法規定）',
    source: '食品安全衛生管理法',
    valid_until: null,
    confidence: 5,
  },
  {
    project: 'feedbites',
    category: 'regulation',
    subject: '員工健康檢查',
    content: '廚房工作人員每年需完成健康檢查，包含 A 型肝炎及沙門氏菌等項目，需留存紀錄供衛生局查驗',
    source: '食品安全衛生管理法',
    valid_until: null,
    confidence: 5,
  },
  {
    project: 'feedbites',
    category: 'regulation',
    subject: '清潔紀錄留存',
    content: '餐廳須定期記錄環境清潔消毒情形，衛生局不定期抽查，建議每日填寫清潔日誌',
    source: '食品良好衛生規範準則',
    valid_until: null,
    confidence: 4,
  },
  {
    project: 'feedbites',
    category: 'regulation',
    subject: '食品標示規定',
    content: '販售包裝食品須符合食品標示規定，含過敏原（花生、蛋、奶等）必須明確標示，違規最高罰款 400 萬',
    source: '食品安全衛生管理法',
    valid_until: null,
    confidence: 4,
  },
  {
    project: 'feedbites',
    category: 'regulation',
    subject: '廚餘分類處理',
    content: '餐飲業廚餘須依台北市/各縣市規定分類回收，違規可罰 1,200～6,000 元，建議與廚餘回收業者簽約',
    source: '廢棄物清理法',
    valid_until: null,
    confidence: 3,
  },

  // ── trend（市場趨勢）──────────────────────────────────────────────────────
  {
    project: 'feedbites',
    category: 'trend',
    subject: '外送平台佔比',
    content: '台灣 Uber Eats、Foodpanda 等外送平台訂單平均佔餐廳業績 25–35%，平台抽成約 25–30%，需注意利潤侵蝕',
    source: 'internal',
    valid_until: null,
    confidence: 4,
  },
  {
    project: 'feedbites',
    category: 'trend',
    subject: '健康飲食趨勢',
    content: '健康飲食需求持續成長：低卡、高蛋白、素食/蔬食選項，提供此類菜單可吸引 Z 世代與健身族群',
    source: 'internal',
    valid_until: null,
    confidence: 4,
  },
  {
    project: 'feedbites',
    category: 'trend',
    subject: 'Google 評分影響',
    content: '顧客 Google 評分低於 4.0 星會顯著影響新客轉換率，建議評分低於 4.2 時立即啟動改善計畫',
    source: 'internal',
    valid_until: null,
    confidence: 5,
  },
  {
    project: 'feedbites',
    category: 'trend',
    subject: '颱風豪雨效應',
    content: '颱風或豪雨天氣外送訂單暴增 40–80%，內用大幅減少；建議事先備足外送包材，並通知外送平台提前排單',
    source: 'internal',
    valid_until: null,
    confidence: 4,
  },
  {
    project: 'feedbites',
    category: 'trend',
    subject: '行動支付普及',
    content: '台灣行動支付使用率逐年提升，Line Pay、街口支付、Apple Pay 最普及；未支援行動支付的店家流失客群越來越明顯',
    source: 'internal',
    valid_until: null,
    confidence: 4,
  },

  // ── strategy（行銷策略）──────────────────────────────────────────────────
  {
    project: 'feedbites',
    category: 'strategy',
    subject: '農曆年（1–2月）',
    content: '農曆年節前後適合推年菜外帶、圍爐套餐；年初一至初三門市生意通常較淡，可安排員工輪休',
    source: 'internal',
    valid_until: null,
    confidence: 5,
  },
  {
    project: 'feedbites',
    category: 'strategy',
    subject: '母親節（5月第二個週日）',
    content: '母親節是餐飲業一年最大訂位高峰之一，建議提前 2–3 週開放預訂、推出家庭套餐及甜點組合',
    source: 'internal',
    valid_until: null,
    confidence: 5,
  },
  {
    project: 'feedbites',
    category: 'strategy',
    subject: '中秋節（9月）',
    content: '中秋節中式餐廳可推烤肉套餐、合菜預訂；西式餐廳可結合月餅主題甜點；外帶禮盒是送禮旺季',
    source: 'internal',
    valid_until: null,
    confidence: 5,
  },
  {
    project: 'feedbites',
    category: 'strategy',
    subject: '七夕情人節（8月）',
    content: '七夕情人節適合推雙人套餐、限定甜點、Instagram 打卡裝飾；預訂制可提高翻桌率控制',
    source: 'internal',
    valid_until: null,
    confidence: 4,
  },
  {
    project: 'feedbites',
    category: 'strategy',
    subject: '聖誕元旦（12–1月）',
    content: '聖誕節與跨年是西式餐廳業績高峰；中式餐廳相對平淡，可考慮推跨年夜套餐或主題佈置吸客',
    source: 'internal',
    valid_until: null,
    confidence: 4,
  },
  {
    project: 'feedbites',
    category: 'strategy',
    subject: '暑假（7–8月）',
    content: '暑假期間學生客群增加，下午茶需求顯著提高；可規劃學生優惠、IG 打卡甜點、冰品特餐',
    source: 'internal',
    valid_until: null,
    confidence: 4,
  },
  {
    project: 'feedbites',
    category: 'strategy',
    subject: '週一低潮日策略',
    content: '週一通常是餐廳最淡的一天，建議推「週一優惠」或提前完成下週備料/員工排班規劃',
    source: 'internal',
    valid_until: null,
    confidence: 3,
  },

  // ── customer_behavior（顧客行為）────────────────────────────────────────
  {
    project: 'feedbites',
    category: 'customer_behavior',
    subject: '顧客最在意的三件事',
    content: '台灣顧客最在意：食物新鮮度、服務速度（等候時間）、CP 值；這三項是評分和口碑的核心驅動力',
    source: 'internal',
    valid_until: null,
    confidence: 5,
  },
  {
    project: 'feedbites',
    category: 'customer_behavior',
    subject: '負評主因',
    content: '負評最常見原因依序：等待時間過長、服務態度不佳、食材不新鮮；只要改善這三點，評分可快速回升',
    source: 'internal',
    valid_until: null,
    confidence: 5,
  },
  {
    project: 'feedbites',
    category: 'customer_behavior',
    subject: '黃金服務時段',
    content: '下午 2–5 點是服務抱怨最少的黃金時段，適合安排新人練習和設備維護；尖峰前後是抱怨高峰',
    source: 'internal',
    valid_until: null,
    confidence: 4,
  },
  {
    project: 'feedbites',
    category: 'customer_behavior',
    subject: '客訴率與消費區間',
    content: '平均消費 NT$150–300 的餐廳客訴率最低，因顧客預期與體驗最吻合；高單價或低單價兩端客訴率反而偏高',
    source: 'internal',
    valid_until: null,
    confidence: 4,
  },
  {
    project: 'feedbites',
    category: 'customer_behavior',
    subject: '回頭客關鍵',
    content: '讓顧客回頭的關鍵是「被記得」：記住常客點什麼、偶爾給小驚喜（免費小菜、飲料），效果遠勝折扣',
    source: 'internal',
    valid_until: null,
    confidence: 4,
  },

  // ── operations（營運知識）────────────────────────────────────────────────
  {
    project: 'feedbites',
    category: 'operations',
    subject: '尖峰時段人力',
    content: '午間尖峰 11:30–13:30、晚間尖峰 17:30–19:30 是人力最緊繃時段，少一個人可能造成連鎖延誤，建議這兩段全員到位',
    source: 'internal',
    valid_until: null,
    confidence: 5,
  },
  {
    project: 'feedbites',
    category: 'operations',
    subject: '食材庫存管理',
    content: '食材庫存超過 3 天需注意鮮度狀況，超過 7 天建議以特餐或折扣促銷消化，避免浪費和食安風險',
    source: 'internal',
    valid_until: null,
    confidence: 5,
  },
  {
    project: 'feedbites',
    category: 'operations',
    subject: '員工離職率警示',
    content: '員工年離職率超過 30% 通常反映排班不合理或薪資競爭力不足；離職率高的店家服務品質難以穩定',
    source: 'internal',
    valid_until: null,
    confidence: 4,
  },
];
