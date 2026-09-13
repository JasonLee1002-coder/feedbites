# feedbites — Claude Code 設定

> OWNER: CPO（v3.0 組織，2026-07-03）

## 專案定義（Jason 2026-09-13 重新定義，動任何功能前先讀）

**FeedBites 是餐廳的顧客帳本，不是問卷工具。** 客人從掃第一次 QR 開始，在店裡做的每件事都記在帳本上換成點數：填問卷、補資料、許願、線上訂餐（第二期）、智取櫃自助取餐（第三期）。點數換餐券，餐券把人帶回店，回店再產生資料。菜單照片是 AI 行銷素材庫。問卷是帳本第一頁，不是產品本身。

- **場域**：第一是欣殿萬飲（高雄駁二，東方美投資，殿長阿水，設備層已上線）；第二是東方美早餐店；之後弘爺漢堡等連鎖
- **商業**：每店每月 NT$100；核心軟體自做，拍照上傳等現場服務收服務費、外包周邊團隊。集團→分店兩層，總部唯讀看全店，分店擁有自己的客人與餐券
- **身分**：顧客端 LINE Login（Jason 定），與店長 Google 登入分開；匿名可填，領點才登入
- **首張餐券**：填完第一份問卷即發，面額待阿水給毛利
- **品牌（2026-09-13 Jason 定案）**：對客品牌「常來點」，英文 **EatAgain**；FeedBites 留作店長後台名
- **許願功能命名（同日定案）**：客人畫面叫「敲碗」，店長後台叫「許願」；外文畫面英文 Request／Wish、日文 リクエスト、韓文 요청하기，跟隨按鈕 +1。四種語言按鈕位置與圖示一致
- **設計 spec**：`docs/superpowers/specs/2026-09-13-customer-ledger-design.html`（第一期六件：素材庫、問卷連菜品 ID、時段×菜品×客群分析、點數帳與許願、LINE Login、餐券與核銷、總部唯讀視角）
- 更上位的目標：AI 勞動力替代餐飲人力。欣殿萬飲是實驗場，每個 AI 工位要用實測人時證明；店家利益立場見 `欣殿萬飲/CLAUDE.md`

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

部署任何 Web App 之後，**桌面＋iPhone＋Android 三端截圖全部正常才能回報完成**。

指令、現行機型清單與已知陷阱一律以
`~/.claude/shared_intel/playbooks/DEPLOY_VERIFICATION.md` 為準，**這裡不再抄一份**。

> 為什麼改成指向（2026-09-12）：這段指令原本被逐字複製在 26 個專案檔裡。
> agent-browser 改掉機型名稱之後，26 份同時失效，而且 `set device` 失敗**不會中斷**
> 後續步驟——三端會拍出三張一模一樣的桌面截圖，每一步的輸出都是 ✓。
> 沒有人會發現，因為沒有任何東西變紅。抄本會各自過期，指向不會。
