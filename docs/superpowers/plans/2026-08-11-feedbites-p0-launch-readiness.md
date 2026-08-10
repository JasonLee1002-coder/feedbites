# FeedBites P0 啟用前置修復 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 FeedBites 可以安全地啟用給第一家真實餐廳客戶（欣殿萬飲），修掉會外洩店家客人個資、破壞資料完整性、以及讓問題無法追查的缺陷。

**Architecture:** 在既有 Next.js 16 App Router + Drizzle + Postgres 專案上做最小侵入修改。登入改用 NextAuth v5 Google provider + 環境變數 email 白名單（fail-closed）；公開 PATCH 端點加上資源歸屬與時間窗約束；新增結構化 JSON logger 與 request_id；新增 `responses.device_key` 供 AI 分析去重（**不阻擋**重複填寫）。不引入外部監控服務，不重構 RLS，不做嚴格優惠券核銷。

**Tech Stack:** Next.js 16.1.6 / React 19 / next-auth v5 beta / drizzle-orm 0.45 / postgres.js / TypeScript 5 / @playwright/test（本計畫新增）

**依據規格：** `docs/superpowers/specs/2026-08-11-feedbites-p0-launch-readiness-design.html`

---

## 執行前必讀

### 這個專案的三個地雷

1. **`basePath: '/feedbites'`**（`next.config.ts:5`）。所有 URL 都要加前綴。專案歷史上有五個 commit 都在修 basePath 相關 bug。前端 fetch 已經硬寫 `/feedbites/api/...`（見 `SurveyClient.tsx:143`）。
2. **正式站在 EC2**（`https://poc.mcstation.ai/feedbites`），不是 Vercel，但 repo 裡還留著 Vercel 綁定。Task 8 處理。
3. **`.env.local` 目前缺 `DATABASE_URL` 與 `AUTH_SECRET`** — 本機直接跑會連不上資料庫。Task 0 必須先解決，否則後面所有驗證步驟都是空的。

4. **正式站的 schema 來源是 `scripts/feedbites-pg-schema.sql`，不是 `supabase/migrations/`。**
   前者是「Supabase 語法移除後」的 EC2 版本（檔頭寫明 `Generated from Supabase migrations 001–019`，
   `auth.users`、RLS、policies 全部拿掉，改用自建 `users` 表 + NextAuth）。
   **任何 schema 變更只改 `supabase/migrations/` 是不會進到正式站的。** 兩邊都要改。

5. **`users.password_hash` 在正式站是 `TEXT NOT NULL`**（`scripts/feedbites-pg-schema.sql:18`），
   但 Drizzle 的 `schema.ts:24` 宣告成可空（`text('password_hash')` 無 `.notNull()`）。
   兩邊不一致 —— 對**新** email 執行 `insert(users).values({ email })` 會在正式站違反 NOT NULL。
   既有使用者因為走 `onConflictDoUpdate` 的 UPDATE 分支所以沒事。Task 9 必須處理。

### 測試策略（為什麼不是全部 TDD）

專案原本**沒有任何測試框架**（`package.json` 只有 build/lint，`playwright` 是 library 不是 test runner）。本計畫的做法：

| 類型 | 做法 | 理由 |
|---|---|---|
| 純函式（白名單、遮罩） | **TDD，先寫測試** | 成本極低、回歸價值高 |
| 公開 API 行為（IDOR、時間窗） | **TDD，Playwright request 測試** | 這正是規格的驗收條件，且不需登入即可自動化 |
| Google OAuth 登入流程 | 手動驗證 | 自動化 Google 登入成本遠高於價值 |
| 儀表板 UI | 手動驗證 + 三端截圖 | 視覺確認，依全域部署規範 |

### 每個 Task 完成後

- `npx tsc --noEmit` 必須通過（專案沒有 typecheck script，直接用 npx）
- `npm run lint` 必須通過
- commit 訊息末尾加 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- **不要 push**，全部完成並經人工驗收後再一次推

---

## Task 0: 本機開發環境與測試框架

**Files:**
- Modify: `.env.local`（**不進 git**）
- Modify: `.env.example`
- Create: `playwright.config.ts`
- Create: `tests/unit/.gitkeep`
- Create: `tests/api/.gitkeep`
- Modify: `package.json`

- [ ] **Step 1: 確認目前缺什麼**

```bash
cd C:/Users/JasonLee/claude_code_projects/Feedbites
grep -c "^DATABASE_URL=" .env.local || echo "DATABASE_URL 不存在"
grep -c "^AUTH_SECRET=" .env.local || echo "AUTH_SECRET 不存在"
```

Expected: 兩行都印出「不存在」。

- [ ] **Step 2: 起一個本機測試資料庫**

**不要**把本機開發指向正式站資料庫 —— Task 3、5、7 的測試會寫入資料。

用 Docker 起一個與正式站相同 schema 的本機 Postgres：

```bash
docker run -d --name feedbites-testdb \
  -e POSTGRES_PASSWORD=localdev \
  -e POSTGRES_DB=feedbites \
  -p 5433:5432 \
  postgres:16
```

> 用 5433 避免與本機既有 Postgres 衝突。

等容器就緒後套用正式站 schema：

```bash
docker cp scripts/feedbites-pg-schema.sql feedbites-testdb:/tmp/schema.sql
docker exec feedbites-testdb psql -U postgres -d feedbites -f /tmp/schema.sql
```

Expected: 一連串 `CREATE TABLE` / `CREATE INDEX`，無 ERROR。

> 用 `scripts/feedbites-pg-schema.sql` 而**不是** `supabase/migrations/*.sql`：
> 後者含 `auth.users`、`auth.uid()` 等 Supabase 專屬語法，套到一般 Postgres 會失敗，
> 而且正式站本來就是用前者。這樣本機環境才與正式站一致。

- [ ] **Step 3: 補進 .env.local**

產生 AUTH_SECRET：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

把以下四行加到 `.env.local`：

```
DATABASE_URL=postgres://postgres:localdev@localhost:5433/feedbites
AUTH_SECRET=<上一步產生的值>
AUTH_URL=http://localhost:3000/feedbites/api/auth
ALLOWED_LOGIN_EMAILS=leechishen@gmail.com
```

確認不會被 commit：`git check-ignore -v .env.local`

- [ ] **Step 4: 驗證資料庫連得上**

```bash
node -e "require('dotenv').config({path:'.env.local'});const p=require('postgres');const s=p(process.env.DATABASE_URL);s\`select 1 as ok\`.then(r=>{console.log('DB OK',r);process.exit(0)}).catch(e=>{console.error('DB FAIL',e.message);process.exit(1)})"
```

Expected: 印出 `DB OK [ { ok: 1 } ]`。若失敗，**停下來解決**，不要進行後續 Task。

- [ ] **Step 5: 安裝測試框架**

```bash
npm install -D @playwright/test
```

Expected: `@playwright/test` 出現在 `package.json` 的 devDependencies。

- [ ] **Step 6: 建立 playwright.config.ts**

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    // 注意：basePath 是 /feedbites，baseURL 必須包含它
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000/feedbites',
  },
})
```

- [ ] **Step 7: 加測試 script**

在 `package.json` 的 `scripts` 內加入三行（放在 `"lint": "eslint"` 之後）：

```json
    "lint": "eslint",
    "test": "playwright test",
    "test:unit": "playwright test tests/unit",
    "test:api": "playwright test tests/api"
```

- [ ] **Step 8: 建立測試目錄**

```bash
mkdir -p tests/unit tests/api
touch tests/unit/.gitkeep tests/api/.gitkeep
```

- [ ] **Step 9: 驗證測試框架可運行**

```bash
npm run test
```

Expected: `No tests found`（不是錯誤訊息）。這表示 runner 正常。

- [ ] **Step 10: 更新 .env.example**

`.env.example` 目前只有兩個 Supabase 變數，嚴重過時。改為完整清單（**不含任何真實值**）：

```
# ── Database ──
DATABASE_URL=postgres://user:pass@host:5432/dbname

