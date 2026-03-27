// ══ FeedBites 版本更新紀錄 ══
// 每次發版在最上面新增一筆，舊的不要刪

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  items: { emoji: string; title: string; desc: string }[];
}

export const CURRENT_VERSION = '2026.03.27';

export const changelog: ChangelogEntry[] = [
  {
    version: '2026.03.27',
    date: '2026/03/27',
    title: '互動升級 — 回報對話 + 邀請連結 + 節慶模板',
    items: [
      { emoji: '🎰', title: '輪盤獎品自訂', desc: '編輯問卷時可以自訂轉盤上的獎品內容了' },
      { emoji: '😄', title: '滿意度動畫升級', desc: '笑臉評分更生動，選擇時會跳動發光' },
      { emoji: '💬', title: '回報系統雙向對話', desc: '問題回報可以來回對話了，不再只能等' },
      { emoji: '📊', title: '服務統計 + 進度時間軸', desc: '回報頁新增解決率統計與處理進度追蹤' },
      { emoji: '🔗', title: '邀請連結分享', desc: '一鍵產生邀請連結，傳給夥伴就能加入管理' },
      { emoji: '🎄', title: '6 套節慶問卷模板', desc: '情人節、春節、母親節、聖誕節等活動專屬問卷' },
      { emoji: '📱', title: 'Dashboard 全面可點擊', desc: '所有數字卡片點了都能進入對應頁面' },
    ],
  },
  {
    version: '2026.03.26',
    date: '2026/03/26',
    title: '基礎修復 — LINE 提醒 + 編輯優化 + 404 修正',
    items: [
      { emoji: '📲', title: 'LINE 瀏覽器友善提醒', desc: '從 LINE 開啟網址時，引導用戶用外部瀏覽器' },
      { emoji: '🎨', title: '編輯問卷可換模板', desc: '編輯問卷時可以更換視覺風格模板了' },
      { emoji: '🔧', title: '404 錯誤修復', desc: '編輯問卷不再出現找不到頁面的錯誤' },
    ],
  },
  {
    version: '2026.03.24',
    date: '2026/03/24',
    title: '回報系統上線 — 兩步驟精靈 + 截圖上傳',
    items: [
      { emoji: '🐛', title: '問題回報系統', desc: '遇到問題可以直接回報，支援截圖上傳' },
      { emoji: '🤖', title: 'AI 洞察分析', desc: '自動分析問卷回覆，產生洞察報告' },
    ],
  },
  {
    version: '2026.03.20',
    date: '2026/03/20',
    title: '店長總覽大改版 — 動畫 KPI + AI 提示',
    items: [
      { emoji: '🎉', title: '全新 Dashboard', desc: '動畫 KPI 卡片、7 天趨勢圖、AI 小提示' },
      { emoji: '👥', title: '成員管理', desc: '邀請夥伴一起管理店家' },
      { emoji: '🎮', title: '遊戲化問卷', desc: 'XP 積分、連擊獎勵、等級徽章' },
    ],
  },
];
