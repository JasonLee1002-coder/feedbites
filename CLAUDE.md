# feedbites — Claude Code 設定

## 超級UI 定義用戶說「超級UI」時，自動套用以下完整組合，不需要再問：- **shadcn## 啟動報到ui** — 元件庫底座（Button、Skeleton、Card 等）- **Magic UI** — 動畫元件（NumberTicker、AnimatedGradientText、WordFadeIn）- **framer-motion** — 頁面入場動畫、交錯淡入、hover 上浮- **radial-gradient 背景** — 深色主題光暈背景，製造空氣感- **發光邊框** — 重點卡片 glow border- **骨架屏（Skeleton）** — 所有資料載入狀態- **數字動畫（NumberTicker）** — 所有統計數字- 字型：**Geist Sans**（UI）+ **Geist Mono**（數字## 啟動報到金額）
## 啟動報到
每次新對話開始，主動說：
「✅ feedbites 已就緒，Superpowers 工作流已啟用。」

## 開發工作流（Superpowers，自動執行）
**只要用戶說要做新功能或修 bug，Claude 自動按順序執行，不需要任何觸發詞：**
1. **Brainstorm** — 先問需求、邊界、設計方向（skill: superpowers:brainstorming）
2. **Plan** — 拆解成可執行任務清單（skill: superpowers:writing-plans）
3. **Execute** — 逐步實作，每步驟驗證（skill: superpowers:executing-plans）
4. **Review** — 完成後對照計畫檢查（skill: superpowers:requesting-code-review）

> ❌ 禁止跳過 Brainstorm 直接寫 code
> ✅ 計畫文件自動存到 `docs/superpowers/plans/`

## 啟動流程
每次開始工作時，自動執行：
1. `git pull` 同步 GitHub 最新代碼
2. 檢查 `REPORTS.md`（如果存在），優先處理 Jason 透過 LINE 回報的問題

## 部署方式
- 推上 GitHub 後 Vercel 自動部署
- 本地不需要跑 dev server，直接雲端驗證

## Git Push 策略
- 合併多個改動再一次 push
- 功能完整才 push，不要每改一行就推

## 待處理回報
每次開始工作時，請先檢查 `REPORTS.md`（如果存在），裡面是 Jason 透過 LINE Yuzu-san 回報的問題，請優先處理。

---
## 📱 手機模擬驗證（Jason 2026-06-29 全域強制）

**所有 Web App 部署後，桌面 + 手機三端截圖全部正常才能回報完成：**

```bash
# 1. 桌面（預設）
agent-browser open <url> && agent-browser screenshot --annotate

# 2. iPhone 模擬
agent-browser set device "iPhone 14 Pro"
agent-browser open <url> && agent-browser screenshot --annotate

# 3. Android 模擬
agent-browser set device "Pixel 7"
agent-browser open <url> && agent-browser screenshot --annotate
```

- 確認 RWD 版面正常（無橫向 overflow、文字可讀、按鈕可點）
- 三張截圖全部通過才通知 Jason，有問題自行修復再回報