# ── Auth (NextAuth v5) ──
AUTH_SECRET=run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
AUTH_URL=http://localhost:3000/feedbites/api/auth
AUTH_GOOGLE_ID=your-google-oauth-client-id
AUTH_GOOGLE_SECRET=your-google-oauth-client-secret
# 逗號分隔，只有名單內的 Google 帳號可以登入後台。留空 = 全部拒絕（fail-closed）
ALLOWED_LOGIN_EMAILS=owner@example.com

# ── Supabase (storage only) ──
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ── AI ──
GEMINI_API_KEY=your-gemini-key

# ── LINE 通知（店家回饋推播）──
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
OWNER_LINE_USER_ID=your-line-user-id
PROJECT_DISPLAY_NAME=FeedBites

# ── Email ──
RESEND_API_KEY=your-resend-key
EMAIL_FROM=noreply@example.com

# ── Cron ──
CRON_SECRET=your-cron-secret
```

- [ ] **Step 11: 確認 .env.local 沒有被 git 追蹤**

```bash
git status --short
```

Expected: 輸出中**不得**出現 `.env.local`。若出現，立刻停止並修正 `.gitignore`。

- [ ] **Step 12: Commit**

```bash
git add playwright.config.ts package.json package-lock.json .env.example tests/
git commit -m "chore: add playwright test harness and complete .env.example

Local dev was missing DATABASE_URL and AUTH_SECRET entirely; .env.example
only documented 2 of 15 required vars.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 1: 結構化 logger 與 request_id

**Files:**
- Create: `src/lib/logger.ts`
- Create: `tests/unit/logger.spec.ts`

規格第 3 項。這個先做，後續 Task 都會用到它。

- [ ] **Step 1: 寫失敗的測試**

Create `tests/unit/logger.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { maskPhone, maskEmail } from '../../src/lib/logger'

test('maskPhone 只保留前 2 碼與後 3 碼', () => {
  expect(maskPhone('0912345678')).toBe('09**-***-678')
  expect(maskPhone('09-1234-5678')).toBe('09**-***-678')
})

test('maskPhone 處理空值與過短輸入', () => {
  expect(maskPhone(null)).toBeNull()
  expect(maskPhone(undefined)).toBeNull()
  expect(maskPhone('')).toBeNull()
  expect(maskPhone('12')).toBe('***')
})

test('maskEmail 只保留首字與網域', () => {
  expect(maskEmail('jason@gmail.com')).toBe('j***@gmail.com')
  expect(maskEmail('a@b.co')).toBe('a***@b.co')
})

test('maskEmail 處理空值與無效格式', () => {
  expect(maskEmail(null)).toBeNull()
  expect(maskEmail('not-an-email')).toBe('***')
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../src/lib/logger'`

- [ ] **Step 3: 實作 logger**

Create `src/lib/logger.ts`:

```typescript
// src/lib/logger.ts
// 單行 JSON 輸出到 stdout/stderr，由 Docker/journald 收集即可，不引入外部服務。
// 嚴禁記錄完整電話、email 或問卷答案內容 —— 一律先遮罩。

type Level = 'info' | 'warn' | 'error'

export type LogContext = {
  request_id?: string
  store_id?: string
  survey_id?: string
  response_id?: string
  [key: string]: unknown
}

export function newRequestId(): string {
  return crypto.randomUUID()
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 5) return '***'
  return `${digits.slice(0, 2)}**-***-${digits.slice(-3)}`
}

export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null
  const at = email.indexOf('@')
  if (at < 1 || at === email.length - 1) return '***'
  return `${email.slice(0, 1)}***@${email.slice(at + 1)}`
}

function emit(level: Level, event: string, ctx: LogContext, msg: string): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...ctx,
    msg,
  })
  if (level === 'error') console.error(line)
  else console.log(line)
}

export const logger = {
  info: (event: string, ctx: LogContext, msg: string) => emit('info', event, ctx, msg),
  warn: (event: string, ctx: LogContext, msg: string) => emit('warn', event, ctx, msg),
  error: (event: string, ctx: LogContext, err: unknown) =>
    emit('error', event, ctx, err instanceof Error ? `${err.name}: ${err.message}` : String(err)),
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm run test:unit`
Expected: 4 passed

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: 無錯誤輸出

- [ ] **Step 6: Commit**

```bash
git add src/lib/logger.ts tests/unit/logger.spec.ts
git commit -m "feat: add structured JSON logger with PII masking

Every catch block in the codebase currently swallows exceptions silently,
making store-owner bug reports impossible to trace.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: 修正 getSelectedStore 漏查 user_id

**Files:**
- Modify: `src/lib/store-context.ts:36-40`

規格第 4 項。五分鐘的修改，比記技術債還快。

- [ ] **Step 1: 確認目前的錯誤寫法**

Run: `sed -n '35,44p' src/lib/store-context.ts`

Expected: 看到 `.where(eq(store_members.store_id, storeId))` —— 只比對 store_id，沒有 user_id。

- [ ] **Step 2: 修正 import**

`src/lib/store-context.ts` 第 4 行改為：

```typescript
import { eq, and, inArray } from 'drizzle-orm';
```

- [ ] **Step 3: 修正 membership 查詢**

把第 36-40 行的區塊：

```typescript
      const [membership] = await db
        .select({ id: store_members.id })
        .from(store_members)
        .where(eq(store_members.store_id, storeId))
        .limit(1);
```

改為：

```typescript
      const [membership] = await db
        .select({ id: store_members.id })
        .from(store_members)
        .where(and(
          eq(store_members.store_id, storeId),
          eq(store_members.user_id, userId),
        ))
        .limit(1);
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 5: 手動驗證**

啟動 dev server：`npm run dev`

1. 登入後台，開瀏覽器 DevTools → Application → Cookies
2. 把 `feedbites_store_id` 改成一個不屬於你的 UUID（隨便編一個合法 UUID，例如 `00000000-0000-0000-0000-000000000001`）
3. 重新整理 `/feedbites/dashboard`

Expected: 退回自己的店或空狀態，**不得**顯示他店資料。

- [ ] **Step 6: Commit**

```bash
git add src/lib/store-context.ts
git commit -m "fix: getSelectedStore membership check ignored user_id

Membership was verified by store_id alone, so any store with at least one
member would authorise any authenticated user holding a matching cookie.
Low impact today (single store) but a real cross-tenant hole the moment a
second store exists.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: 修正公開 PATCH 的 IDOR

**Files:**
- Modify: `src/app/api/surveys/[id]/responses/route.ts:174-215`
- Create: `tests/api/response-patch.spec.ts`

規格第 2 項。目前任何人拿一個 `response_id` 就能改別人的電話/email，且會把該筆的優惠碼寄到指定信箱。

- [ ] **Step 1: 寫失敗的測試**

這個測試需要真實資料。先在測試檔內用 API 自行建立前置資料。

Create `tests/api/response-patch.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

// 執行前提：
//   1. npm run dev 已啟動（http://localhost:3000/feedbites）
//   2. 測試資料庫內存在兩份 is_active=true 的問卷
//   3. 以環境變數提供這兩份問卷的 id
const SURVEY_A = process.env.TEST_SURVEY_A_ID
const SURVEY_B = process.env.TEST_SURVEY_B_ID

test.skip(!SURVEY_A || !SURVEY_B, '需設定 TEST_SURVEY_A_ID 與 TEST_SURVEY_B_ID')

async function submitTo(request: import('@playwright/test').APIRequestContext, surveyId: string) {
  const res = await request.post(`/api/surveys/${surveyId}/responses`, {
    data: { answers: { q1: 'test' }, xp_earned: 10, skip_discount: true },
  })
  expect(res.status()).toBe(201)
  const body = await res.json()
  return body.response.id as string
}

test('PATCH 拒絕跨問卷的 response_id', async ({ request }) => {
  const responseIdA = await submitTo(request, SURVEY_A!)

  // 用 A 的 response_id 打 B 的端點
  const res = await request.patch(`/api/surveys/${SURVEY_B}/responses`, {
    data: { response_id: responseIdA, phone: '0912345678' },
  })

  expect(res.status()).toBe(404)
})

test('PATCH 在時間窗內允許補填電話', async ({ request }) => {
  const responseId = await submitTo(request, SURVEY_A!)

  const res = await request.patch(`/api/surveys/${SURVEY_A}/responses`, {
    data: { response_id: responseId, phone: '0912345678' },
  })

  expect(res.status()).toBe(200)
})

test('PATCH 對不存在的 response_id 回 404', async ({ request }) => {
  const res = await request.patch(`/api/surveys/${SURVEY_A}/responses`, {
    data: { response_id: '00000000-0000-0000-0000-000000000001', phone: '0912345678' },
  })

  expect(res.status()).toBe(404)
})
```

- [ ] **Step 2: 準備測試資料並執行測試確認失敗**

在後台建立兩份問卷（或用既有的兩份），取得 id 後：

```bash
npm run dev   # 另一個終端機保持執行
TEST_SURVEY_A_ID=<uuid-a> TEST_SURVEY_B_ID=<uuid-b> npm run test:api
```

Expected: 第一個測試 FAIL —— 實際回 200（因為目前沒有任何約束），預期 404。

- [ ] **Step 3: 修正 import**

`src/app/api/surveys/[id]/responses/route.ts` 第 5 行改為：

```typescript
import { eq, and, desc } from 'drizzle-orm'
```

第 9 行之後加入：

```typescript
import { logger, newRequestId, maskPhone } from '@/lib/logger'
```

- [ ] **Step 4: 改寫 PATCH 開頭的驗證邏輯**

把第 174-199 行（從 `export async function PATCH` 到 `.where(eq(responses.id, response_id))`）整段替換為：

```typescript
// PATCH: Update phone/email on an existing response (public, time-boxed)
// 約束：①只能改同一份問卷底下的 response ②只能在提交後 30 分鐘內改
// 正當用途是「客人填完後回頭補留聯絡方式」，該行為必定發生在填答後短時間內。
const PATCH_WINDOW_MS = 30 * 60 * 1000

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const request_id = newRequestId()
  try {
    const { id } = await params
    const body = await request.json()
    const { response_id, phone, email, prize_label, prize_emoji } = body

    if (!response_id) {
      return NextResponse.json({ error: '缺少參數', request_id }, { status: 400 })
    }

    const updates: Record<string, string> = {}
    if (phone) updates.phone = phone
    if (email) updates.email = email

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '沒有要更新的欄位', request_id }, { status: 400 })
    }

    // ① 必須屬於網址上這份問卷
    const [existing] = await db
      .select({ id: responses.id, submitted_at: responses.submitted_at })
      .from(responses)
      .where(and(
        eq(responses.id, response_id),
        eq(responses.survey_id, id),
      ))
      .limit(1)

    if (!existing) {
      logger.warn('response.patch.not_found',
        { request_id, survey_id: id, response_id, attempted_phone: maskPhone(phone) },
        'response_id does not belong to this survey')
      return NextResponse.json({ error: '找不到可修改的回覆', request_id }, { status: 404 })
    }

    // ② 必須在時間窗內
    const submittedAt = existing.submitted_at ? new Date(existing.submitted_at).getTime() : 0
    if (Date.now() - submittedAt > PATCH_WINDOW_MS) {
      logger.warn('response.patch.expired', { request_id, survey_id: id, response_id },
        'edit window expired')
      return NextResponse.json({ error: '已超過可修改時間', request_id }, { status: 403 })
    }

    await db
      .update(responses)
      .set(updates)
      .where(eq(responses.id, response_id))
```

> 保留原本第 200 行之後的寄信邏輯不動（`if (email && process.env.RESEND_API_KEY)` 那一段）。
> `prize_label` / `prize_emoji` 從 body 解構出來但原本就沒被使用 —— 維持現狀，不在本 Task 處理。

- [ ] **Step 5: 補上 PATCH 的 catch 區塊日誌**

找到 PATCH 函式尾端的 catch（原本是空的或只回 500），改為：

```typescript
  } catch (err) {
    logger.error('response.patch.failed', { request_id }, err)
    return NextResponse.json({ error: '伺服器錯誤', request_id }, { status: 500 })
  }
}
```

- [ ] **Step 6: 執行測試確認通過**

```bash
TEST_SURVEY_A_ID=<uuid-a> TEST_SURVEY_B_ID=<uuid-b> npm run test:api
```

Expected: 3 passed

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 8: Commit**

```bash
git add src/app/api/surveys/\[id\]/responses/route.ts tests/api/response-patch.spec.ts
git commit -m "fix: public response PATCH allowed IDOR and email exfiltration

The endpoint updated by response_id alone, without binding to the survey in
the URL and with no ownership proof. Anyone holding a response UUID could
overwrite another person's phone/email, and supplying an email caused that
response's discount code to be mailed to the attacker.

Now requires the response to belong to the URL's survey and to be within a
30-minute edit window.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: 補上 POST 與 GET 的錯誤日誌

**Files:**
- Modify: `src/app/api/surveys/[id]/responses/route.ts:46, 100-113, 169-171`

規格第 3 項的後半。Task 1 建好 logger，這裡接上最關鍵的三個吞錯點。

- [ ] **Step 1: 修正 GET 的 catch（原第 46 行）**

```typescript
  } catch (err) {
    logger.error('response.list.failed', {}, err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
```

- [ ] **Step 2: 在 POST 開頭加上 request_id**

把 `export async function POST(` 底下的 `try {` 之前加一行：

```typescript
) {
  const request_id = newRequestId()
  try {
    const { id } = await params
```

- [ ] **Step 3: 修正 LINE 推播的靜默 catch（原第 113 行）**

把 `        } catch {}` 改為：

```typescript
        } catch (err) {
          logger.error('line.urgent_alert.failed', { request_id, survey_id: id }, err)
        }
```

- [ ] **Step 4: 修正 POST 的 catch（原第 169-171 行）**

```typescript
  } catch (err) {
    logger.error('response.submit.failed', { request_id }, err)
    return NextResponse.json({ error: '伺服器錯誤', request_id }, { status: 500 })
  }
```

- [ ] **Step 5: 驗證日誌可用且不含個資**

啟動 `npm run dev`，用真實格式的電話與 email 完整填一次問卷，然後：

```bash
# 檢查 dev server 的終端機輸出
```

Expected:
- 正常流程無 error 日誌
- 若刻意送出壞資料（例如 `answers` 傳字串），終端機出現含 `"event":"response.submit.failed"` 與 `"request_id"` 的單行 JSON
- 日誌中**不得**出現完整電話號碼或完整 email

刻意觸發錯誤的指令：

```bash
curl -s -X POST http://localhost:3000/feedbites/api/surveys/<survey-id>/responses \
  -H "Content-Type: application/json" \
  -d '{"answers":"this-should-be-an-object"}' | head -c 300
```

Expected: 回傳 400（`缺少回答內容`）。要觸發 500 可暫時把 `DATABASE_URL` 改錯再試。

- [ ] **Step 6: Typecheck 與 lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: 皆無錯誤

- [ ] **Step 7: Commit**

```bash
git add src/app/api/surveys/\[id\]/responses/route.ts
git commit -m "feat: log swallowed exceptions in response API with request_id

GET/POST catch blocks returned 500 with no record, and the LINE alert path
used a bare catch {}. Store-owner reports were untraceable.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: 新增 device_key 欄位與寫入

**Files:**
- Create: `supabase/migrations/020_response_device_key.sql`
- Modify: `scripts/feedbites-pg-schema.sql`（**正式站實際使用的 schema，漏改這個等於沒改**）
- Modify: `src/lib/db/schema.ts:79-88`
- Modify: `src/app/s/[surveyId]/SurveyClient.tsx`
- Modify: `src/app/api/surveys/[id]/responses/route.ts`

規格第 6 項。**重要：這不是用來擋重複填寫的。** 重複填寫是刻意允許的行銷策略，發券行為完全不變。

> ### 兩份 schema 都要改
> `supabase/migrations/` 是舊的 Supabase 版本；`scripts/feedbites-pg-schema.sql` 才是 EC2 正式站用的。
> 只改前者的話，正式站不會有 `device_key` 欄位，Step 5 的寫入會直接失敗。

- [ ] **Step 1: 建立 migration**

Create `supabase/migrations/020_response_device_key.sql`:

```sql
-- 020: device_key — 供 AI 分析去重用
--
-- 這個欄位「不」用來阻擋重複填寫。重複填寫是刻意允許的（Jason 2026-08-10 決策：
-- 讓客人有佔便宜心態、主動宣傳來店），發券行為完全不受影響。
--
-- 用途：AI 意見分析時把同一裝置的多筆回應收斂成一筆（取最新），
-- 避免同一人的意見被放大成多人共識，導致店長依錯誤結論調整菜單。
--
-- 值為前端產生的隨機 UUID，存在 localStorage，不含任何個人資訊。
-- 舊資料為 NULL，一律各自視為獨立填答。

ALTER TABLE responses ADD COLUMN IF NOT EXISTS device_key TEXT;
CREATE INDEX IF NOT EXISTS idx_responses_device_key ON responses(device_key);
```

- [ ] **Step 2: 同步更新正式站 schema**

`scripts/feedbites-pg-schema.sql` 的 `responses` 表定義，在 `xp_earned` 之後加入 `device_key`：

```sql
CREATE TABLE IF NOT EXISTS responses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       UUID        REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  answers         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  respondent_name TEXT,
  phone           TEXT,
  email           TEXT,
  xp_earned       INTEGER,
  device_key      TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW()
);
```

並在該表的 index 區塊補一行：

```sql
CREATE INDEX IF NOT EXISTS idx_responses_device_key ON responses(device_key);
```

> `CREATE TABLE IF NOT EXISTS` 對**既有**資料庫不會生效 —— 正式站已經有 responses 表了。
> 因此還要在檔案**最末尾**加一段給既有資料庫用的 ALTER：
>
> ```sql
> -- ── 020: device_key（對既有資料庫補欄位）──
> ALTER TABLE responses ADD COLUMN IF NOT EXISTS device_key TEXT;
> CREATE INDEX IF NOT EXISTS idx_responses_device_key ON responses(device_key);
> ```
>
> 這樣不論是全新建置或既有資料庫，跑同一份檔案都會得到 device_key 欄位。

- [ ] **Step 3: 套用到本機測試資料庫**

```bash
docker exec feedbites-testdb psql -U postgres -d feedbites \
  -c "ALTER TABLE responses ADD COLUMN IF NOT EXISTS device_key TEXT;" \
  -c "CREATE INDEX IF NOT EXISTS idx_responses_device_key ON responses(device_key);"
```

Expected: `ALTER TABLE` 與 `CREATE INDEX`，無 ERROR。

驗證欄位存在：

```bash
docker exec feedbites-testdb psql -U postgres -d feedbites -c "\d responses"
```

Expected: 輸出中看得到 `device_key | text`。

- [ ] **Step 4: 更新 Drizzle schema**

`src/lib/db/schema.ts` 的 `responses` 定義（第 79-88 行），在 `xp_earned` 之後加一行：

```typescript
export const responses = pgTable('responses', {
  id:              uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  survey_id:       uuid('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  answers:         jsonb('answers').notNull().default(sql`'{}'::jsonb`),
  respondent_name: text('respondent_name'),
  phone:           text('phone'),
  email:           text('email'),
  xp_earned:       integer('xp_earned'),
  device_key:      text('device_key'),
  submitted_at:    timestamp('submitted_at', { withTimezone: true }).default(sql`NOW()`),
})
```

- [ ] **Step 5: 前端產生並送出 device_key**

`src/app/s/[surveyId]/SurveyClient.tsx`，在 `markAsSubmitted` 函式（第 23-30 行）之後加入：

```typescript
// 裝置識別碼：僅供 AI 分析去重，不用於阻擋重複填寫。
// 隨機 UUID，不含任何個人資訊。清除 localStorage 後會視為新裝置（已知限制，可接受）。
function getDeviceKey(): string {
  const KEY = 'feedbites_device_key';
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return '';
  }
}
```

接著在 `submitResponse` 的 fetch body（第 146-151 行）加入 `device_key`：

```typescript
        body: JSON.stringify({
          answers: finalAnswers,
          phone: phoneNumber || undefined,
          xp_earned: xpScore,
          skip_discount: false,
          device_key: getDeviceKey(),
        }),
```

- [ ] **Step 6: 後端接收並寫入**

`src/app/api/surveys/[id]/responses/route.ts` 第 71 行的解構加入 `device_key`：

```typescript
    const { answers, respondent_name, phone, xp_earned, skip_discount, device_key } = body
```

在 insert 的 values 內加入（第 78-82 行附近，`xp_earned` 之後）：

```typescript
        device_key: typeof device_key === 'string' && device_key.length <= 64 ? device_key : null,
```

> 長度上限 64 是防呆：欄位只該收 UUID（36 字元），不接受任意長字串。

- [ ] **Step 7: 驗證寫入**

啟動 dev server，用瀏覽器填一次問卷，然後：

```bash
node -e "require('dotenv').config({path:'.env.local'});const p=require('postgres');const s=p(process.env.DATABASE_URL);s\`select id, device_key, submitted_at from responses order by submitted_at desc limit 3\`.then(r=>{console.table(r);process.exit(0)})"
```

Expected: 最新一筆的 `device_key` 有 UUID 值。

同一瀏覽器**再填一次**，重跑上面指令。

Expected: 兩筆的 `device_key` **相同**，且兩筆都存在（沒有被擋掉）。

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/020_response_device_key.sql scripts/feedbites-pg-schema.sql src/lib/db/schema.ts src/app/s/\[surveyId\]/SurveyClient.tsx src/app/api/surveys/\[id\]/responses/route.ts
git commit -m "feat: record device_key on responses for AI de-duplication

Repeat submissions stay intentionally unblocked (marketing decision), but
one person filling ten times must not read as ten people in the AI report.
device_key is a random UUID in localStorage carrying no personal data.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: 儀表板顯示不重複裝置數

**Files:**
- Modify: `src/app/dashboard/surveys/[id]/page.tsx:63-80`

規格第 6 項的後半。讓店長看得出「行銷聲量」與「真實客數」的差別。

- [ ] **Step 1: 讀取 device_key 並計算**

`src/app/dashboard/surveys/[id]/page.tsx`，找到第 63-66 行的 `discountCodeRows` 查詢，在它**之前**加入：

```typescript
  const deviceRows = await db
    .select({ device_key: responses.device_key })
    .from(responses)
    .where(eq(responses.survey_id, id));

  // 不重複裝置數：device_key 為 NULL 的舊資料一律各自視為獨立填答
  const uniqueDevices = new Set(
    deviceRows.map((r, i) => r.device_key ?? `__legacy_${i}`)
  ).size;
```

> 確認檔案頂端的 import 已包含 `responses`（第 6 行原本就有：`import { surveys, responses, discount_codes } from '@/lib/db/schema';`）。

- [ ] **Step 2: 修正「已使用」統計的文案**

第 77-79 行維持計算不變，但要在 UI 上正名。先定位 JSX：

```bash
grep -n "usedCodes\|codeUsageRate\|已使用" "src/app/dashboard/surveys/[id]/page.tsx"
```

把該處的標籤文字從「已使用」改為「已核銷（店長標記）」，明確表達這是人工記錄而非系統驗證。

> 若該區塊目前顯示 `codeUsageRate`，一併確認：在 Task 7 完成前這個數字會是 0%，屬預期行為。

- [ ] **Step 3: 加上「不重複裝置」統計卡**

在顯示 `totalResponses` 的統計卡片附近，加入一張新卡：

```tsx
<div className="rounded-xl border border-gray-100 bg-white p-4">
  <p className="text-xs text-gray-500">不重複裝置</p>
  <p className="mt-1 text-2xl font-black text-gray-800">{uniqueDevices}</p>
  <p className="mt-1 text-xs text-gray-400">總填答 {totalResponses} 次</p>
</div>
```

> 實際 className 請比照該檔案既有統計卡的樣式，不要引入新的視覺語言。

- [ ] **Step 4: 手動驗證**

同一瀏覽器填 3 次問卷，開啟該問卷的儀表板頁。

Expected: 顯示「不重複裝置 1 / 總填答 3 次」。

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/surveys/\[id\]/page.tsx
git commit -m "feat: show unique device count alongside total responses

Lets the owner tell marketing reach apart from actual customer count.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6b: AI 分析端依 device_key 去重

**Files:**
- Create: `src/lib/dedupe.ts`
- Create: `tests/unit/dedupe.spec.ts`
- Modify: `src/app/api/ai/feedback-analyze/route.ts:46-66`

規格第 6 項的核心。**沒有這個 Task，device_key 只是儀表板上一個好看的數字，AI 報告照樣被污染** —— 那正是目標 B 要防的事。

- [ ] **Step 1: 寫失敗的測試**

Create `tests/unit/dedupe.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { dedupeByDevice } from '../../src/lib/dedupe'

type Row = { id: string; device_key?: string | null; submitted_at?: string | null }

test('同一裝置只保留最新一筆', () => {
  const rows: Row[] = [
    { id: 'a', device_key: 'dev-1', submitted_at: '2026-08-01T10:00:00Z' },
    { id: 'b', device_key: 'dev-1', submitted_at: '2026-08-03T10:00:00Z' },
    { id: 'c', device_key: 'dev-1', submitted_at: '2026-08-02T10:00:00Z' },
  ]
  const out = dedupeByDevice(rows)
  expect(out).toHaveLength(1)
  expect(out[0].id).toBe('b')
})

test('不同裝置各自保留', () => {
  const rows: Row[] = [
    { id: 'a', device_key: 'dev-1', submitted_at: '2026-08-01T10:00:00Z' },
    { id: 'b', device_key: 'dev-2', submitted_at: '2026-08-02T10:00:00Z' },
  ]
  expect(dedupeByDevice(rows)).toHaveLength(2)
})

test('device_key 為 null 的舊資料各自獨立，不被合併', () => {
  const rows: Row[] = [
    { id: 'a', device_key: null, submitted_at: '2026-08-01T10:00:00Z' },
    { id: 'b', device_key: null, submitted_at: '2026-08-02T10:00:00Z' },
    { id: 'c', device_key: undefined, submitted_at: '2026-08-03T10:00:00Z' },
  ]
  expect(dedupeByDevice(rows)).toHaveLength(3)
})

test('輸出依 submitted_at 由新到舊排序', () => {
  const rows: Row[] = [
    { id: 'old', device_key: 'dev-1', submitted_at: '2026-08-01T10:00:00Z' },
    { id: 'new', device_key: 'dev-2', submitted_at: '2026-08-05T10:00:00Z' },
    { id: 'mid', device_key: null, submitted_at: '2026-08-03T10:00:00Z' },
  ]
  expect(dedupeByDevice(rows).map(r => r.id)).toEqual(['new', 'mid', 'old'])
})

test('空陣列不炸', () => {
  expect(dedupeByDevice([])).toEqual([])
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../src/lib/dedupe'`

- [ ] **Step 3: 實作**

Create `src/lib/dedupe.ts`:

```typescript
// src/lib/dedupe.ts
// 供 AI 意見分析使用：把同一裝置的多筆回應收斂成最新一筆。
//
// 為什麼需要：重複填寫是刻意允許的（行銷策略），但同一人填十次不能在 AI 報告裡
// 讀成十個人的共識，否則店長會照著被放大的單一意見改菜單。
//
// 只取最新一筆，不做合併 —— 合併同一人前後矛盾的答案會拼出實際上不存在的意見。
// device_key 為空的舊資料一律各自視為獨立填答。

export function dedupeByDevice<
  T extends { device_key?: string | null; submitted_at?: Date | string | null }
>(rows: T[]): T[] {
  const latestByDevice = new Map<string, T>()
  const legacy: T[] = []

  const timeOf = (r: T): number =>
    r.submitted_at ? new Date(r.submitted_at).getTime() : 0

  for (const row of rows) {
    const key = row.device_key
    if (!key) {
      legacy.push(row)
      continue
    }
    const existing = latestByDevice.get(key)
    if (!existing || timeOf(row) > timeOf(existing)) {
      latestByDevice.set(key, row)
    }
  }

  return [...latestByDevice.values(), ...legacy].sort((a, b) => timeOf(b) - timeOf(a))
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm run test:unit`
Expected: 9 passed（Task 1 的 logger 4 個 + 本 Task 的 5 個）

- [ ] **Step 5: 套用到 feedback-analyze**

`src/app/api/ai/feedback-analyze/route.ts`：

先在檔案頂端 import 區加入：

```typescript
import { dedupeByDevice } from '@/lib/dedupe'
```

第 46-54 行的 select 加入 `device_key`：

```typescript
    const responseRows = await db
      .select({
        id: responses.id,
        survey_id: responses.survey_id,
        respondent_name: responses.respondent_name,
        answers: responses.answers,
        submitted_at: responses.submitted_at,
        xp_earned: responses.xp_earned,
        device_key: responses.device_key,
      })
      .from(responses)
```

第 62-66 行的 `filteredResponses` 之後，把餵給 AI 的陣列換成去重後的版本。把：

```typescript
    // Filter by period in memory (avoids complex date range with inArray)
    const filteredResponses = responseRows.filter((r) => {
      if (!r.submitted_at) return false;
      const t = new Date(r.submitted_at);
      return t >= periodStart && t <= periodEnd;
    });
```

改為：

```typescript
    // Filter by period in memory (avoids complex date range with inArray)
    const periodResponses = responseRows.filter((r) => {
      if (!r.submitted_at) return false;
      const t = new Date(r.submitted_at);
      return t >= periodStart && t <= periodEnd;
    });

    // 同一裝置的重複填答只取最新一筆，避免單一顧客的意見被放大成多人共識。
    // 注意：這只影響「意見分析」，發券張數與填答次數統計不受影響。
    const filteredResponses = dedupeByDevice(periodResponses);
```

> 變數名保持 `filteredResponses` 不變，下游程式碼（第 68 行起）完全不用改。

- [ ] **Step 6: 檢查其他 AI 讀取點**

```bash
git grep -n "from(responses)" -- "src/app/api/ai/*"
```

Expected: 列出 `assistant-stats/route.ts:46,57` 與 `feedback-analyze/route.ts:55,233`。

逐一判斷：

| 位置 | 是否需要去重 |
|---|---|
| `feedback-analyze:55` | **要** —— 已於 Step 5 處理 |
| `feedback-analyze:233` | 檢視用途；若同樣是餵給 AI 做意見分析則套用，若是計數則**不要**套用 |
| `assistant-stats:46,57` | **不要** —— 這是統計數量，填答次數本來就該算全部 |

> 判斷原則：**意見分析要去重，數量統計不去重。**

- [ ] **Step 7: 手動驗證**

同一瀏覽器對同一份問卷填 3 次不同答案，然後在後台觸發 AI 分析。

Expected: AI 報告不會出現「多位顧客反映…」這類把單一裝置當成多人的敘述；分析基礎只有最新那筆。

可加一行暫時的 log 佐證：

```typescript
    console.log(`[dedupe] ${periodResponses.length} responses -> ${filteredResponses.length} unique devices`);
```

Expected: 印出 `[dedupe] 3 responses -> 1 unique devices`。驗證完**移除這行**。

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 9: Commit**

```bash
git add src/lib/dedupe.ts tests/unit/dedupe.spec.ts src/app/api/ai/feedback-analyze/route.ts
git commit -m "feat: de-duplicate responses by device before AI analysis

Repeat submissions stay unblocked, but feeding ten entries from one person
into the report would manufacture a consensus that does not exist — worse
than having no report, because the owner would act on it.

Opinion analysis de-duplicates; count statistics deliberately do not.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: 優惠券店員手動標記已核銷

**Files:**
- Create: `src/app/api/discounts/[code]/mark/route.ts`
- Modify: `src/app/dashboard/surveys/[id]/page.tsx`（優惠券清單區塊）

規格第 5 項。**純記帳工具**：不防重複、不防偽造，符合「優惠碼當行銷」的決定。存在理由是儀表板不能一直顯示假的「已使用 0 張」，那會讓店長認定系統不可信。

> 注意：`src/app/api/discounts/verify/` 目前是**空目錄**（git 從未追蹤過任何檔案）。本 Task 不使用該路徑，改用 `[code]/mark`。空目錄不需處理，git 本來就不會追蹤。

- [ ] **Step 1: 建立 API**

Create `src/app/api/discounts/[code]/mark/route.ts`:

```typescript
// 店員手動標記優惠券已核銷。
//
// 這「不是」嚴格核銷機制：不防重複使用、不防偽造、不驗證顧客身分。
// 依 Jason 2026-08-10 決策，優惠碼被複製視為行銷成本。
// 本 API 的唯一目的是讓店長能自己記帳，使儀表板數字有意義。
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { discount_codes, surveys } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSelectedStore } from '@/lib/store-context'
import { logger, newRequestId } from '@/lib/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const request_id = newRequestId()
  try {
    const { code } = await params

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授權', request_id }, { status: 401 })
    }

    const store = await getSelectedStore(session.user.id)
    if (!store) {
      return NextResponse.json({ error: '找不到店家', request_id }, { status: 404 })
    }

    const body = await request.json()
    const { used } = body
    if (typeof used !== 'boolean') {
      return NextResponse.json({ error: 'used 必須是 boolean', request_id }, { status: 400 })
    }

    // 該優惠碼必須屬於目前選定店家的問卷
    const [row] = await db
      .select({ id: discount_codes.id })
      .from(discount_codes)
      .innerJoin(surveys, eq(discount_codes.survey_id, surveys.id))
      .where(and(
        eq(discount_codes.code, code),
        eq(surveys.store_id, store.id),
      ))
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: '找不到優惠碼', request_id }, { status: 404 })
    }

    await db
      .update(discount_codes)
      .set({ is_used: used, used_at: used ? new Date() : null })
      .where(eq(discount_codes.id, row.id))

    logger.info('discount.mark', { request_id, store_id: store.id }, `marked used=${used}`)
    return NextResponse.json({ ok: true, used, request_id })
  } catch (err) {
    logger.error('discount.mark.failed', { request_id }, err)
    return NextResponse.json({ error: '伺服器錯誤', request_id }, { status: 500 })
  }
}
```

- [ ] **Step 2: 儀表板優惠券清單加切換按鈕**

在 `src/app/dashboard/surveys/[id]/page.tsx` 的優惠券清單區塊，每筆加一個按鈕。因為該頁是 Server Component，需要一個 Client Component 來處理點擊。

Create `src/app/dashboard/surveys/[id]/MarkUsedButton.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MarkUsedButton({ code, initialUsed }: { code: string; initialUsed: boolean }) {
  const [used, setUsed] = useState(initialUsed);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/feedbites/api/discounts/${encodeURIComponent(code)}/mark`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ used: !used }),
      });
      if (res.ok) {
        setUsed(!used);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50 ${
        used ? 'bg-gray-200 text-gray-600' : 'bg-orange-500 text-white'
      }`}
    >
      {busy ? '處理中…' : used ? '取消核銷' : '標記已核銷'}
    </button>
  );
}
```

- [ ] **Step 3: 在頁面查詢中補上 code 欄位**

`src/app/dashboard/surveys/[id]/page.tsx` 第 63-66 行的 `discountCodeRows` 查詢，加入 `code`：

```typescript
  const discountCodeRows = await db
    .select({
      code: discount_codes.code,
      is_used: discount_codes.is_used,
      created_at: discount_codes.created_at,
      expires_at: discount_codes.expires_at,
    })
    .from(discount_codes)
    .where(eq(discount_codes.survey_id, id));
```

在優惠券清單的 JSX 內引入並使用：

```tsx
import MarkUsedButton from './MarkUsedButton';
// ...
<MarkUsedButton code={c.code} initialUsed={!!c.is_used} />
```

- [ ] **Step 4: 手動驗證**

1. 登入後台，開啟有優惠碼的問卷頁
2. 點「標記已核銷」→ 按鈕變成「取消核銷」
3. 重新整理 → 狀態保持
4. 確認統計數字從 0 變成 1

- [ ] **Step 5: 驗證授權**

```bash
# 未登入呼叫
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH \
  http://localhost:3000/feedbites/api/discounts/ABC123/mark \
  -H "Content-Type: application/json" -d '{"used":true}'
```

Expected: `401`

- [ ] **Step 6: 驗證資料庫**

```bash
node -e "require('dotenv').config({path:'.env.local'});const p=require('postgres');const s=p(process.env.DATABASE_URL);s\`select code, is_used, used_at from discount_codes where is_used = true limit 5\`.then(r=>{console.table(r);process.exit(0)})"
```

Expected: 被標記的那筆 `is_used = true` 且 `used_at` 有時間值。

- [ ] **Step 7: Typecheck 與 lint**

```bash
npx tsc --noEmit && npm run lint
```

- [ ] **Step 8: Commit**

```bash
git add src/app/api/discounts src/app/dashboard/surveys/\[id\]/
git commit -m "feat: let staff manually mark discount codes as redeemed

discount_codes.is_used existed since the initial schema but nothing ever
wrote true to it, so the dashboard permanently showed '0 used' — an
obviously wrong number that undermines owner trust in the whole tool.

This is bookkeeping only: no atomicity, no anti-fraud, no duplicate
prevention, per the decision to treat coupon copying as marketing spend.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: 登入白名單純函式

**Files:**
- Create: `src/lib/auth-allowlist.ts`
- Create: `tests/unit/auth-allowlist.spec.ts`

規格第 1 項的第一半。這部分**不需要 Google 憑證**就能完成與測試。

- [ ] **Step 1: 寫失敗的測試**

Create `tests/unit/auth-allowlist.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { isEmailAllowed, parseAllowlist } from '../../src/lib/auth-allowlist'

test('未設定白名單時拒絕所有人（fail-closed）', () => {
  expect(isEmailAllowed('anyone@gmail.com', undefined)).toBe(false)
  expect(isEmailAllowed('anyone@gmail.com', '')).toBe(false)
  expect(isEmailAllowed('anyone@gmail.com', '   ')).toBe(false)
})

test('名單內的信箱允許登入', () => {
  expect(isEmailAllowed('boss@gmail.com', 'boss@gmail.com')).toBe(true)
})

test('大小寫與空白不影響比對', () => {
  expect(isEmailAllowed('  BOSS@Gmail.com ', 'boss@gmail.com')).toBe(true)
  expect(isEmailAllowed('boss@gmail.com', ' BOSS@GMAIL.COM , staff@x.com ')).toBe(true)
})

test('名單外的信箱一律拒絕', () => {
  expect(isEmailAllowed('attacker@gmail.com', 'boss@gmail.com,staff@x.com')).toBe(false)
})

test('空信箱拒絕', () => {
  expect(isEmailAllowed(null, 'boss@gmail.com')).toBe(false)
  expect(isEmailAllowed(undefined, 'boss@gmail.com')).toBe(false)
  expect(isEmailAllowed('', 'boss@gmail.com')).toBe(false)
})

test('parseAllowlist 去除空項目', () => {
  expect(parseAllowlist('a@x.com, ,b@x.com,')).toEqual(['a@x.com', 'b@x.com'])
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module '../../src/lib/auth-allowlist'`

- [ ] **Step 3: 實作**

Create `src/lib/auth-allowlist.ts`:

```typescript
// src/lib/auth-allowlist.ts
// 後台登入白名單。純函式、無 DB 依賴，可在 Edge Runtime（middleware）使用。
//
// Fail-closed：白名單為空時拒絕所有人。若有人忘記設定 ALLOWED_LOGIN_EMAILS，
// 結果是全部鎖在門外，而不是全部放行。

export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0)
}

export function isEmailAllowed(
  email: string | null | undefined,
  raw: string | undefined | null,
): boolean {
  const list = parseAllowlist(raw)
  if (list.length === 0) return false

  const normalized = (email || '').trim().toLowerCase()
  if (!normalized) return false

  return list.includes(normalized)
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npm run test:unit`
Expected: 15 passed（Task 1 的 4 個 + Task 6b 的 5 個 + 本 Task 的 6 個）

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-allowlist.ts tests/unit/auth-allowlist.spec.ts
git commit -m "feat: add fail-closed email allowlist helper for admin login

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: 改用 Google OAuth 登入

**Files:**
- Modify: `src/auth.config.ts`
- Modify: `src/auth.ts`
- Delete: `src/app/api/auth/login/route.ts`
- Modify: `src/app/(auth)/login/page.tsx`

規格第 1 項的第二半。**需要 Google OAuth 憑證才能完成驗證。**

> ### 開工前必須確認的事（否則店長會失去自己的店）
>
> 目前 `stores.user_id` 指向 `users.id`。改用 Google 登入後，若店長的 Google email 與
> `users` 表內既有的 email **不一致**，會建立一個新的 user row，店長登入後看不到自己的店。
>
> 先查證：
>
> ```bash
> node -e "require('dotenv').config({path:'.env.local'});const p=require('postgres');const s=p(process.env.DATABASE_URL);s\`select u.id, u.email, count(st.id) as stores from users u left join stores st on st.user_id = u.id group by u.id, u.email\`.then(r=>{console.table(r);process.exit(0)})"
> ```
>
> 把有 store 的那個 email 填進 `ALLOWED_LOGIN_EMAILS`，並確認店長就是用該 Gmail 登入。

> ### 第二個地雷：`users.password_hash` 是 NOT NULL
>
> 正式站 schema（`scripts/feedbites-pg-schema.sql:18`）是 `password_hash TEXT NOT NULL`，
> 但 Drizzle 的 `schema.ts:24` 宣告成可空。因此 `insert(users).values({ email })`：
>
> - 對**既有** email → 走 `onConflictDoUpdate` 的 UPDATE 分支，沒事（現況就是這樣運作）
> - 對**新** email → INSERT 觸發 NOT NULL violation，**登入直接 500**
>
> 白名單裡只要有第二個人（例如店長之外的員工），第一次登入就會炸。Step 3 必須處理。

- [ ] **Step 1: 建立 Google OAuth 憑證**

在 Google Cloud Console 建立 OAuth 2.0 用戶端 ID（類型：網頁應用程式），Authorized redirect URIs 填入**兩個**：

```
http://localhost:3000/feedbites/api/auth/callback/google
https://poc.mcstation.ai/feedbites/api/auth/callback/google
```

把 Client ID / Secret 寫入 `~/.credentials/global.env` 與本機 `.env.local`：

```
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

- [ ] **Step 2: 改寫 auth.config.ts**

Replace `src/auth.config.ts` 全部內容：

```typescript
// auth.config.ts — Edge-compatible auth config (no DB calls, no Node-only deps)
// Used by middleware. Google provider + allowlist gate live here because both
// are Edge-safe; the DB user upsert happens in auth.ts (Node runtime only).
import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import { isEmailAllowed } from '@/lib/auth-allowlist'

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [Google],
  callbacks: {
    signIn({ user }) {
      // Fail-closed: 白名單為空或不在名單內一律拒絕
      return isEmailAllowed(user?.email, process.env.ALLOWED_LOGIN_EMAILS)
    },
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
}
```

- [ ] **Step 3: 改寫 auth.ts（保留既有 users.id 對應）**

Replace `src/auth.ts` 全部內容：

```typescript
// src/auth.ts — Google OAuth only. Credentials provider removed (it accepted
// any string containing '@' and issued a session without verification).
//
// The jwt callback maps the Google identity onto our own users row by email,
// so session.user.id stays the DB uuid that stores.user_id references.
import NextAuth from 'next-auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { authConfig } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.email) {
        const email = user.email.toLowerCase().trim()
        const [row] = await db
          .insert(users)
          // password_hash 在正式站是 NOT NULL，但 Google 登入沒有密碼。
          // 寫入空字串當佔位符 —— 它不再被任何驗證路徑讀取（Credentials provider 已移除），
          // 且空字串不可能通過任何 bcrypt 比對。
          .values({ email, password_hash: '' })
          .onConflictDoUpdate({
            target: users.email,
            set: { updated_at: new Date() },
          })
          .returning({ id: users.id })

        if (row) token.id = row.id
      }
      return token
    },
  },
})
```

> **不要**把 `schema.ts` 的 `password_hash` 改成 `.notNull()` —— 那會讓既有讀取路徑
> 型別變嚴格而連鎖修改。這裡只要保證寫入時一定有值即可。

- [ ] **Step 4: 刪除無驗證的登入路徑**

```bash
git rm src/app/api/auth/login/route.ts
```

- [ ] **Step 5: 改寫登入頁**

`src/app/(auth)/login/page.tsx` 的表單改為 Google 登入按鈕。先讀現有內容再改：

```bash
cat "src/app/(auth)/login/page.tsx"
```

把原本送出 email 到 `/api/auth/login` 的表單，換成呼叫 NextAuth 的 signIn：

```tsx
'use client';

import { signIn } from 'next-auth/react';

// ... 保留原有版面，把表單換成：
<button
  onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
  className="w-full rounded-2xl bg-white border border-gray-200 py-4 font-bold text-gray-700 shadow-sm transition-all active:scale-[0.98]"
>
  使用 Google 帳號登入
</button>
```

> 若該頁是 Server Component，需加 `'use client'` 或把按鈕拆成獨立 Client Component。
> 若登入被拒，NextAuth 會導回 `/login?error=AccessDenied` —— 需在頁面上讀取 `error` query 參數並顯示「此帳號未獲授權」，不要顯示成系統錯誤。

- [ ] **Step 6: 驗證白名單內帳號可登入**

```bash
npm run dev
```

瀏覽 `http://localhost:3000/feedbites/login` → 點 Google 登入 → 用白名單內帳號。

Expected: 成功進入 `/feedbites/dashboard`，且**看得到既有的店家資料**。

> 若進去後看不到店：表示 email 對應錯了。回到本 Task 開頭的查證步驟。

- [ ] **Step 6b: 驗證「白名單內的新帳號」也能登入（password_hash 修正的驗證）**

這一步專門驗證上面那個地雷有修好。在 `.env.local` 的 `ALLOWED_LOGIN_EMAILS` 加入第二個
你有權限的 Gmail（該 email **不得**存在於 `users` 表），重啟 dev server 後用它登入。

Expected: 成功登入（會是一個沒有店的新帳號），**不得**出現 500 或
`null value in column "password_hash" violates not-null constraint`。

驗證資料庫：

```bash
docker exec feedbites-testdb psql -U postgres -d feedbites \
  -c "select email, password_hash = '' as blank_hash from users order by created_at desc limit 3;"
```

Expected: 新帳號那筆 `blank_hash = t`。

驗證完把該 email 從白名單移除。

- [ ] **Step 7: 驗證白名單外帳號被拒**

用另一個 Google 帳號登入。

Expected: 被導回登入頁並顯示未授權訊息，**不是** 500 錯誤頁。

- [ ] **Step 8: 驗證舊登入路徑已消失**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  http://localhost:3000/feedbites/api/auth/login \
  -H "Content-Type: application/json" -d '{"email":"attacker@gmail.com"}'
```

Expected: `404`（或 405），**絕不能是 200**。

- [ ] **Step 9: 驗證未登入仍被擋**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/feedbites/dashboard
```

Expected: `307`

- [ ] **Step 10: Typecheck 與 build**

```bash
npx tsc --noEmit && npm run build
```

Expected: 皆成功。build 特別重要 —— auth 設定錯誤常常只在 build 時才顯現。

- [ ] **Step 12: Commit**

```bash
git add src/auth.ts src/auth.config.ts "src/app/(auth)/login/page.tsx"
git commit -m "fix: replace unverified email login with Google OAuth + allowlist

authorize() previously accepted any string containing '@', created the user
and issued a session — no password, no OTP, no OAuth. Anyone who knew the
owner's email could read every customer's name, phone and email, export CSV,
or call the store reset endpoint.

Google provider with a fail-closed ALLOWED_LOGIN_EMAILS gate. The jwt
callback maps the Google identity onto the existing users row by email so
stores.user_id keeps resolving.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10: 釐清 Vercel／EC2 雙部署

**Files:**
- Modify: `vercel.json` 或刪除
- Modify: `CLAUDE.md`

規格第 7 項。

- [ ] **Step 1: 查 Vercel 專案現況**

```bash
npx vercel projects ls 2>&1 | head -20
npx vercel ls feedbites 2>&1 | head -20
```

> 若 token 過期：`npx vercel login`。專案資訊：`.vercel/project.json` → `prj_kTepX6TYdtAvitj5cjslAjR4gAPC`，team `team_Z61XHNxW9cxRnEvOAqcKLiFA`。

記錄下來：最近一次部署時間、是否有 production domain。

- [ ] **Step 2: 判斷是否雙寫資料庫**

若 Vercel 專案仍有 production 部署，檢查其 `DATABASE_URL` 是否與 EC2 相同：

```bash
npx vercel env ls production 2>&1 | head -20
```

- [ ] **Step 3: 依結果處置**

| 情況 | 動作 |
|---|---|
| Vercel 已無部署 | 刪除 `vercel.json` 的 cron 設定，或整份刪除 |
| Vercel 仍在跑且**不同** DB | 保留但停用 cron，避免混淆 |
| Vercel 仍在跑且**同一個** DB | **立即停用該部署**（移除 production domain 或暫停專案），並回報 Jason |

> 停用生產部署屬於影響外部的動作 —— 執行前先向 Jason 確認。

- [ ] **Step 4: 確定 cron 的唯一執行者**

`vercel.json` 的 cron path 是 `/api/cron/knowledge-refresh`，但 basePath 是 `/feedbites`，實際路徑應為 `/feedbites/api/cron/knowledge-refresh`。

若決定由 EC2 執行，改用 system cron：

```bash
# 在 EC2 上（透過 SSM）
# 每週一 18:00 (UTC+8) 觸發
0 10 * * 1 curl -s -H "Authorization: Bearer $CRON_SECRET" https://poc.mcstation.ai/feedbites/api/cron/knowledge-refresh
```

> 注意時區換算：UTC+8 的 18:00 = UTC 10:00。EC2 的 crontab 通常是 UTC。

- [ ] **Step 5: 更新 CLAUDE.md**

專案 `CLAUDE.md` 目前寫著「推上 GitHub 後 Vercel 自動部署」，與現況不符。改為：

```markdown
## 部署方式
- **正式站在 EC2**：https://poc.mcstation.ai/feedbites
- basePath 為 `/feedbites`，所有 URL 都要加前綴
- 部署腳本：`scripts/deploy-ec2.sh`；nginx 設定：`scripts/nginx-feedbites.conf`
- Vercel 專案狀態：<2026-08-11 查證結果填此>
- cron `knowledge-refresh` 執行者：<EC2 system cron / Vercel，二擇一填此>
```

- [ ] **Step 6: Commit**

```bash
git add vercel.json CLAUDE.md
git commit -m "chore: document actual deployment target and single cron owner

CLAUDE.md claimed Vercel auto-deploy while production actually runs on EC2,
and vercel.json's cron path omitted the /feedbites basePath.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 11: 端到端驗收

**Files:** 無（驗證用）

規格第七節。**全部通過才算 P0 完成。**

- [ ] **Step 1: 全套測試通過**

```bash
npm run test:unit
TEST_SURVEY_A_ID=<uuid-a> TEST_SURVEY_B_ID=<uuid-b> npm run test:api
npx tsc --noEmit
npm run lint
npm run build
```

Expected: 全部成功。

- [ ] **Step 2: 部署到 EC2**

依 `scripts/deploy-ec2.sh`。部署前確認 EC2 的 `.env.prod` 已加入：

```
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
ALLOWED_LOGIN_EMAILS=...
AUTH_URL=https://poc.mcstation.ai/feedbites/api/auth
```

並在正式資料庫套用 migration 020。**套用前先備份：**

```bash
# 備份（在 EC2 上執行）
pg_dump "$DATABASE_URL" > ~/feedbites_backup_20260811.sql
```

- [ ] **Step 3: 正式站 smoke test**

```bash
for u in "https://poc.mcstation.ai/feedbites" \
         "https://poc.mcstation.ai/feedbites/login" \
         "https://poc.mcstation.ai/feedbites/dashboard"; do
  echo "$u -> $(curl -s -o /dev/null -w '%{http_code}' -m 15 "$u")"
done
```

Expected: `200` / `200` / `307`

- [ ] **Step 4: 三端截圖驗證（全域強制規範）**

依 `~/.claude/shared_intel/playbooks/DEPLOY_VERIFICATION.md`，桌面 + iPhone 14 Pro + Pixel 7 三端全過：

```bash
agent-browser open https://poc.mcstation.ai/feedbites/s/<survey-id> && agent-browser screenshot --annotate
agent-browser set device "iPhone 14 Pro"
agent-browser open https://poc.mcstation.ai/feedbites/s/<survey-id> && agent-browser screenshot --annotate
agent-browser set device "Pixel 7"
agent-browser open https://poc.mcstation.ai/feedbites/s/<survey-id> && agent-browser screenshot --annotate
```

檢查：無橫向 overflow、文字可讀、按鈕可點。

- [ ] **Step 5: 真實手機完整跑一次**

用實體手機（不是模擬器）：

1. Safari 開問卷 → 填答 → 拿到優惠碼
2. Chrome 開問卷 → 填答 → 拿到優惠碼
3. 同一支手機再填一次 → **仍可拿到優惠碼**（重複填寫刻意不擋）

- [ ] **Step 6: 店長流程驗證**

1. 白名單內 Google 帳號登入 → 看得到欣殿萬飲的店
2. 非白名單帳號 → 被拒絕
3. 後台看到剛才的回饋
4. 點「標記已核銷」→ 數字更新
5. 儀表板顯示「不重複裝置 1 / 總填答 3 次」

- [ ] **Step 7: 日誌驗證**

```bash
# 在 EC2 上
docker logs feedbites --tail 100 | grep '"level":"error"' | head -5
```

Expected: 可看到含 `request_id` 的結構化錯誤行；**用真實電話與 email 填答後，日誌中不得出現完整號碼或完整信箱**。

- [ ] **Step 8: 完成後記錄**

寫一行到 `~/.claude/shared_intel/PROGRESS_LOG.md`（最新在最上）：

```
[2026-08-11] [CPO] [FeedBites] #P0 #安全 完成：欣殿萬飲啟用前 P0 修復（Google登入白名單／PATCH IDOR／結構化日誌／device_key去重／手動核銷／雙部署釐清），三端驗收通過。產出：commit <hash>
```

並在 `~/.claude/shared_intel/DELIVERABLES_CHECKLIST.md` 加一行待 Jason 確認的項目。

---

## 完成定義

P0 完成 = Task 0-11（含 6b）全部勾選完畢，且：

- [ ] 白名單外的人無法登入後台
- [ ] 無法用他人的 response_id 竄改資料或觸發寄信
- [ ] 錯誤有 request_id 可追，且日誌內無完整個資
- [ ] 儀表板的「已核銷」與「不重複裝置」數字都是真的
- [ ] AI 意見分析已依 device_key 去重（同一人填多次不會被讀成多人共識）
- [ ] 重複填寫仍可拿券（行銷策略未被破壞）
- [ ] 正式站只有 EC2 一套在跑
- [ ] 三端截圖全過

完成後才進入 P1（立牌 QR、短問卷、店長 Today 頁、自願綁定）。

---

## 已知未處理項目（規格明列，本計畫刻意不做）

| 項目 | 為何不做 |
|---|---|
| 嚴格優惠券核銷（原子性、防重複、防偽造） | 優惠碼被複製視為行銷成本 |
| 伺服器端抽獎 | 同上 |
| `xp_earned` 伺服器端驗證 | 同上 |
| 成員角色權限分級 | 只有一間店，延後至第二家店前 |
| RLS 架構重構 | 延後，改以應用層授權為單一防線 |
| 擋掉重複填寫 | 刻意不擋 |
| `LineBrowserGuard` 與未來 LIFF 的衝突 | P2 開始前必須處理，不屬 P0 |
