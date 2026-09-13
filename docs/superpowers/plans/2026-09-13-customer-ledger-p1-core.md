# 顧客帳本 第一包：點數帳、LINE 登入、餐券 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 客人填完問卷後用 LINE 登入（沒有 LINE 的外國客改用 Google）領點數與一張見面禮餐券，點數累積在「客人 × 店」的帳本上，可換餐券，店員一鍵核銷；全站對外品牌換成「常來點 EatAgain」。

**Architecture:** 在既有問卷層下新增「顧客帳本層」：純函式規則（`src/lib/ledger/rules.ts`，可單元測試）＋資料庫服務（`src/lib/ledger/service.ts`，交易內用 advisory lock 防並發）。顧客身分走手寫 OAuth（LINE 為主、Google 為輔），一位客人可綁多個登入方式（`customer_identities` 表），用 HMAC 簽章 cookie `fb_customer`，與店長端 NextAuth 完全分開。

**Tech Stack:** Next.js 16 App Router、drizzle-orm 0.45 + postgres.js、Playwright test runner（專案現有，單元測試也用它）、LINE Login v2.1。

**Spec:** `docs/superpowers/specs/2026-09-13-customer-ledger-design.html`

**本包不含（另兩份計畫）：** 許願與補資料（P2）、菜單素材庫／問卷連菜品 ID／時段分析／總部視角（P3）。

---

## 與 spec 的兩處偏差（已同步改 spec）

1. **LINE Login 不用 NextAuth provider，改手寫 OAuth。** 同一個 app 起第二個 NextAuth 實例會共用 `AUTH_URL`、basePath 與 `authjs.*` cookie 命名空間，和店長端互相干擾的風險高；手寫流程只有 start／callback 兩支路由，完全隔離且可測。
2. **扣點事件名稱改為 `voucher_exchanged`**（spec 原寫 `voucher_redeemed`），避免和「店員核銷」混淆。另新增 `voucher_issued`（0 點，記錄見面禮券發放）。
3. **身分改成多登入方式**（Jason 2026-09-13：外國觀光客沒有 LINE 怎麼辦）。`customers` 不放 `line_user_id`，改用 `customer_identities(provider, subject)`。LINE 服務台灣、日本、泰國客人；Google 服務韓國與歐美客人。完全不想登入的觀光客照舊拿刮刮卡折扣，只是不累積點數。
4. **全站品牌換成「常來點 EatAgain」，FeedBites 字樣從畫面上消失**（Jason 2026-09-13）。網址路徑也從 `/feedbites` 改成 `/eatagain`（Jason 2026-09-13：欣殿萬飲的 QR 還沒印）。舊路徑在 nginx 保留 301 轉址，既有連結與資料庫裡已存的圖片網址不會壞。

## 前置條件（Task 0，需要 Jason 或 CTO 手動）

- [ ] 在 [LINE Developers Console](https://developers.line.biz/console/) 建一個 **LINE Login channel**（Provider 用銓幻元），Callback URL 填：
  - 正式：`https://poc.mcstation.ai/eatagain/api/customer/line/callback`
  - 本機：`http://localhost:3000/eatagain/api/customer/line/callback`
- [ ] 同一 Provider 下的平台級 Messaging API channel（官方帳號）連結到此 Login channel，`bot_prompt=aggressive` 才會邀客人加好友。沒有 OA 時登入仍可用，只是不會出現加好友畫面。
- [ ] 在 Google Cloud Console 既有的 OAuth client（`global.env` 的 `GOOGLE_CLIENT_ID`）加兩個已授權重新導向 URI：`https://poc.mcstation.ai/eatagain/api/customer/google/callback`、`http://localhost:3000/eatagain/api/customer/google/callback`；OAuth 同意畫面的應用程式名稱改成「常來點 EatAgain」。
- [ ] 把 Channel ID 與 Channel secret 寫入 `~/.credentials/global.env`（`FEEDBITES_LINE_LOGIN_CHANNEL_ID`、`FEEDBITES_LINE_LOGIN_CHANNEL_SECRET`），並登記到 `shared_intel/CTO_RESOURCES.md`。

Task 1–12 不依賴 Task 0，可以先做。Task 13 的端到端驗證需要 Task 0。

## 檔案地圖

| 檔案 | 動作 | 責任 |
|---|---|---|
| `supabase/migrations/021_customer_ledger.sql` | Create | 舊版 migration 紀錄 |
| `scripts/feedbites-pg-schema.sql` | Modify（檔尾追加） | **正式站 schema 權威來源** |
| `src/lib/db/schema.ts` | Modify | drizzle 表定義 |
| `src/lib/brand.ts` | Create | 對客品牌名常數 |
| `src/lib/ledger/rules.ts` | Create | 規則型別、預設值、驗證、餘額與到期計算（純函式） |
| `src/lib/ledger/code.ts` | Create | 8 碼餐券代碼 |
| `src/lib/ledger/service.ts` | Create | 所有帳本讀寫 |
| `src/lib/customer-session.ts` | Create | HMAC 簽章、cookie 設定、安全轉址 |
| `src/lib/line-login.ts` | Create | LINE OAuth URL、換 token、驗 id_token |
| `src/lib/google-login.ts` | Create | Google OAuth URL、換 token、驗 id_token |
| `src/lib/customer-login.ts` | Create | 兩種登入共用的 start 與 callback 收尾 |
| `src/app/api/customer/google/start/route.ts`、`callback/route.ts` | Create | Google 登入 |
| `src/app/api/customer/line/start/route.ts` | Create | 導向 LINE |
| `src/app/api/customer/line/callback/route.ts` | Create | LINE 回呼 |
| `src/app/api/customer/logout/route.ts` | Create | 清 cookie |
| `src/app/api/customer/vouchers/route.ts` | Create | 客人用點數換券 |
| `src/app/api/vouchers/[code]/redeem/route.ts` | Create | 店員核銷 |
| `src/app/api/store-point-rules/route.ts` | Create | 店長讀寫規則 |
| `src/app/api/cron/points-expiry/route.ts` | Create | 每日到期扣點 |
| `src/app/api/surveys/[id]/responses/route.ts` | Modify | 已登入客人填完即發點 |
| `src/components/survey/ClaimPointsCard.tsx` | Create | 完成頁的領點卡片 |
| `src/app/s/[surveyId]/SurveyClient.tsx` | Modify | 掛上領點卡片 |
| `src/app/w/[storeId]/page.tsx`、`WalletClient.tsx` | Create | 我的帳本頁 |
| `src/app/dashboard/vouchers/page.tsx`、`VouchersClient.tsx` | Create | 店長：核銷、見面禮券、兌換目錄 |
| `src/components/dashboard/Sidebar.tsx` | Modify | 加導覽項 |
| `src/app/privacy/page.tsx` | Modify | LINE 登入個資說明 |
| `tests/unit/ledger-rules.spec.ts`、`customer-session.spec.ts`、`line-login.spec.ts`、`google-login.spec.ts` | Create | 單元測試 |
| 畫面上所有 FeedBites 字樣、`public/brand/`、`public/manifest.webmanifest`、`public/icons/` | Modify | 品牌換成常來點 EatAgain（Task 12） |
| `tests/api/ledger-service.spec.ts` | Create | 對本機測試資料庫的整合測試 |

## 測試環境

沿用 P0 計畫的本機測試資料庫（`docs/superpowers/plans/2026-08-11-feedbites-p0-launch-readiness.md` Task 0）。若容器不存在：

```bash
docker run -d --name feedbites-testdb -e POSTGRES_PASSWORD=localdev -e POSTGRES_DB=feedbites -p 5433:5432 postgres:16
docker cp scripts/feedbites-pg-schema.sql feedbites-testdb:/tmp/schema.sql
docker exec feedbites-testdb psql -U postgres -d feedbites -f /tmp/schema.sql
```

整合測試環境變數（放 `.env.test.local`，不進版控，`.gitignore` 已排除 `.env*.local`）：

```
DATABASE_URL=postgres://postgres:localdev@localhost:5433/feedbites
CUSTOMER_SESSION_SECRET=test-secret-please-change
TEST_SURVEY_A_ID=<測試庫內一份 is_active 問卷的 id>
TEST_STAFF_USER_ID=<測試庫內一個 users.id>
```

**絕不可**把 `DATABASE_URL` 指向正式站。

---

### Task 1: 資料庫 schema

**Files:**
- Create: `supabase/migrations/021_customer_ledger.sql`
- Modify: `scripts/feedbites-pg-schema.sql`（檔尾追加同一段）
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: 寫 migration**

Create `supabase/migrations/021_customer_ledger.sql`:

```sql
-- 021: 顧客帳本 — 客人、點數帳、店家點數規則、餐券
-- spec: docs/superpowers/specs/2026-09-13-customer-ledger-design.html

CREATE TABLE IF NOT EXISTS customers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name     TEXT,
  picture_url      TEXT,
  birthday         DATE,
  home_area        TEXT,
  visit_freq       TEXT,
  gender           TEXT,
  age_band         TEXT,
  profile_awarded  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 一位客人可以有多個登入方式：line、google（之後可加 kakao、apple）
CREATE TABLE IF NOT EXISTS customer_identities (
  provider     TEXT NOT NULL,
  subject      TEXT NOT NULL,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, subject)
);
CREATE INDEX IF NOT EXISTS idx_customer_identities_customer ON customer_identities(customer_id);

-- 只追加：UPDATE 由 trigger 擋下。DELETE 不擋，讓刪除客人時 CASCADE 能清掉個資。
CREATE TABLE IF NOT EXISTS point_ledger (
  id           BIGSERIAL PRIMARY KEY,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  points       INTEGER NOT NULL,
  ref_type     TEXT,
  ref_id       TEXT,
  award_day    DATE,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, store_id, event_type, ref_id)
);
CREATE INDEX IF NOT EXISTS idx_point_ledger_wallet ON point_ledger(customer_id, store_id);
CREATE INDEX IF NOT EXISTS idx_point_ledger_expiry ON point_ledger(expires_at) WHERE points > 0;
-- 每人每店每天只能因填問卷得點一次
CREATE UNIQUE INDEX IF NOT EXISTS uq_point_ledger_survey_daily
  ON point_ledger(customer_id, store_id, award_day) WHERE event_type = 'survey_completed';

CREATE OR REPLACE FUNCTION point_ledger_no_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'point_ledger is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_point_ledger_no_update ON point_ledger;
CREATE TRIGGER trg_point_ledger_no_update BEFORE UPDATE ON point_ledger
  FOR EACH ROW EXECUTE FUNCTION point_ledger_no_update();

CREATE TABLE IF NOT EXISTS store_point_rules (
  store_id    UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  rules       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vouchers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  code         TEXT UNIQUE NOT NULL,
  kind         TEXT NOT NULL,
  value        INTEGER,
  item_label   TEXT,
  min_spend    INTEGER,
  cost_points  INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  used_at      TIMESTAMPTZ,
  used_by      UUID REFERENCES users(id),
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vouchers_wallet ON vouchers(customer_id, store_id);
-- 見面禮券每人每店一張
CREATE UNIQUE INDEX IF NOT EXISTS uq_vouchers_welcome
  ON vouchers(customer_id, store_id) WHERE cost_points = 0;

ALTER TABLE responses ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_responses_customer ON responses(customer_id);
```

- [ ] **Step 2: 同步到正式站 schema 檔**

在 `scripts/feedbites-pg-schema.sql` 檔尾追加一行標題 `-- ── 021: 顧客帳本 ──`，下面貼上 Step 1 的完整 SQL（全部用 `IF NOT EXISTS`／`OR REPLACE`，重跑安全）。

- [ ] **Step 3: 套到本機測試庫**

```bash
docker cp supabase/migrations/021_customer_ledger.sql feedbites-testdb:/tmp/021.sql
docker exec feedbites-testdb psql -U postgres -d feedbites -v ON_ERROR_STOP=1 -f /tmp/021.sql
docker exec feedbites-testdb psql -U postgres -d feedbites -v ON_ERROR_STOP=1 -f /tmp/021.sql
docker exec feedbites-testdb psql -U postgres -d feedbites -c "\d point_ledger"
```

Expected: 兩次套用都沒有 ERROR（第二次證明可重跑）；`\d point_ledger` 列出 `uq_point_ledger_survey_daily` 與 trigger。

- [ ] **Step 4: 驗證只追加**

```bash
docker exec feedbites-testdb psql -U postgres -d feedbites -v ON_ERROR_STOP=1 -c "
BEGIN;
INSERT INTO users (email) VALUES ('append-only-check@example.com') RETURNING id \gset u_
INSERT INTO stores (user_id, email) VALUES (:'u_id', 'append-only-check@example.com') RETURNING id \gset s_
INSERT INTO customers (display_name) VALUES ('append-only-check') RETURNING id \gset c_
INSERT INTO point_ledger (customer_id, store_id, event_type, points) VALUES (:'c_id', :'s_id', 'survey_completed', 50);
UPDATE point_ledger SET points = 999 WHERE customer_id = :'c_id';
ROLLBACK;"
```

Expected: 最後的 UPDATE 報 `ERROR:  point_ledger is append-only`，整個交易回滾，測試庫不留資料。

- [ ] **Step 5: drizzle 表定義**

`src/lib/db/schema.ts` 開頭的 import 加入 `bigserial`：

```ts
import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  real,
  date,
  jsonb,
  timestamp,
  unique,
  index,
  bigserial,
  primaryKey,
} from 'drizzle-orm/pg-core'
```

在 `responses` 表定義的 `device_key` 下一行加入：

```ts
  customer_id:     uuid('customer_id'),
```

在檔尾追加：

```ts
// ── customers（021）──────────────────────────────────────────────────────────
export const customers = pgTable('customers', {
  id:              uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  display_name:    text('display_name'),
  picture_url:     text('picture_url'),
  birthday:        date('birthday'),
  home_area:       text('home_area'),
  visit_freq:      text('visit_freq'),
  gender:          text('gender'),
  age_band:        text('age_band'),
  profile_awarded: jsonb('profile_awarded').notNull().default(sql`'{}'::jsonb`),
  created_at:      timestamp('created_at', { withTimezone: true }).notNull().default(sql`NOW()`),
  updated_at:      timestamp('updated_at', { withTimezone: true }).notNull().default(sql`NOW()`),
})

// ── customer_identities（021）───────────────────────────────────────────────
export const customer_identities = pgTable('customer_identities', {
  provider:    text('provider').notNull(),
  subject:     text('subject').notNull(),
  customer_id: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  created_at:  timestamp('created_at', { withTimezone: true }).notNull().default(sql`NOW()`),
}, (t) => ({
  pk: primaryKey({ columns: [t.provider, t.subject] }),
}))

// ── point_ledger（021，只追加）────────────────────────────────────────────────
export const point_ledger = pgTable('point_ledger', {
  id:          bigserial('id', { mode: 'number' }).primaryKey(),
  customer_id: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  store_id:    uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  event_type:  text('event_type').notNull(),
  points:      integer('points').notNull(),
  ref_type:    text('ref_type'),
  ref_id:      text('ref_id'),
  award_day:   date('award_day'),
  expires_at:  timestamp('expires_at', { withTimezone: true }),
  created_at:  timestamp('created_at', { withTimezone: true }).notNull().default(sql`NOW()`),
})

// ── store_point_rules（021）──────────────────────────────────────────────────
export const store_point_rules = pgTable('store_point_rules', {
  store_id:   uuid('store_id').primaryKey().references(() => stores.id, { onDelete: 'cascade' }),
  rules:      jsonb('rules').notNull().default(sql`'{}'::jsonb`),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`NOW()`),
})

// ── vouchers（021）───────────────────────────────────────────────────────────
export const vouchers = pgTable('vouchers', {
  id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  store_id:    uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  customer_id: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  code:        text('code').unique().notNull(),
  kind:        text('kind').notNull(),
  value:       integer('value'),
  item_label:  text('item_label'),
  min_spend:   integer('min_spend'),
  cost_points: integer('cost_points').notNull(),
  status:      text('status').notNull().default('active'),
  used_at:     timestamp('used_at', { withTimezone: true }),
  used_by:     uuid('used_by').references(() => users.id),
  expires_at:  timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at:  timestamp('created_at', { withTimezone: true }).notNull().default(sql`NOW()`),
})
```

- [ ] **Step 6: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無新增錯誤（若有既存錯誤，只確認沒有 `schema.ts` 相關的新錯誤）。

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/021_customer_ledger.sql scripts/feedbites-pg-schema.sql src/lib/db/schema.ts
git commit -m "feat(ledger): add customers, identities, point_ledger, vouchers, store_point_rules schema"
```

---

### Task 2: 規則純函式

**Files:**
- Create: `src/lib/ledger/rules.ts`
- Create: `src/lib/brand.ts`
- Test: `tests/unit/ledger-rules.spec.ts`

- [ ] **Step 1: 寫失敗測試**

Create `tests/unit/ledger-rules.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import {
  DEFAULT_RULES, mergeRules, validateRules, checkCatalogChange,
  taipeiDay, addMonths, computeBalance, computeExpiryRows, effectiveBalance,
  voucherLabel, type LedgerRowLite,
} from '../../src/lib/ledger/rules'

const d = (iso: string) => new Date(iso)
const row = (p: Partial<LedgerRowLite> & { id: string; points: number }): LedgerRowLite => ({
  event_type: p.points > 0 ? 'survey_completed' : 'voucher_exchanged',
  ref_id: null, expires_at: null, created_at: d('2026-01-01T00:00:00Z'), ...p,
})

test('taipeiDay 以台北時區切日', () => {
  expect(taipeiDay(d('2026-09-13T15:59:59Z'))).toBe('2026-09-13')
  expect(taipeiDay(d('2026-09-13T16:00:00Z'))).toBe('2026-09-14')
})

test('addMonths 加月份', () => {
  expect(addMonths(d('2026-01-15T00:00:00Z'), 12).toISOString()).toBe('2027-01-15T00:00:00.000Z')
})

test('mergeRules 空值回傳預設且不共用參照', () => {
  const r = mergeRules(null)
  expect(r).toEqual(DEFAULT_RULES)
  r.catalog[0].cost_points = 1
  expect(DEFAULT_RULES.catalog[0].cost_points).not.toBe(1)
})

test('mergeRules 只覆蓋有給的欄位', () => {
  const r = mergeRules({ survey_completed: 80, first_voucher: { value: 50 } as never })
  expect(r.survey_completed).toBe(80)
  expect(r.first_voucher.value).toBe(50)
  expect(r.first_voucher.valid_days).toBe(DEFAULT_RULES.first_voucher.valid_days)
})

test('validateRules 預設值合法', () => {
  expect(validateRules(DEFAULT_RULES)).toBeNull()
})

test('validateRules 擋負數、重複 id、金額券缺面額', () => {
  expect(validateRules({ ...DEFAULT_RULES, survey_completed: -1 })).toMatch(/survey_completed/)
  const dup = mergeRules(null); dup.catalog.push({ ...dup.catalog[0] })
  expect(validateRules(dup)).toMatch(/重複/)
  const bad = mergeRules(null); bad.catalog[0] = { ...bad.catalog[0], kind: 'amount', value: null }
  expect(validateRules(bad)).toMatch(/面額/)
})

test('checkCatalogChange 允許新增、禁止移除與漲價', () => {
  const old = DEFAULT_RULES.catalog
  expect(checkCatalogChange(old, [...old, { ...old[0], id: 'new', cost_points: 999 }])).toBeNull()
  expect(checkCatalogChange(old, old.slice(1))).toMatch(/移除/)
  expect(checkCatalogChange(old, old.map((c, i) => i === 0 ? { ...c, cost_points: c.cost_points + 1 } : c))).toMatch(/提高/)
  expect(checkCatalogChange(old, old.map((c, i) => i === 0 ? { ...c, cost_points: c.cost_points - 1 } : c))).toBeNull()
})

test('computeBalance 加總', () => {
  expect(computeBalance([row({ id: '1', points: 50 }), row({ id: '2', points: -30 })])).toBe(20)
})

test('computeExpiryRows 先進先出扣掉花費後，只讓過期的剩餘點數到期', () => {
  const now = d('2027-06-01T00:00:00Z')
  const rows = [
    row({ id: 'A', points: 100, created_at: d('2026-01-01T00:00:00Z'), expires_at: d('2027-01-01T00:00:00Z') }),
    row({ id: 'B', points: 50, created_at: d('2026-08-01T00:00:00Z'), expires_at: d('2027-08-01T00:00:00Z') }),
    row({ id: 'S', points: -60, created_at: d('2026-09-01T00:00:00Z') }),
  ]
  expect(computeExpiryRows(rows, now)).toEqual([{ ref_id: 'A', points: -40 }])
})

test('computeExpiryRows 已處理過的到期不重複產生，也不讓後面的點數被多扣', () => {
  const now = d('2028-01-01T00:00:00Z')
  const rows = [
    row({ id: 'A', points: 100, created_at: d('2026-01-01T00:00:00Z'), expires_at: d('2027-01-01T00:00:00Z') }),
    row({ id: 'S', points: -60, created_at: d('2026-06-01T00:00:00Z') }),
    row({ id: 'X', points: -40, event_type: 'expired', ref_id: 'A', created_at: d('2027-01-02T00:00:00Z') }),
    row({ id: 'B', points: 50, created_at: d('2027-02-01T00:00:00Z'), expires_at: d('2027-12-01T00:00:00Z') }),
  ]
  expect(computeExpiryRows(rows, now)).toEqual([{ ref_id: 'B', points: -50 }])
})

test('effectiveBalance 把尚未入帳的到期也扣掉', () => {
  const now = d('2027-06-01T00:00:00Z')
  const rows = [row({ id: 'A', points: 100, expires_at: d('2027-01-01T00:00:00Z') })]
  expect(computeBalance(rows)).toBe(100)
  expect(effectiveBalance(rows, now)).toBe(0)
})

test('voucherLabel', () => {
  expect(voucherLabel({ kind: 'amount', value: 30, item_label: null, min_spend: 150 })).toBe('NT$30 折抵券（滿 NT$150 可用）')
  expect(voucherLabel({ kind: 'amount', value: 50, item_label: null, min_spend: null })).toBe('NT$50 折抵券')
  expect(voucherLabel({ kind: 'item', value: null, item_label: '指定小點一份', min_spend: null })).toBe('指定小點一份')
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx playwright test tests/unit/ledger-rules.spec.ts`
Expected: FAIL，錯誤為找不到模組 `src/lib/ledger/rules`。

- [ ] **Step 3: 實作**

Create `src/lib/brand.ts`:

```ts
// 對客人的品牌名（Jason 2026-09-13 定案）。改名只改這裡。
export const CUSTOMER_BRAND = '常來點'
export const CUSTOMER_BRAND_EN = 'EatAgain'
```

Create `src/lib/ledger/rules.ts`:

```ts
// 顧客帳本規則 — 純函式，不碰資料庫，全部可單元測試。
// spec: docs/superpowers/specs/2026-09-13-customer-ledger-design.html §四

export const LEDGER_EVENTS = [
  'survey_completed', 'voucher_issued', 'voucher_exchanged', 'expired',
  'profile_field_added', 'wish_created', 'wish_adopted',
  'order_completed', 'locker_pickup',
] as const
export type LedgerEvent = (typeof LEDGER_EVENTS)[number]

export const EVENT_LABELS: Record<LedgerEvent, string> = {
  survey_completed: '填問卷',
  voucher_issued: '見面禮餐券',
  voucher_exchanged: '兌換餐券',
  expired: '點數到期',
  profile_field_added: '補充資料',
  wish_created: '許願',
  wish_adopted: '願望被採納',
  order_completed: '線上訂餐',
  locker_pickup: '智取櫃取餐',
}

export type VoucherKind = 'amount' | 'item'

export interface VoucherTemplate {
  kind: VoucherKind
  value: number | null
  item_label: string | null
  min_spend: number | null
  valid_days: number
}

export interface CatalogItem extends VoucherTemplate {
  id: string
  cost_points: number
}

export interface PointRules {
  survey_completed: number
  profile_field: number
  wish_created: number
  wish_daily_limit: number
  wish_adopted: number
  earn_valid_months: number
  first_voucher: VoucherTemplate
  catalog: CatalogItem[]
}

// 首張券面額是讓系統能跑的預設值，正式值等阿水給毛利後由店長在後台改。
export const DEFAULT_RULES: PointRules = {
  survey_completed: 50,
  profile_field: 20,
  wish_created: 10,
  wish_daily_limit: 3,
  wish_adopted: 200,
  earn_valid_months: 12,
  first_voucher: { kind: 'amount', value: 30, item_label: null, min_spend: 150, valid_days: 30 },
  catalog: [
    { id: 'amt50', kind: 'amount', value: 50, item_label: null, min_spend: null, valid_days: 60, cost_points: 300 },
    { id: 'snack', kind: 'item', value: null, item_label: '指定小點一份', min_spend: null, valid_days: 60, cost_points: 600 },
  ],
}

export interface LedgerRowLite {
  id: string
  event_type: string
  points: number
  ref_id: string | null
  expires_at: Date | null
  created_at: Date
}

export function taipeiDay(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime())
  r.setUTCMonth(r.getUTCMonth() + months)
  return r
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000)
}

export function mergeRules(partial?: Partial<PointRules> | null): PointRules {
  const base: PointRules = JSON.parse(JSON.stringify(DEFAULT_RULES))
  if (!partial) return base
  return {
    ...base,
    ...partial,
    first_voucher: { ...base.first_voucher, ...(partial.first_voucher ?? {}) },
    catalog: partial.catalog ? JSON.parse(JSON.stringify(partial.catalog)) : base.catalog,
  }
}

const isNonNegInt = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0

function validateTemplate(t: VoucherTemplate, where: string): string | null {
  if (t.kind !== 'amount' && t.kind !== 'item') return `${where} 券種必須是 amount 或 item`
  if (t.kind === 'amount' && !(isNonNegInt(t.value) && (t.value as number) >= 1)) return `${where} 金額券需要面額（至少 1 元）`
  if (t.kind === 'item' && !(typeof t.item_label === 'string' && t.item_label.trim().length > 0)) return `${where} 品項券需要品項名稱`
  if (t.min_spend !== null && !isNonNegInt(t.min_spend)) return `${where} 低消必須是非負整數`
  if (!(isNonNegInt(t.valid_days) && t.valid_days >= 1)) return `${where} 有效天數至少 1 天`
  return null
}

export function validateRules(r: PointRules): string | null {
  const numeric: (keyof PointRules)[] = [
    'survey_completed', 'profile_field', 'wish_created', 'wish_daily_limit', 'wish_adopted', 'earn_valid_months',
  ]
  for (const k of numeric) {
    if (!isNonNegInt(r[k])) return `${k} 必須是非負整數`
  }
  if (r.earn_valid_months < 1) return 'earn_valid_months 至少 1 個月'
  const fv = validateTemplate(r.first_voucher, '見面禮券')
  if (fv) return fv
  const ids = new Set<string>()
  for (const c of r.catalog) {
    if (typeof c.id !== 'string' || c.id.trim() === '') return '兌換項目缺少 id'
    if (ids.has(c.id)) return `兌換項目 id 重複：${c.id}`
    ids.add(c.id)
    if (!(isNonNegInt(c.cost_points) && c.cost_points >= 1)) return `兌換項目 ${c.id} 所需點數至少 1`
    const e = validateTemplate(c, `兌換項目 ${c.id}`)
    if (e) return e
  }
  return null
}

// 兌換目錄只加不減：麥當勞把小可樂從 300 點調到 360 點，被罵「越集越沒用」。
export function checkCatalogChange(oldCatalog: CatalogItem[], nextCatalog: CatalogItem[]): string | null {
  const next = new Map(nextCatalog.map(c => [c.id, c]))
  for (const o of oldCatalog) {
    const n = next.get(o.id)
    if (!n) return `不能移除已上架的兌換項目：${o.id}`
    if (n.cost_points > o.cost_points) return `不能提高已上架項目的所需點數：${o.id}`
  }
  return null
}

export function computeBalance(rows: LedgerRowLite[]): number {
  return rows.reduce((s, r) => s + r.points, 0)
}

// 先進先出：花費先扣最早賺的點；已過期且尚未入帳的剩餘點數，產生 expired 列。
export function computeExpiryRows(rows: LedgerRowLite[], now: Date): { ref_id: string; points: number }[] {
  const expiredByRef = new Map<string, number>()
  for (const r of rows) {
    if (r.event_type === 'expired' && r.ref_id) {
      expiredByRef.set(r.ref_id, (expiredByRef.get(r.ref_id) ?? 0) + r.points)
    }
  }
  const earns = rows
    .filter(r => r.points > 0)
    .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
    .map(r => ({ row: r, remaining: r.points + (expiredByRef.get(r.id) ?? 0), processed: expiredByRef.has(r.id) }))

  let toConsume = -rows
    .filter(r => r.points < 0 && r.event_type !== 'expired')
    .reduce((s, r) => s + r.points, 0)

  for (const e of earns) {
    if (toConsume <= 0) break
    const take = Math.min(Math.max(e.remaining, 0), toConsume)
    e.remaining -= take
    toConsume -= take
  }

  return earns
    .filter(e => !e.processed && e.remaining > 0 && e.row.expires_at !== null && e.row.expires_at.getTime() <= now.getTime())
    .map(e => ({ ref_id: e.row.id, points: -e.remaining }))
}

export function effectiveBalance(rows: LedgerRowLite[], now: Date): number {
  return computeBalance(rows) + computeExpiryRows(rows, now).reduce((s, e) => s + e.points, 0)
}

export function voucherLabel(v: { kind: string; value: number | null; item_label: string | null; min_spend: number | null }): string {
  if (v.kind === 'item') return v.item_label ?? '品項券'
  const base = `NT$${v.value} 折抵券`
  return v.min_spend ? `${base}（滿 NT$${v.min_spend} 可用）` : base
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx playwright test tests/unit/ledger-rules.spec.ts`
Expected: 12 passed。

- [ ] **Step 5: Commit**

```bash
git add src/lib/brand.ts src/lib/ledger/rules.ts tests/unit/ledger-rules.spec.ts
git commit -m "feat(ledger): point rules, FIFO expiry and catalog guard as pure functions"
```

---

### Task 3: 顧客 session 簽章

**Files:**
- Create: `src/lib/customer-session.ts`
- Test: `tests/unit/customer-session.spec.ts`

- [ ] **Step 1: 寫失敗測試**

Create `tests/unit/customer-session.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { signPayload, verifyPayload, safeNext, isUuid } from '../../src/lib/customer-session'

const SECRET = 'unit-test-secret'

test('簽章後可驗回原內容', () => {
  const token = signPayload({ cid: 'abc', exp: Date.now() + 60_000 }, SECRET)
  expect(verifyPayload<{ cid: string; exp: number }>(token, SECRET)?.cid).toBe('abc')
})

test('竄改內容驗證失敗', () => {
  const token = signPayload({ cid: 'abc', exp: Date.now() + 60_000 }, SECRET)
  const [, mac] = token.split('.')
  const forged = Buffer.from(JSON.stringify({ cid: 'evil', exp: Date.now() + 60_000 })).toString('base64url') + '.' + mac
  expect(verifyPayload(forged, SECRET)).toBeNull()
})

test('錯的 secret 驗證失敗', () => {
  const token = signPayload({ cid: 'abc', exp: Date.now() + 60_000 }, SECRET)
  expect(verifyPayload(token, 'other')).toBeNull()
})

test('過期驗證失敗', () => {
  const token = signPayload({ cid: 'abc', exp: Date.now() - 1 }, SECRET)
  expect(verifyPayload(token, SECRET)).toBeNull()
})

test('空值與亂碼回 null 不丟例外', () => {
  expect(verifyPayload(undefined, SECRET)).toBeNull()
  expect(verifyPayload('garbage', SECRET)).toBeNull()
  expect(verifyPayload('a.b', SECRET)).toBeNull()
})

test('safeNext 只允許站內 /feedbites/ 路徑', () => {
  expect(safeNext('/feedbites/w/123')).toBe('/feedbites/w/123')
  expect(safeNext('https://evil.com')).toBe('/feedbites')
  expect(safeNext('//evil.com/feedbites/')).toBe('/feedbites')
  expect(safeNext(null)).toBe('/feedbites')
})

test('isUuid', () => {
  expect(isUuid('36759bb5-7786-47bf-a5e2-ce78b3e27dc7')).toBe(true)
  expect(isUuid('not-a-uuid')).toBe(false)
  expect(isUuid(null)).toBe(false)
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx playwright test tests/unit/customer-session.spec.ts`
Expected: FAIL，找不到模組。

- [ ] **Step 3: 實作**

Create `src/lib/customer-session.ts`:

```ts
// 顧客端 session：HMAC-SHA256 簽章 cookie，與店長端 NextAuth 完全分開。
import { createHmac, timingSafeEqual } from 'crypto'

export const CUSTOMER_COOKIE = 'fb_customer'
export const OAUTH_STATE_COOKIE = 'fb_oauth_state'
export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000

export type CustomerSession = { cid: string; exp: number }

export function signPayload(payload: object, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const mac = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${mac}`
}

export function verifyPayload<T extends { exp: number }>(
  token: string | undefined | null,
  secret: string,
  now: number = Date.now(),
): T | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  const [body, mac] = parts
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T
    if (typeof payload.exp !== 'number' || payload.exp < now) return null
    return payload
  } catch {
    return null
  }
}

export function customerSecret(): string {
  const s = process.env.CUSTOMER_SESSION_SECRET || process.env.AUTH_SECRET
  if (!s) throw new Error('CUSTOMER_SESSION_SECRET is not set')
  return s
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: Math.floor(maxAgeSeconds),
  }
}

export function readCustomerId(cookieValue: string | undefined): string | null {
  const s = verifyPayload<CustomerSession>(cookieValue, customerSecret())
  return s?.cid ?? null
}

export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/feedbites/') || next.startsWith('//')) return '/feedbites'
  return next
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(v: string | null | undefined): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx playwright test tests/unit/customer-session.spec.ts`
Expected: 8 passed。

- [ ] **Step 5: Commit**

```bash
git add src/lib/customer-session.ts tests/unit/customer-session.spec.ts
git commit -m "feat(ledger): signed customer session cookie independent of staff auth"
```

---

### Task 4: LINE Login 用戶端

**Files:**
- Create: `src/lib/line-login.ts`
- Test: `tests/unit/line-login.spec.ts`

- [ ] **Step 1: 寫失敗測試**

Create `tests/unit/line-login.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { buildAuthorizeUrl } from '../../src/lib/line-login'

test('authorize URL 帶齊必要參數與加好友提示', () => {
  const url = new URL(buildAuthorizeUrl({
    channelId: '1234567890',
    redirectUri: 'https://poc.mcstation.ai/eatagain/api/customer/line/callback',
    state: 'st', nonce: 'nc',
  }))
  expect(url.origin + url.pathname).toBe('https://access.line.me/oauth2/v2.1/authorize')
  expect(url.searchParams.get('response_type')).toBe('code')
  expect(url.searchParams.get('client_id')).toBe('1234567890')
  expect(url.searchParams.get('redirect_uri')).toBe('https://poc.mcstation.ai/eatagain/api/customer/line/callback')
  expect(url.searchParams.get('state')).toBe('st')
  expect(url.searchParams.get('nonce')).toBe('nc')
  expect(url.searchParams.get('scope')).toBe('profile openid')
  expect(url.searchParams.get('bot_prompt')).toBe('aggressive')
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx playwright test tests/unit/line-login.spec.ts`
Expected: FAIL，找不到模組。

- [ ] **Step 3: 實作**

Create `src/lib/line-login.ts`:

```ts
// LINE Login v2.1 — 手寫 OAuth，只用兩個官方端點：token 與 verify。
// 文件：https://developers.line.biz/en/reference/line-login/

const AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize'
const TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token'
const VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify'

export interface LineConfig {
  channelId: string
  channelSecret: string
  redirectUri: string
}

export interface LineProfile {
  sub: string
  name: string | null
  picture: string | null
}

export function lineConfig(): LineConfig {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET
  const base = process.env.PUBLIC_BASE_URL
  if (!channelId || !channelSecret || !base) {
    throw new Error('LINE_LOGIN_CHANNEL_ID / LINE_LOGIN_CHANNEL_SECRET / PUBLIC_BASE_URL not set')
  }
  return { channelId, channelSecret, redirectUri: `${base.replace(/\/$/, '')}/api/customer/line/callback` }
}

export function buildAuthorizeUrl(p: { channelId: string; redirectUri: string; state: string; nonce: string }): string {
  const u = new URL(AUTHORIZE_URL)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', p.channelId)
  u.searchParams.set('redirect_uri', p.redirectUri)
  u.searchParams.set('state', p.state)
  u.searchParams.set('scope', 'profile openid')
  u.searchParams.set('nonce', p.nonce)
  u.searchParams.set('bot_prompt', 'aggressive')
  return u.toString()
}

export async function exchangeCodeForIdToken(code: string, cfg: LineConfig): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
      client_id: cfg.channelId,
      client_secret: cfg.channelSecret,
    }),
  })
  if (!res.ok) throw new Error(`LINE token exchange failed: ${res.status}`)
  const json = (await res.json()) as { id_token?: string }
  if (!json.id_token) throw new Error('LINE token response has no id_token')
  return json.id_token
}

export async function verifyIdToken(idToken: string, channelId: string, nonce: string): Promise<LineProfile> {
  const res = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId, nonce }),
  })
  if (!res.ok) throw new Error(`LINE id_token verify failed: ${res.status}`)
  const j = (await res.json()) as { sub?: string; name?: string; picture?: string; nonce?: string }
  if (!j.sub) throw new Error('LINE id_token has no sub')
  if (j.nonce !== nonce) throw new Error('LINE id_token nonce mismatch')
  return { sub: j.sub, name: j.name ?? null, picture: j.picture ?? null }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx playwright test tests/unit/line-login.spec.ts`
Expected: 1 passed。

- [ ] **Step 5: Commit**

```bash
git add src/lib/line-login.ts tests/unit/line-login.spec.ts
git commit -m "feat(ledger): minimal LINE Login v2.1 client"
```

---

### Task 5: 帳本資料庫服務

**Files:**
- Create: `src/lib/ledger/code.ts`
- Create: `src/lib/ledger/service.ts`
- Test: `tests/api/ledger-service.spec.ts`

- [ ] **Step 1: 寫失敗的整合測試**

Create `tests/api/ledger-service.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import postgres from 'postgres'
import {
  upsertCustomer, claimResponse, getWallet, getRules,
  exchangeVoucher, redeemVoucher, runExpiry,
} from '../../src/lib/ledger/service'
import { pgClient } from '../../src/lib/db'

// 執行前提：DATABASE_URL 指向本機測試庫（絕不可指正式站），已套用 021。
const DB = process.env.DATABASE_URL
const SURVEY = process.env.TEST_SURVEY_A_ID
const STAFF = process.env.TEST_STAFF_USER_ID
test.skip(!DB || !SURVEY || !STAFF, '需設定 DATABASE_URL、TEST_SURVEY_A_ID、TEST_STAFF_USER_ID')
test.skip(!!DB && DB.includes('mcstation'), '拒絕對正式站執行')

let sql: ReturnType<typeof postgres>
let storeId: string
let customerId: string
const responseIds: string[] = []

async function insertResponse(minutesAgo: number): Promise<string> {
  const [r] = await sql`
    INSERT INTO responses (survey_id, answers, submitted_at)
    VALUES (${SURVEY!}, '{}'::jsonb, NOW() - make_interval(mins => ${minutesAgo}))
    RETURNING id`
  responseIds.push(r.id)
  return r.id
}

test.beforeAll(async () => {
  sql = postgres(DB!, { max: 2 })
  const [s] = await sql`SELECT store_id FROM surveys WHERE id = ${SURVEY!}`
  storeId = s.store_id
  customerId = await upsertCustomer({ provider: 'line', subject: `test-${Date.now()}`, displayName: '測試客人', pictureUrl: null })
})

test.afterAll(async () => {
  if (responseIds.length) await sql`DELETE FROM responses WHERE id IN ${sql(responseIds)}`
  if (customerId) await sql`DELETE FROM customers WHERE id = ${customerId}`
  await sql.end()
  await pgClient.end()
})

test.describe.serial('顧客帳本', () => {
  test('同一個登入方式再登入，拿到同一位客人', async () => {
    const subject = `test-same-${Date.now()}`
    const a = await upsertCustomer({ provider: 'line', subject, displayName: '甲', pictureUrl: null })
    const b = await upsertCustomer({ provider: 'line', subject, displayName: '甲改名', pictureUrl: null })
    try {
      expect(b).toBe(a)
    } finally {
      await sql`DELETE FROM customers WHERE id = ${a}`
    }
  })

  test('窗口內認領：發問卷點數與一張見面禮券', async () => {
    const rules = await getRules(storeId)
    const rid = await insertResponse(1)
    const r = await claimResponse(customerId, rid)
    expect(r?.storeId).toBe(storeId)
    expect(r?.pointsAwarded).toBe(rules.survey_completed)
    expect(r?.firstVoucher?.cost_points).toBe(0)

    const w = await getWallet(customerId, storeId)
    expect(w.balance).toBe(rules.survey_completed)
    expect(w.vouchers).toHaveLength(1)
    expect(w.recent.map(x => x.event_type).sort()).toEqual(['survey_completed', 'voucher_issued'])
  })

  test('同一天再填：不再給點，也不再發見面禮券', async () => {
    const rid = await insertResponse(1)
    const r = await claimResponse(customerId, rid)
    expect(r?.pointsAwarded).toBe(0)
    expect(r?.firstVoucher).toBeNull()
  })

  test('超過 30 分鐘的回答不能認領', async () => {
    const rid = await insertResponse(31)
    expect(await claimResponse(customerId, rid)).toBeNull()
  })

  test('已被認領的回答不能被第二個人認領', async () => {
    const rid = await insertResponse(1)
    await claimResponse(customerId, rid)
    const other = await upsertCustomer({ provider: 'google', subject: `test-other-${Date.now()}`, displayName: null, pictureUrl: null })
    try {
      expect(await claimResponse(other, rid)).toBeNull()
    } finally {
      await sql`DELETE FROM customers WHERE id = ${other}`
    }
  })

  test('點數不足換券回報還差幾點', async () => {
    const rules = await getRules(storeId)
    const w = await getWallet(customerId, storeId)
    const item = rules.catalog.find(c => c.cost_points > w.balance)!
    const r = await exchangeVoucher(customerId, storeId, item.id)
    expect(r).toEqual({ ok: false, reason: 'insufficient', shortBy: item.cost_points - w.balance })
  })

  test('同一張券同時核銷兩次，只有一次成功', async () => {
    const w = await getWallet(customerId, storeId)
    const code = w.vouchers[0].code
    const results = await Promise.all([
      redeemVoucher(code, storeId, STAFF!),
      redeemVoucher(code, storeId, STAFF!),
    ])
    expect(results.sort()).toEqual(['ok', 'unavailable'])
    expect(await redeemVoucher('ZZZZZZZZ', storeId, STAFF!)).toBe('not_found')
  })

  test('到期：過期的剩餘點數被扣掉，重跑不重複扣', async () => {
    const before = (await getWallet(customerId, storeId)).balance
    await sql`
      INSERT INTO point_ledger (customer_id, store_id, event_type, points, ref_type, ref_id, expires_at, created_at)
      VALUES (${customerId}, ${storeId}, 'order_completed', 100, 'test', ${'exp-' + Date.now()},
              NOW() - interval '1 day', NOW() - interval '400 days')`
    // 有效餘額已經不含過期點數
    expect((await getWallet(customerId, storeId)).balance).toBe(before)
    await runExpiry()
    await runExpiry()
    const rows = await sql`SELECT count(*)::int AS n FROM point_ledger WHERE customer_id = ${customerId} AND event_type = 'expired'`
    expect(rows[0].n).toBe(1)
    expect((await getWallet(customerId, storeId)).balance).toBe(before)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `node --env-file=.env.test.local node_modules/@playwright/test/cli.js test tests/api/ledger-service.spec.ts`
Expected: FAIL，找不到模組 `src/lib/ledger/service`。

- [ ] **Step 3: 實作餐券代碼**

Create `src/lib/ledger/code.ts`:

```ts
import { customAlphabet } from 'nanoid'

// 8 碼，排除 0/O、1/I/L。比刮刮卡的 6 碼長，因為餐券可累積、存活期長。
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const createVoucherCode = customAlphabet(ALPHABET, 8)
```

- [ ] **Step 4: 實作服務**

Create `src/lib/ledger/service.ts`:

```ts
// 顧客帳本資料庫服務。所有會改餘額的寫入都在交易內，並以 advisory lock 鎖住「客人 × 店」。
import { db } from '@/lib/db'
import { customers, customer_identities, point_ledger, store_point_rules, vouchers, responses, surveys } from '@/lib/db/schema'
import { and, desc, eq, gt, isNull, lte, sql } from 'drizzle-orm'
import { createVoucherCode } from './code'
import {
  addDays, addMonths, effectiveBalance, computeExpiryRows, mergeRules, taipeiDay,
  type LedgerRowLite, type PointRules, type VoucherTemplate,
} from './rules'

export const CLAIM_WINDOW_MS = 30 * 60 * 1000

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type Executor = typeof db | Tx
export type VoucherRow = typeof vouchers.$inferSelect

async function lockWallet(tx: Tx, customerId: string, storeId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${customerId}:${storeId}`}, 0))`)
}

async function loadRows(ex: Executor, customerId: string, storeId: string): Promise<LedgerRowLite[]> {
  const rows = await ex
    .select({
      id: point_ledger.id,
      event_type: point_ledger.event_type,
      points: point_ledger.points,
      ref_id: point_ledger.ref_id,
      expires_at: point_ledger.expires_at,
      created_at: point_ledger.created_at,
    })
    .from(point_ledger)
    .where(and(eq(point_ledger.customer_id, customerId), eq(point_ledger.store_id, storeId)))
  return rows.map(r => ({ ...r, id: String(r.id) }))
}

function voucherValues(t: VoucherTemplate, p: { customerId: string; storeId: string; costPoints: number }) {
  return {
    store_id: p.storeId,
    customer_id: p.customerId,
    code: createVoucherCode(),
    kind: t.kind,
    value: t.value,
    item_label: t.item_label,
    min_spend: t.min_spend,
    cost_points: p.costPoints,
    expires_at: addDays(new Date(), t.valid_days),
  }
}

export async function getRules(storeId: string): Promise<PointRules> {
  const [row] = await db
    .select({ rules: store_point_rules.rules })
    .from(store_point_rules)
    .where(eq(store_point_rules.store_id, storeId))
    .limit(1)
  return mergeRules(row?.rules as Partial<PointRules> | undefined)
}

export async function saveRules(storeId: string, rules: PointRules): Promise<void> {
  await db
    .insert(store_point_rules)
    .values({ store_id: storeId, rules })
    .onConflictDoUpdate({ target: store_point_rules.store_id, set: { rules, updated_at: new Date() } })
}

export type IdentityProvider = 'line' | 'google'

// 同一個 (provider, subject) 永遠對應同一位客人；第一次登入時建客人。
export async function upsertCustomer(p: {
  provider: IdentityProvider
  subject: string
  displayName: string | null
  pictureUrl: string | null
}): Promise<string> {
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`identity:${p.provider}:${p.subject}`}, 0))`)
    const [existing] = await tx
      .select({ customer_id: customer_identities.customer_id })
      .from(customer_identities)
      .where(and(eq(customer_identities.provider, p.provider), eq(customer_identities.subject, p.subject)))
      .limit(1)
    if (existing) {
      await tx
        .update(customers)
        .set({ display_name: p.displayName, picture_url: p.pictureUrl, updated_at: new Date() })
        .where(eq(customers.id, existing.customer_id))
      return existing.customer_id
    }
    const [created] = await tx
      .insert(customers)
      .values({ display_name: p.displayName, picture_url: p.pictureUrl })
      .returning({ id: customers.id })
    await tx.insert(customer_identities).values({ provider: p.provider, subject: p.subject, customer_id: created.id })
    return created.id
  })
}

export async function awardSurveyCompleted(p: {
  customerId: string
  storeId: string
  responseId: string
  submittedAt: Date
}): Promise<{ pointsAwarded: number; firstVoucher: VoucherRow | null }> {
  const rules = await getRules(p.storeId)
  return db.transaction(async tx => {
    await lockWallet(tx, p.customerId, p.storeId)

    const earned = await tx
      .insert(point_ledger)
      .values({
        customer_id: p.customerId,
        store_id: p.storeId,
        event_type: 'survey_completed',
        points: rules.survey_completed,
        ref_type: 'response',
        ref_id: p.responseId,
        award_day: taipeiDay(p.submittedAt),
        expires_at: addMonths(p.submittedAt, rules.earn_valid_months),
      })
      .onConflictDoNothing()
      .returning({ id: point_ledger.id })

    const issued = await tx
      .insert(vouchers)
      .values(voucherValues(rules.first_voucher, { customerId: p.customerId, storeId: p.storeId, costPoints: 0 }))
      .onConflictDoNothing()
      .returning()
    const firstVoucher = issued[0] ?? null

    if (firstVoucher) {
      await tx.insert(point_ledger).values({
        customer_id: p.customerId,
        store_id: p.storeId,
        event_type: 'voucher_issued',
        points: 0,
        ref_type: 'voucher',
        ref_id: firstVoucher.id,
      })
    }

    return { pointsAwarded: earned.length ? rules.survey_completed : 0, firstVoucher }
  })
}

// 認領：只認領「本次」這一筆、仍是匿名、且在 30 分鐘內送出的回答。
export async function claimResponse(customerId: string, responseId: string, now: Date = new Date()) {
  const cutoff = new Date(now.getTime() - CLAIM_WINDOW_MS)
  const claimed = await db
    .update(responses)
    .set({ customer_id: customerId })
    .where(and(eq(responses.id, responseId), isNull(responses.customer_id), gt(responses.submitted_at, cutoff)))
    .returning({ survey_id: responses.survey_id, submitted_at: responses.submitted_at })
  if (!claimed.length) return null

  const [s] = await db
    .select({ store_id: surveys.store_id })
    .from(surveys)
    .where(eq(surveys.id, claimed[0].survey_id))
    .limit(1)
  if (!s) return null

  const award = await awardSurveyCompleted({
    customerId,
    storeId: s.store_id,
    responseId,
    submittedAt: claimed[0].submitted_at ?? now,
  })
  return { storeId: s.store_id, surveyId: claimed[0].survey_id, ...award }
}

export async function getStoreIdForResponse(responseId: string): Promise<string | null> {
  const [row] = await db
    .select({ store_id: surveys.store_id })
    .from(responses)
    .innerJoin(surveys, eq(responses.survey_id, surveys.id))
    .where(eq(responses.id, responseId))
    .limit(1)
  return row?.store_id ?? null
}

export async function getWallet(customerId: string, storeId: string, now: Date = new Date()) {
  const rows = await loadRows(db, customerId, storeId)
  const recent = await db
    .select({
      id: point_ledger.id,
      event_type: point_ledger.event_type,
      points: point_ledger.points,
      created_at: point_ledger.created_at,
    })
    .from(point_ledger)
    .where(and(eq(point_ledger.customer_id, customerId), eq(point_ledger.store_id, storeId)))
    .orderBy(desc(point_ledger.created_at), desc(point_ledger.id))
    .limit(10)
  const myVouchers = await db
    .select()
    .from(vouchers)
    .where(and(eq(vouchers.customer_id, customerId), eq(vouchers.store_id, storeId)))
    .orderBy(desc(vouchers.created_at))
  return { balance: effectiveBalance(rows, now), recent, vouchers: myVouchers }
}

export type ExchangeResult =
  | { ok: true; voucher: VoucherRow }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'insufficient'; shortBy: number }

export async function exchangeVoucher(customerId: string, storeId: string, catalogId: string): Promise<ExchangeResult> {
  const rules = await getRules(storeId)
  const item = rules.catalog.find(c => c.id === catalogId)
  if (!item) return { ok: false, reason: 'not_found' }

  return db.transaction(async tx => {
    await lockWallet(tx, customerId, storeId)
    const balance = effectiveBalance(await loadRows(tx, customerId, storeId), new Date())
    if (balance < item.cost_points) {
      return { ok: false as const, reason: 'insufficient' as const, shortBy: item.cost_points - balance }
    }
    const [voucher] = await tx
      .insert(vouchers)
      .values(voucherValues(item, { customerId, storeId, costPoints: item.cost_points }))
      .returning()
    await tx.insert(point_ledger).values({
      customer_id: customerId,
      store_id: storeId,
      event_type: 'voucher_exchanged',
      points: -item.cost_points,
      ref_type: 'voucher',
      ref_id: voucher.id,
    })
    return { ok: true as const, voucher }
  })
}

// 以單一條件式 UPDATE 的影響列數判斷，不做先查再改，並發下只有一個成功。
export async function redeemVoucher(code: string, storeId: string, staffUserId: string): Promise<'ok' | 'not_found' | 'unavailable'> {
  const normalized = code.trim().toUpperCase()
  const updated = await db
    .update(vouchers)
    .set({ status: 'used', used_at: new Date(), used_by: staffUserId })
    .where(and(
      eq(vouchers.code, normalized),
      eq(vouchers.store_id, storeId),
      eq(vouchers.status, 'active'),
      gt(vouchers.expires_at, new Date()),
    ))
    .returning({ id: vouchers.id })
  if (updated.length) return 'ok'

  const [exists] = await db
    .select({ id: vouchers.id })
    .from(vouchers)
    .where(and(eq(vouchers.code, normalized), eq(vouchers.store_id, storeId)))
    .limit(1)
  return exists ? 'unavailable' : 'not_found'
}

export async function runExpiry(now: Date = new Date()): Promise<number> {
  const pairs = await db
    .selectDistinct({ customer_id: point_ledger.customer_id, store_id: point_ledger.store_id })
    .from(point_ledger)
    .where(and(gt(point_ledger.points, 0), lte(point_ledger.expires_at, now)))

  let inserted = 0
  for (const p of pairs) {
    inserted += await db.transaction(async tx => {
      await lockWallet(tx, p.customer_id, p.store_id)
      const due = computeExpiryRows(await loadRows(tx, p.customer_id, p.store_id), now)
      if (!due.length) return 0
      const res = await tx
        .insert(point_ledger)
        .values(due.map(e => ({
          customer_id: p.customer_id,
          store_id: p.store_id,
          event_type: 'expired',
          points: e.points,
          ref_type: 'ledger',
          ref_id: e.ref_id,
        })))
        .onConflictDoNothing()
        .returning({ id: point_ledger.id })
      return res.length
    })
  }
  return inserted
}
```

- [ ] **Step 5: 準備測試資料並跑測試**

若測試庫還沒有問卷與使用者，建一組：

```bash
docker exec feedbites-testdb psql -U postgres -d feedbites -c "
WITH u AS (INSERT INTO users (email) VALUES ('ledger-test@example.com') ON CONFLICT (email) DO UPDATE SET updated_at = NOW() RETURNING id),
s AS (INSERT INTO stores (user_id, email, store_name) SELECT id, 'ledger-test@example.com', '帳本測試店' FROM u RETURNING id, user_id),
v AS (INSERT INTO surveys (store_id, title) SELECT id, '帳本測試問卷' FROM s RETURNING id)
SELECT (SELECT id FROM v) AS survey_id, (SELECT user_id FROM s) AS staff_user_id;"
```

把輸出的兩個 id 填入 `.env.test.local`，然後：

Run: `node --env-file=.env.test.local node_modules/@playwright/test/cli.js test tests/api/ledger-service.spec.ts`
Expected: 7 passed。

- [ ] **Step 6: 型別檢查**

Run: `npx tsc --noEmit`
Expected: `src/lib/ledger/` 無錯誤。

- [ ] **Step 7: Commit**

```bash
git add src/lib/ledger/code.ts src/lib/ledger/service.ts tests/api/ledger-service.spec.ts
git commit -m "feat(ledger): ledger service with claim window, welcome voucher, FIFO expiry and atomic redeem"
```

---

### Task 6: 登入路由（LINE 為主、Google 為輔）

**Files:**
- Create: `src/lib/google-login.ts`
- Test: `tests/unit/google-login.spec.ts`
- Create: `src/lib/customer-login.ts`
- Create: `src/app/api/customer/line/start/route.ts`、`src/app/api/customer/line/callback/route.ts`
- Create: `src/app/api/customer/google/start/route.ts`、`src/app/api/customer/google/callback/route.ts`
- Create: `src/app/api/customer/logout/route.ts`

- [ ] **Step 1: Google 用戶端的失敗測試**

Create `tests/unit/google-login.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { buildGoogleAuthorizeUrl, checkGoogleClaims } from '../../src/lib/google-login'

test('Google authorize URL 帶齊參數', () => {
  const url = new URL(buildGoogleAuthorizeUrl({
    clientId: 'cid.apps.googleusercontent.com',
    redirectUri: 'https://poc.mcstation.ai/eatagain/api/customer/google/callback',
    state: 'st', nonce: 'nc',
  }))
  expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
  expect(url.searchParams.get('response_type')).toBe('code')
  expect(url.searchParams.get('scope')).toBe('openid profile')
  expect(url.searchParams.get('state')).toBe('st')
  expect(url.searchParams.get('nonce')).toBe('nc')
  expect(url.searchParams.get('prompt')).toBe('select_account')
})

test('checkGoogleClaims 驗 aud、iss、nonce、exp', () => {
  const now = 1_800_000_000
  const ok = { aud: 'cid', iss: 'https://accounts.google.com', nonce: 'n', exp: String(now + 60), sub: '123', name: '甲', picture: 'p' }
  expect(checkGoogleClaims(ok, 'cid', 'n', now)).toEqual({ sub: '123', name: '甲', picture: 'p' })
  expect(() => checkGoogleClaims({ ...ok, aud: 'other' }, 'cid', 'n', now)).toThrow(/aud/)
  expect(() => checkGoogleClaims({ ...ok, iss: 'evil' }, 'cid', 'n', now)).toThrow(/iss/)
  expect(() => checkGoogleClaims({ ...ok, nonce: 'x' }, 'cid', 'n', now)).toThrow(/nonce/)
  expect(() => checkGoogleClaims({ ...ok, exp: String(now - 1) }, 'cid', 'n', now)).toThrow(/expired/)
})
```

Run: `npx playwright test tests/unit/google-login.spec.ts`
Expected: FAIL，找不到模組。

- [ ] **Step 2: Google 用戶端**

Create `src/lib/google-login.ts`:

```ts
// Google OAuth 2.0 / OpenID Connect — 給沒有 LINE 的外國客人。
// 驗 id_token 用 Google 官方 tokeninfo 端點，不自行驗簽。
import type { LineProfile } from './line-login'

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'

export interface GoogleConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function googleConfig(): GoogleConfig {
  const clientId = process.env.CUSTOMER_GOOGLE_CLIENT_ID
  const clientSecret = process.env.CUSTOMER_GOOGLE_CLIENT_SECRET
  const base = process.env.PUBLIC_BASE_URL
  if (!clientId || !clientSecret || !base) {
    throw new Error('CUSTOMER_GOOGLE_CLIENT_ID / CUSTOMER_GOOGLE_CLIENT_SECRET / PUBLIC_BASE_URL not set')
  }
  return { clientId, clientSecret, redirectUri: `${base.replace(/\/$/, '')}/api/customer/google/callback` }
}

export function buildGoogleAuthorizeUrl(p: { clientId: string; redirectUri: string; state: string; nonce: string }): string {
  const u = new URL(AUTHORIZE_URL)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', p.clientId)
  u.searchParams.set('redirect_uri', p.redirectUri)
  u.searchParams.set('scope', 'openid profile')
  u.searchParams.set('state', p.state)
  u.searchParams.set('nonce', p.nonce)
  u.searchParams.set('prompt', 'select_account')
  return u.toString()
}

export function checkGoogleClaims(
  c: { aud?: string; iss?: string; nonce?: string; exp?: string; sub?: string; name?: string; picture?: string },
  clientId: string,
  nonce: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): LineProfile {
  if (c.aud !== clientId) throw new Error('Google id_token aud mismatch')
  if (c.iss !== 'https://accounts.google.com' && c.iss !== 'accounts.google.com') throw new Error('Google id_token iss mismatch')
  if (c.nonce !== nonce) throw new Error('Google id_token nonce mismatch')
  if (!c.exp || Number(c.exp) <= nowSec) throw new Error('Google id_token expired')
  if (!c.sub) throw new Error('Google id_token has no sub')
  return { sub: c.sub, name: c.name ?? null, picture: c.picture ?? null }
}

export async function googleProfileFromCode(code: string, nonce: string, cfg: GoogleConfig): Promise<LineProfile> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: cfg.redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
  })
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`)
  const { id_token } = (await res.json()) as { id_token?: string }
  if (!id_token) throw new Error('Google token response has no id_token')

  const info = await fetch(`${TOKENINFO_URL}?id_token=${encodeURIComponent(id_token)}`)
  if (!info.ok) throw new Error(`Google tokeninfo failed: ${info.status}`)
  return checkGoogleClaims(await info.json(), cfg.clientId, nonce)
}
```

Run: `npx playwright test tests/unit/google-login.spec.ts`
Expected: 2 passed。

- [ ] **Step 3: 共用登入流程**

Create `src/lib/customer-login.ts`:

```ts
// LINE 與 Google 共用：start 產 state/nonce 並導向；callback 驗 state、建客人、認領問卷、設 session。
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import {
  CUSTOMER_COOKIE, OAUTH_STATE_COOKIE, SESSION_TTL_MS,
  cookieOptions, customerSecret, isUuid, signPayload, verifyPayload,
} from '@/lib/customer-session'
import { claimResponse, getStoreIdForResponse, upsertCustomer, type IdentityProvider } from '@/lib/ledger/service'
import type { LineProfile } from '@/lib/line-login'
import { logger, newRequestId } from '@/lib/logger'

export type OAuthState = {
  provider: IdentityProvider
  state: string
  nonce: string
  claim: string | null
  store: string | null
  exp: number
}

export function startLogin(
  req: NextRequest,
  provider: IdentityProvider,
  buildUrl: (state: string, nonce: string) => string,
): NextResponse {
  const claimParam = req.nextUrl.searchParams.get('claim')
  const storeParam = req.nextUrl.searchParams.get('store')
  try {
    const payload: OAuthState = {
      provider,
      state: randomBytes(16).toString('hex'),
      nonce: randomBytes(16).toString('hex'),
      claim: isUuid(claimParam) ? claimParam : null,
      store: isUuid(storeParam) ? storeParam : null,
      exp: Date.now() + 10 * 60 * 1000,
    }
    const res = NextResponse.redirect(buildUrl(payload.state, payload.nonce))
    res.cookies.set(OAUTH_STATE_COOKIE, signPayload(payload, customerSecret()), cookieOptions(600))
    return res
  } catch (err) {
    logger.error('customer.login.start.failed', { provider }, err)
    return NextResponse.json({ error: '登入暫時無法使用' }, { status: 503 })
  }
}

export async function finishLogin(
  req: NextRequest,
  provider: IdentityProvider,
  profileFromCode: (code: string, nonce: string) => Promise<LineProfile>,
): Promise<NextResponse> {
  const request_id = newRequestId()
  const base = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '')
  const st = verifyPayload<OAuthState>(req.cookies.get(OAUTH_STATE_COOKIE)?.value, customerSecret())
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const providerError = req.nextUrl.searchParams.get('error')

  const walletUrl = (storeId: string | null, query: string) =>
    storeId ? `${base}/w/${storeId}?${query}` : `${base}/`
  const retry = st?.claim ? `&claim=${st.claim}` : ''

  if (providerError || !st || st.provider !== provider || !code || state !== st.state) {
    logger.warn('customer.login.rejected', { request_id, provider }, providerError ?? 'state mismatch or missing')
    const storeId = st?.store ?? (st?.claim ? await getStoreIdForResponse(st.claim) : null)
    const res = NextResponse.redirect(walletUrl(storeId, `login=cancelled${retry}`))
    res.cookies.delete(OAUTH_STATE_COOKIE)
    return res
  }

  try {
    const profile = await profileFromCode(code, st.nonce)
    const customerId = await upsertCustomer({
      provider,
      subject: profile.sub,
      displayName: profile.name,
      pictureUrl: profile.picture,
    })

    let storeId = st.store
    let query = 'login=ok'
    if (st.claim) {
      const claimed = await claimResponse(customerId, st.claim)
      if (claimed) {
        storeId = claimed.storeId
        query = `claimed=${claimed.pointsAwarded}`
      } else {
        storeId = storeId ?? (await getStoreIdForResponse(st.claim))
        query = 'claimed=none'
      }
    }

    const res = NextResponse.redirect(walletUrl(storeId, query))
    res.cookies.set(
      CUSTOMER_COOKIE,
      signPayload({ cid: customerId, exp: Date.now() + SESSION_TTL_MS }, customerSecret()),
      cookieOptions(SESSION_TTL_MS / 1000),
    )
    res.cookies.delete(OAUTH_STATE_COOKIE)
    logger.info('customer.login', { request_id, provider }, st.claim ? 'with claim' : 'plain')
    return res
  } catch (err) {
    logger.error('customer.login.callback.failed', { request_id, provider }, err)
    const storeId = st.store ?? (st.claim ? await getStoreIdForResponse(st.claim) : null)
    return NextResponse.redirect(walletUrl(storeId, `login=failed${retry}`))
  }
}
```

- [ ] **Step 4: 四支登入路由與登出**

Create `src/app/api/customer/line/start/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { buildAuthorizeUrl, lineConfig } from '@/lib/line-login'
import { startLogin } from '@/lib/customer-login'

// GET /api/customer/line/start?claim=<responseId>&store=<storeId>
export async function GET(req: NextRequest) {
  return startLogin(req, 'line', (state, nonce) => {
    const cfg = lineConfig()
    return buildAuthorizeUrl({ channelId: cfg.channelId, redirectUri: cfg.redirectUri, state, nonce })
  })
}
```

Create `src/app/api/customer/line/callback/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { exchangeCodeForIdToken, lineConfig, verifyIdToken } from '@/lib/line-login'
import { finishLogin } from '@/lib/customer-login'

export async function GET(req: NextRequest) {
  return finishLogin(req, 'line', async (code, nonce) => {
    const cfg = lineConfig()
    const idToken = await exchangeCodeForIdToken(code, cfg)
    return verifyIdToken(idToken, cfg.channelId, nonce)
  })
}
```

Create `src/app/api/customer/google/start/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { buildGoogleAuthorizeUrl, googleConfig } from '@/lib/google-login'
import { startLogin } from '@/lib/customer-login'

export async function GET(req: NextRequest) {
  return startLogin(req, 'google', (state, nonce) => {
    const cfg = googleConfig()
    return buildGoogleAuthorizeUrl({ clientId: cfg.clientId, redirectUri: cfg.redirectUri, state, nonce })
  })
}
```

Create `src/app/api/customer/google/callback/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { googleConfig, googleProfileFromCode } from '@/lib/google-login'
import { finishLogin } from '@/lib/customer-login'

export async function GET(req: NextRequest) {
  return finishLogin(req, 'google', (code, nonce) => googleProfileFromCode(code, nonce, googleConfig()))
}
```

Create `src/app/api/customer/logout/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { CUSTOMER_COOKIE } from '@/lib/customer-session'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(CUSTOMER_COOKIE)
  return res
}
```

- [ ] **Step 5: 本機 smoke test（不需要真的 channel）**

`.env.local` 加：

```
LINE_LOGIN_CHANNEL_ID=0000000000
LINE_LOGIN_CHANNEL_SECRET=dummy
CUSTOMER_GOOGLE_CLIENT_ID=<global.env 的 GOOGLE_CLIENT_ID>
CUSTOMER_GOOGLE_CLIENT_SECRET=<global.env 的 GOOGLE_CLIENT_SECRET>
PUBLIC_BASE_URL=http://localhost:3000/feedbites
CUSTOMER_SESSION_SECRET=local-dev-secret
```

Run: `npm run dev`，另一個終端：

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3000/feedbites/api/customer/line/start?claim=36759bb5-7786-47bf-a5e2-ce78b3e27dc7"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3000/feedbites/api/customer/google/start?store=36759bb5-7786-47bf-a5e2-ce78b3e27dc7"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3000/eatagain/api/customer/line/callback?code=x&state=y"
```

Expected: 第一行 `307 https://access.line.me/oauth2/v2.1/authorize?...bot_prompt=aggressive`；第二行 `307 https://accounts.google.com/o/oauth2/v2/auth?...prompt=select_account`；第三行 `307 http://localhost:3000/feedbites/`（沒有 state cookie，被拒絕後導回，不是 500）。

- [ ] **Step 6: Commit**

```bash
git add src/lib/google-login.ts src/lib/customer-login.ts tests/unit/google-login.spec.ts src/app/api/customer
git commit -m "feat(ledger): LINE and Google customer login with response claim"
```

---

### Task 7: 客人換券、店員核銷、店長規則、到期排程 API

**Files:**
- Create: `src/app/api/customer/vouchers/route.ts`
- Create: `src/app/api/vouchers/[code]/redeem/route.ts`
- Create: `src/app/api/store-point-rules/route.ts`
- Create: `src/app/api/cron/points-expiry/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: 客人換券**

Create `src/app/api/customer/vouchers/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { CUSTOMER_COOKIE, isUuid, readCustomerId } from '@/lib/customer-session'
import { exchangeVoucher } from '@/lib/ledger/service'
import { voucherLabel } from '@/lib/ledger/rules'
import { logger, newRequestId } from '@/lib/logger'

// POST { store_id, catalog_id } — customer_id 只取自 session，不接受 body 帶入
export async function POST(req: NextRequest) {
  const request_id = newRequestId()
  const customerId = readCustomerId(req.cookies.get(CUSTOMER_COOKIE)?.value)
  if (!customerId) return NextResponse.json({ error: '請先用 LINE 登入', request_id }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { store_id, catalog_id } = body as { store_id?: string; catalog_id?: string }
  if (!isUuid(store_id) || typeof catalog_id !== 'string') {
    return NextResponse.json({ error: '參數錯誤', request_id }, { status: 400 })
  }

  try {
    const r = await exchangeVoucher(customerId, store_id, catalog_id)
    if (r.ok) {
      return NextResponse.json({
        voucher: { code: r.voucher.code, label: voucherLabel(r.voucher), expires_at: r.voucher.expires_at },
      }, { status: 201 })
    }
    if (r.reason === 'insufficient') {
      return NextResponse.json({ error: `還差 ${r.shortBy} 點`, short_by: r.shortBy, request_id }, { status: 402 })
    }
    return NextResponse.json({ error: '找不到兌換項目', request_id }, { status: 404 })
  } catch (err) {
    logger.error('voucher.exchange.failed', { request_id }, err)
    return NextResponse.json({ error: '伺服器錯誤', request_id }, { status: 500 })
  }
}
```

- [ ] **Step 2: 店員核銷**

Create `src/app/api/vouchers/[code]/redeem/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSelectedStore } from '@/lib/store-context'
import { redeemVoucher } from '@/lib/ledger/service'
import { logger, newRequestId } from '@/lib/logger'

// 與刮刮卡的 discounts/mark 不同：餐券是點數換來的，必須嚴格一次性。
export async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const request_id = newRequestId()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '未授權', request_id }, { status: 401 })

  const store = await getSelectedStore(session.user.id)
  if (!store) return NextResponse.json({ error: '找不到店家', request_id }, { status: 404 })

  const { code } = await params
  try {
    const r = await redeemVoucher(code, store.id, session.user.id)
    if (r === 'ok') return NextResponse.json({ ok: true, request_id })
    if (r === 'unavailable') return NextResponse.json({ error: '這張餐券已使用或已過期', request_id }, { status: 409 })
    return NextResponse.json({ error: '找不到這張餐券', request_id }, { status: 404 })
  } catch (err) {
    logger.error('voucher.redeem.failed', { request_id, store_id: store.id }, err)
    return NextResponse.json({ error: '伺服器錯誤', request_id }, { status: 500 })
  }
}
```

- [ ] **Step 3: 店長規則**

Create `src/app/api/store-point-rules/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSelectedStore } from '@/lib/store-context'
import { getRules, saveRules } from '@/lib/ledger/service'
import { checkCatalogChange, mergeRules, validateRules, type PointRules } from '@/lib/ledger/rules'
import { logger, newRequestId } from '@/lib/logger'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })
  const store = await getSelectedStore(session.user.id)
  if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 })
  return NextResponse.json({ rules: await getRules(store.id), can_edit: store.user_id === session.user.id })
}

// 只有店主能改；成員（店員、外包拍照人員）唯讀。
export async function PUT(req: NextRequest) {
  const request_id = newRequestId()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '未授權', request_id }, { status: 401 })
  const store = await getSelectedStore(session.user.id)
  if (!store) return NextResponse.json({ error: '找不到店家', request_id }, { status: 404 })
  if (store.user_id !== session.user.id) return NextResponse.json({ error: '只有店主可以修改', request_id }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const next = mergeRules((body as { rules?: Partial<PointRules> }).rules)
  const invalid = validateRules(next)
  if (invalid) return NextResponse.json({ error: invalid, request_id }, { status: 400 })

  const current = await getRules(store.id)
  const catalogErr = checkCatalogChange(current.catalog, next.catalog)
  if (catalogErr) return NextResponse.json({ error: catalogErr, request_id }, { status: 400 })

  try {
    await saveRules(store.id, next)
    logger.info('point_rules.saved', { request_id, store_id: store.id }, 'ok')
    return NextResponse.json({ rules: next, request_id })
  } catch (err) {
    logger.error('point_rules.save.failed', { request_id, store_id: store.id }, err)
    return NextResponse.json({ error: '伺服器錯誤', request_id }, { status: 500 })
  }
}
```

- [ ] **Step 4: 到期排程**

Create `src/app/api/cron/points-expiry/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { runExpiry } from '@/lib/ledger/service'
import { logger } from '@/lib/logger'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const inserted = await runExpiry()
    logger.info('cron.points_expiry', {}, `expired rows inserted: ${inserted}`)
    return NextResponse.json({ ok: true, inserted })
  } catch (err) {
    logger.error('cron.points_expiry.failed', {}, err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
```

`vercel.json` 的 `crons` 陣列加一項（正式站在 EC2，這項只是保持設定一致；EC2 排程在 Task 13 設）：

```json
    {
      "path": "/api/cron/points-expiry",
      "schedule": "0 19 * * *"
    }
```

- [ ] **Step 5: smoke test**

`npm run dev` 執行中：

```bash
curl -s -w " %{http_code}\n" -X POST http://localhost:3000/feedbites/api/customer/vouchers -H "Content-Type: application/json" -d '{}'
curl -s -w " %{http_code}\n" -X POST http://localhost:3000/feedbites/api/vouchers/ABCDEFGH/redeem
curl -s -w " %{http_code}\n" http://localhost:3000/feedbites/api/cron/points-expiry
```

Expected: `401`、`401`、`401`。

- [ ] **Step 6: Commit**

```bash
git add src/app/api/customer/vouchers src/app/api/vouchers src/app/api/store-point-rules src/app/api/cron/points-expiry vercel.json
git commit -m "feat(ledger): voucher exchange, staff redeem, point rules and expiry cron APIs"
```

---

### Task 8: 已登入客人填完問卷即發點

**Files:**
- Modify: `src/app/api/surveys/[id]/responses/route.ts`

- [ ] **Step 1: import**

在檔案 import 區加入：

```ts
import { CUSTOMER_COOKIE, readCustomerId } from '@/lib/customer-session'
import { awardSurveyCompleted } from '@/lib/ledger/service'
import { voucherLabel } from '@/lib/ledger/rules'
```

- [ ] **Step 2: 寫入 customer_id**

在 POST 內 `const { answers, respondent_name, ... } = body` 之後加：

```ts
    // 已用 LINE 登入的客人（第二次以後來店），填完直接入帳；匿名客人在完成頁認領。
    let customerId: string | null = null
    try {
      customerId = readCustomerId(request.cookies.get(CUSTOMER_COOKIE)?.value)
    } catch {
      customerId = null
    }
```

`db.insert(responses).values({...})` 內，在 `device_key: ...` 下一行加：

```ts
        customer_id: customerId,
```

- [ ] **Step 3: 發點**

在 `// Trigger urgent alert` 註解之前加：

```ts
    let points: {
      awarded: number
      first_voucher: { code: string; label: string; expires_at: Date } | null
      wallet_url: string
    } | null = null
    if (customerId) {
      try {
        const r = await awardSurveyCompleted({
          customerId,
          storeId: survey.store_id,
          responseId: response.id,
          submittedAt: response.submitted_at ?? new Date(),
        })
        points = {
          awarded: r.pointsAwarded,
          first_voucher: r.firstVoucher
            ? { code: r.firstVoucher.code, label: voucherLabel(r.firstVoucher), expires_at: r.firstVoucher.expires_at }
            : null,
          wallet_url: `/feedbites/w/${survey.store_id}`,
        }
      } catch (err) {
        // 發點失敗不能讓問卷失敗
        logger.error('points.award.failed', { request_id, survey_id: id }, err)
      }
    }
```

- [ ] **Step 4: 回傳 points**

把兩處 `return NextResponse.json({ response, discount_code: ... }, { status: 201 })` 都加上 `points`：

```ts
      return NextResponse.json({
        response,
        points,
        discount_code: discountCode
          ? {
              code: discountCode.code,
              discount_type: selectedDiscountType,
              discount_value: selectedDiscountValue,
              expires_at: discountCode.expires_at,
              tier_name: tierName,
              tier_emoji: tierEmoji,
            }
          : null,
      }, { status: 201 })
```

```ts
    return NextResponse.json({ response, points, discount_code: null }, { status: 201 })
```

- [ ] **Step 5: 既有 API 測試仍通過**

Run: `node --env-file=.env.test.local node_modules/@playwright/test/cli.js test tests/api/response-patch.spec.ts`（需 `npm run dev` 指向測試庫）
Expected: 3 passed（或因未設 `TEST_SURVEY_B_ID` 而 skipped，不能是 failed）。

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/surveys/[id]/responses/route.ts"
git commit -m "feat(ledger): award points on submit for logged-in customers"
```

---

> **2026-09-14 審查後修正（已實作於 Task 1–8 的修正 commit）：** 認領不再用裸 response id。問卷送出 API 對未登入客人回傳 `claim_token`（簽章、30 分鐘有效），登入連結帶 `claim=<token>`。`redeemVoucher` 回傳 `'ok' | 'not_found' | 'used' | 'expired'`。以下 Task 9、10 已依此改寫。

### Task 9: 完成頁領點卡片

**Files:**
- Create: `src/components/survey/ClaimPointsCard.tsx`
- Modify: `src/app/s/[surveyId]/SurveyClient.tsx`

- [ ] **Step 1: 元件**

Create `src/components/survey/ClaimPointsCard.tsx`:

```tsx
'use client'

import type { ThemeColors } from '@/types/survey'
import { CUSTOMER_BRAND } from '@/lib/brand'

export type AwardedPoints = {
  awarded: number
  first_voucher: { code: string; label: string; expires_at: string } | null
  wallet_url: string
}

// 匿名客人：顯示 LINE 登入按鈕，登入後回呼會認領這一筆回答。
// 已登入客人：顯示已入帳結果。
export default function ClaimPointsCard({
  claimToken,
  points,
  colors,
}: {
  claimToken: string | null
  points: AwardedPoints | null
  colors: ThemeColors
}) {
  const box = 'mt-6 w-full max-w-sm mx-auto rounded-2xl p-5 text-center'

  if (points) {
    return (
      <div className={box} style={{ background: `${colors.primary}10`, border: `1px solid ${colors.border}` }}>
        <div className="text-3xl mb-1">🪙</div>
        <p className="text-base font-bold" style={{ color: colors.text }}>
          {points.awarded > 0 ? `+${points.awarded} 點已入帳` : '今天已經領過點數囉'}
        </p>
        {points.first_voucher && (
          <p className="mt-2 text-sm" style={{ color: colors.text }}>
            🎁 見面禮：{points.first_voucher.label}
            <span className="block font-mono tracking-widest mt-1">{points.first_voucher.code}</span>
          </p>
        )}
        <a
          href={points.wallet_url}
          className="mt-4 inline-block rounded-full px-5 py-2 text-sm font-bold text-white"
          style={{ background: colors.primary }}
        >
          打開我的{CUSTOMER_BRAND}
        </a>
      </div>
    )
  }

  if (!claimToken) return null
  const claim = encodeURIComponent(claimToken)

  return (
    <div className={box} style={{ background: '#06C75510', border: '1px solid #06C75540' }}>
      <p className="text-base font-bold" style={{ color: colors.text }}>
        領取點數和一張見面禮餐券
      </p>
      <p className="mt-1 text-xs" style={{ color: colors.textLight }}>
        點數可以換餐券，下次來店直接用
      </p>
      <a
        href={`/feedbites/api/customer/line/start?claim=${claim}`}
        className="mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white"
        style={{ background: '#06C755' }}
      >
        用 LINE 登入領取
      </a>
      <a
        href={`/feedbites/api/customer/google/start?claim=${claim}`}
        className="mt-3 block text-xs underline underline-offset-2"
        style={{ color: colors.textLight }}
      >
        No LINE? Continue with Google
      </a>
      <p className="mt-2 text-[10px]" style={{ color: colors.textLight }}>
        請在 30 分鐘內領取
      </p>
    </div>
  )
}
```

- [ ] **Step 2: 確認 ThemeColors 欄位**

Run: `grep -n "primary\|border\|textLight\|text:" src/types/survey.ts | head`
Expected: `ThemeColors` 內有 `primary`、`border`、`text`、`textLight`。若欄位名不同，改元件用的名稱，不改型別。

- [ ] **Step 3: SurveyClient 狀態**

`src/app/s/[surveyId]/SurveyClient.tsx`：

import 區加：

```tsx
import ClaimPointsCard, { type AwardedPoints } from '@/components/survey/ClaimPointsCard';
```

在 `const [responseId, setResponseId] = useState<string | null>(null);` 下一行加：

```tsx
  const [awardedPoints, setAwardedPoints] = useState<AwardedPoints | null>(null);
  const [claimToken, setClaimToken] = useState<string | null>(null);
```

在送出成功處 `setResponseId(data.response.id);` 下一行加：

```tsx
        if (data.points) setAwardedPoints(data.points);
        if (typeof data.claim_token === 'string') setClaimToken(data.claim_token);
```

- [ ] **Step 4: 兩個完成畫面掛卡片**

在 `// ─── Step: Discount / Thank You ───` 分支，把 `<DiscountCodeDisplay ... />` 之後、`</>` 之前加入：

```tsx
      <div className="px-6 pb-10" style={{ background: colors.background }}>
        <ClaimPointsCard claimToken={claimToken} points={awardedPoints} colors={colors} />
      </div>
```

在 `// No discount — just show thank you` 分支，把 `<div className="mt-6 text-center">`（Powered by FeedBites 那一段）之前加入：

```tsx
      <ClaimPointsCard claimToken={claimToken} points={awardedPoints} colors={colors} />
```

- [ ] **Step 5: 本機看畫面**

`npm run dev`，開測試問卷 `/feedbites/s/<TEST_SURVEY_A_ID>` 填完。
Expected: 完成頁出現綠色「用 LINE 登入領取」卡片，下方有「No LINE? Continue with Google」；兩個連結都含 `claim=<簽章 token>`（不是 UUID）。

- [ ] **Step 6: lint 與 commit**

Run: `npx eslint src/components/survey/ClaimPointsCard.tsx "src/app/s/[surveyId]/SurveyClient.tsx"`
Expected: 無新增錯誤。

```bash
git add src/components/survey/ClaimPointsCard.tsx "src/app/s/[surveyId]/SurveyClient.tsx"
git commit -m "feat(ledger): claim-points card on survey completion"
```

---

### Task 10: 我的帳本頁、店長點數與餐券頁

**Files:**
- Create: `src/app/w/[storeId]/page.tsx`
- Create: `src/app/w/[storeId]/WalletClient.tsx`
- Create: `src/app/dashboard/vouchers/page.tsx`
- Create: `src/app/dashboard/vouchers/VouchersClient.tsx`
- Modify: `src/components/dashboard/Sidebar.tsx`
- Modify: `src/app/privacy/page.tsx`

- [ ] **Step 1: 帳本頁 server**

Create `src/app/w/[storeId]/page.tsx`:

```tsx
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { stores } from '@/lib/db/schema'
import { CUSTOMER_COOKIE, isUuid, readCustomerId } from '@/lib/customer-session'
import { getRules, getWallet } from '@/lib/ledger/service'
import { EVENT_LABELS, voucherLabel, type LedgerEvent } from '@/lib/ledger/rules'
import { CUSTOMER_BRAND } from '@/lib/brand'
import WalletClient from './WalletClient'

export const dynamic = 'force-dynamic'

export default async function WalletPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>
  searchParams: Promise<{ claimed?: string; login?: string; claim?: string }>
}) {
  const { storeId } = await params
  const sp = await searchParams
  if (!isUuid(storeId)) notFound()

  const [store] = await db
    .select({ store_name: stores.store_name, logo_url: stores.logo_url })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1)
  if (!store) notFound()

  const jar = await cookies()
  const customerId = readCustomerId(jar.get(CUSTOMER_COOKIE)?.value)
  const rules = await getRules(storeId)
  const now = Date.now()
  // claim 是簽章 token，由登入路由驗證；這裡只做長度防呆後原樣轉交
  const retryClaim = typeof sp.claim === 'string' && sp.claim.length > 0 && sp.claim.length < 512 ? sp.claim : null
  const loginQuery = `store=${storeId}${retryClaim ? `&claim=${encodeURIComponent(retryClaim)}` : ''}`
  const loginHref = `/feedbites/api/customer/line/start?${loginQuery}`
  const googleHref = `/feedbites/api/customer/google/start?${loginQuery}`

  if (!customerId) {
    return (
      <WalletClient
        brand={CUSTOMER_BRAND}
        storeId={storeId}
        storeName={store.store_name}
        logoUrl={store.logo_url}
        loginHref={loginHref}
      googleHref={googleHref}
        googleHref={googleHref}
        notice={sp.login === 'failed' || sp.login === 'cancelled' ? '登入沒有完成，可以再試一次' : null}
        wallet={null}
        catalog={rules.catalog.map(c => ({ id: c.id, label: voucherLabel(c), cost_points: c.cost_points }))}
      />
    )
  }

  const w = await getWallet(customerId, storeId)
  const claimedNotice =
    sp.claimed === 'none' ? '這份問卷已經領過或超過 30 分鐘，下次填問卷記得登入'
    : sp.claimed && Number(sp.claimed) > 0 ? `+${sp.claimed} 點已入帳`
    : sp.claimed === '0' ? '今天已經領過點數囉'
    : null

  return (
    <WalletClient
      brand={CUSTOMER_BRAND}
      storeId={storeId}
      storeName={store.store_name}
      logoUrl={store.logo_url}
      loginHref={loginHref}
      googleHref={googleHref}
      notice={claimedNotice}
      catalog={rules.catalog.map(c => ({ id: c.id, label: voucherLabel(c), cost_points: c.cost_points }))}
      wallet={{
        balance: w.balance,
        recent: w.recent.map(r => ({
          id: String(r.id),
          label: EVENT_LABELS[r.event_type as LedgerEvent] ?? r.event_type,
          points: r.points,
          at: r.created_at.toISOString(),
        })),
        vouchers: w.vouchers.map(v => ({
          code: v.code,
          label: voucherLabel(v),
          status: v.status === 'used' ? 'used' : v.expires_at.getTime() <= now ? 'expired' : 'active',
          expires_at: v.expires_at.toISOString(),
        })),
      }}
    />
  )
}
```

- [ ] **Step 2: 帳本頁 client**

Create `src/app/w/[storeId]/WalletClient.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Wallet = {
  balance: number
  recent: { id: string; label: string; points: number; at: string }[]
  vouchers: { code: string; label: string; status: 'active' | 'used' | 'expired'; expires_at: string }[]
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })

export default function WalletClient(props: {
  brand: string
  storeId: string
  storeName: string
  logoUrl: string | null
  loginHref: string
  googleHref: string
  notice: string | null
  wallet: Wallet | null
  catalog: { id: string; label: string; cost_points: number }[]
}) {
  const { brand, storeId, storeName, logoUrl, loginHref, googleHref, notice, wallet, catalog } = props
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function exchange(catalogId: string) {
    setBusy(catalogId)
    setMessage(null)
    try {
      const res = await fetch('/feedbites/api/customer/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, catalog_id: catalogId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 201) {
        setMessage(`換到了：${data.voucher.label}`)
        router.refresh()
      } else {
        setMessage(data.error ?? '兌換失敗，請再試一次')
      }
    } catch {
      setMessage('網路不穩，請再試一次')
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0] px-4 py-8 text-[#3A2A1A]">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-3">
          {logoUrl && <img src={logoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />}
          <div>
            <div className="text-xs text-[#A07850]">{brand}</div>
            <h1 className="text-xl font-bold">{storeName}</h1>
          </div>
        </header>

        {notice && (
          <div className="mt-4 rounded-xl bg-[#FF8C00]/10 px-4 py-3 text-sm font-medium text-[#CC5500]">{notice}</div>
        )}

        {!wallet ? (
          <section className="mt-8 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-base font-bold">用 LINE 登入，看你的點數和餐券</p>
            <a href={loginHref} className="mt-4 inline-block rounded-full bg-[#06C755] px-6 py-3 text-sm font-bold text-white">
              用 LINE 登入
            </a>
            <a href={googleHref} className="mt-3 block text-xs text-[#A07850] underline underline-offset-2">
              No LINE? Continue with Google
            </a>
          </section>
        ) : (
          <>
            <section className="mt-6 rounded-2xl bg-gradient-to-br from-[#FF8C00] to-[#E84000] p-6 text-white shadow-md">
              <div className="text-sm opacity-90">我的點數</div>
              <div className="mt-1 font-mono text-5xl font-black">{wallet.balance}</div>
            </section>

            <section className="mt-6">
              <h2 className="text-sm font-bold text-[#A07850]">我的餐券</h2>
              {wallet.vouchers.length === 0 && <p className="mt-2 text-sm text-[#A07850]">還沒有餐券</p>}
              <ul className="mt-2 space-y-2">
                {wallet.vouchers.map(v => (
                  <li
                    key={v.code}
                    className={`rounded-xl border bg-white p-4 ${v.status === 'active' ? 'border-[#FF8C00]' : 'border-[#E8E2D8] opacity-50'}`}
                  >
                    <div className="font-bold">{v.label}</div>
                    <div className="mt-1 font-mono text-2xl tracking-widest text-[#CC5500]">{v.code}</div>
                    <div className="mt-1 text-xs text-[#A07850]">
                      {v.status === 'active' ? `結帳時給店員看，${fmtDate(v.expires_at)} 前有效` : v.status === 'used' ? '已使用' : '已過期'}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6">
              <h2 className="text-sm font-bold text-[#A07850]">用點數換</h2>
              <ul className="mt-2 space-y-2">
                {catalog.map(c => (
                  <li key={c.id} className="flex items-center justify-between rounded-xl bg-white p-4">
                    <div>
                      <div className="font-medium">{c.label}</div>
                      <div className="text-xs text-[#A07850]">{c.cost_points} 點</div>
                    </div>
                    <button
                      onClick={() => exchange(c.id)}
                      disabled={busy !== null || wallet.balance < c.cost_points}
                      className="rounded-full bg-[#FF8C00] px-4 py-2 text-sm font-bold text-white disabled:opacity-30"
                    >
                      {busy === c.id ? '處理中' : '兌換'}
                    </button>
                  </li>
                ))}
              </ul>
              {message && <p className="mt-2 text-sm text-[#CC5500]">{message}</p>}
            </section>

            <section className="mt-6 mb-10">
              <h2 className="text-sm font-bold text-[#A07850]">最近紀錄</h2>
              <ul className="mt-2 divide-y divide-[#F0E6DA] rounded-xl bg-white">
                {wallet.recent.map(r => (
                  <li key={r.id} className="flex justify-between px-4 py-3 text-sm">
                    <span>{r.label}<span className="ml-2 text-xs text-[#A07850]">{fmtDate(r.at)}</span></span>
                    <span className={r.points >= 0 ? 'font-bold text-[#CC5500]' : 'text-[#8A8585]'}>
                      {r.points > 0 ? `+${r.points}` : r.points}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: 店長頁 server**

Create `src/app/dashboard/vouchers/page.tsx`:

```tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { and, count, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { vouchers } from '@/lib/db/schema'
import { getSelectedStore } from '@/lib/store-context'
import { getRules } from '@/lib/ledger/service'
import VouchersClient from './VouchersClient'

export const dynamic = 'force-dynamic'

export default async function VouchersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const store = await getSelectedStore(session.user.id)
  if (!store) redirect('/dashboard/new-store')

  const [issued] = await db.select({ n: count() }).from(vouchers).where(eq(vouchers.store_id, store.id))
  const [used] = await db.select({ n: count() }).from(vouchers).where(and(eq(vouchers.store_id, store.id), eq(vouchers.status, 'used')))

  return (
    <VouchersClient
      initialRules={await getRules(store.id)}
      canEdit={store.user_id === session.user.id}
      issued={issued?.n ?? 0}
      used={used?.n ?? 0}
    />
  )
}
```

- [ ] **Step 4: 店長頁 client**

Create `src/app/dashboard/vouchers/VouchersClient.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { CatalogItem, PointRules } from '@/lib/ledger/rules'

const input = 'w-full rounded-lg border border-[#E8E2D8] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#C5A55A]'

export default function VouchersClient({ initialRules, canEdit, issued, used }: {
  initialRules: PointRules
  canEdit: boolean
  issued: number
  used: number
}) {
  const [rules, setRules] = useState<PointRules>(initialRules)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null)

  async function redeem() {
    const c = code.trim().toUpperCase()
    if (!c) return
    setRedeemMsg(null)
    const res = await fetch(`/feedbites/api/vouchers/${encodeURIComponent(c)}/redeem`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setRedeemMsg(res.ok ? '✓ 核銷成功' : data.error ?? '核銷失敗')
    if (res.ok) setCode('')
  }

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    const res = await fetch('/feedbites/api/store-point-rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    })
    const data = await res.json().catch(() => ({}))
    setSaveMsg(res.ok ? '✓ 已儲存' : data.error ?? '儲存失敗')
    if (res.ok) setRules(data.rules)
    setSaving(false)
  }

  const fv = rules.first_voucher
  const setFv = (patch: Partial<PointRules['first_voucher']>) => setRules({ ...rules, first_voucher: { ...fv, ...patch } })
  const addItem = () => {
    const item: CatalogItem = { id: `item${Date.now()}`, kind: 'amount', value: 50, item_label: null, min_spend: null, valid_days: 60, cost_points: 300 }
    setRules({ ...rules, catalog: [...rules.catalog, item] })
  }
  const setItem = (idx: number, patch: Partial<CatalogItem>) =>
    setRules({ ...rules, catalog: rules.catalog.map((c, i) => (i === idx ? { ...c, ...patch } : c)) })
  const num = (v: string) => (v === '' ? null : Number(v))

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 text-[#3A3A3A]">
      <h1 className="text-xl font-bold">點數與餐券</h1>

      <section className="rounded-2xl border border-[#E8E2D8] bg-white p-5">
        <h2 className="font-bold">核銷餐券</h2>
        <p className="mt-1 text-xs text-[#8A8585]">客人出示 8 碼，輸入後核銷。每張只能用一次。</p>
        <div className="mt-3 flex gap-2">
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && redeem()}
            maxLength={8} placeholder="8 碼餐券代碼" className={`${input} font-mono tracking-widest`} />
          <button onClick={redeem} className="shrink-0 rounded-lg bg-[#C5A55A] px-4 text-sm font-bold text-white">核銷</button>
        </div>
        {redeemMsg && <p className="mt-2 text-sm">{redeemMsg}</p>}
        <p className="mt-3 text-xs text-[#8A8585]">已發出 {issued} 張，已核銷 {used} 張</p>
      </section>

      <section className="rounded-2xl border border-[#E8E2D8] bg-white p-5">
        <h2 className="font-bold">見面禮餐券</h2>
        <p className="mt-1 text-xs text-[#8A8585]">客人第一次填完問卷並用 LINE 登入時自動發一張。</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <label>折抵金額<input type="number" disabled={!canEdit} value={fv.value ?? ''} onChange={e => setFv({ kind: 'amount', value: num(e.target.value) })} className={input} /></label>
          <label>低消（空白＝無）<input type="number" disabled={!canEdit} value={fv.min_spend ?? ''} onChange={e => setFv({ min_spend: num(e.target.value) })} className={input} /></label>
          <label>有效天數<input type="number" disabled={!canEdit} value={fv.valid_days} onChange={e => setFv({ valid_days: Number(e.target.value) })} className={input} /></label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <label>填問卷得點<input type="number" disabled={!canEdit} value={rules.survey_completed} onChange={e => setRules({ ...rules, survey_completed: Number(e.target.value) })} className={input} /></label>
          <label>點數有效月數<input type="number" disabled={!canEdit} value={rules.earn_valid_months} onChange={e => setRules({ ...rules, earn_valid_months: Number(e.target.value) })} className={input} /></label>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E8E2D8] bg-white p-5">
        <h2 className="font-bold">兌換目錄</h2>
        <p className="mt-1 text-xs text-[#8A8585]">已上架的項目只能降點數、不能移除或漲點數，避免客人覺得越集越沒用。</p>
        <ul className="mt-3 space-y-3">
          {rules.catalog.map((c, i) => (
            <li key={c.id} className="grid grid-cols-4 gap-2 text-sm">
              <select disabled={!canEdit} value={c.kind} onChange={e => setItem(i, { kind: e.target.value as CatalogItem['kind'] })} className={input}>
                <option value="amount">折抵金額</option>
                <option value="item">指定品項</option>
              </select>
              {c.kind === 'amount'
                ? <input type="number" disabled={!canEdit} value={c.value ?? ''} onChange={e => setItem(i, { value: num(e.target.value) })} placeholder="金額" className={input} />
                : <input disabled={!canEdit} value={c.item_label ?? ''} onChange={e => setItem(i, { item_label: e.target.value })} placeholder="品項名稱" className={input} />}
              <input type="number" disabled={!canEdit} value={c.cost_points} onChange={e => setItem(i, { cost_points: Number(e.target.value) })} placeholder="所需點數" className={input} />
              <input type="number" disabled={!canEdit} value={c.valid_days} onChange={e => setItem(i, { valid_days: Number(e.target.value) })} placeholder="有效天數" className={input} />
            </li>
          ))}
        </ul>
        {canEdit && <button onClick={addItem} className="mt-3 text-sm font-bold text-[#C5A55A]">＋ 新增兌換項目</button>}
      </section>

      {canEdit ? (
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="rounded-lg bg-[#C5A55A] px-6 py-2 text-sm font-bold text-white disabled:opacity-40">
            {saving ? '儲存中' : '儲存設定'}
          </button>
          {saveMsg && <span className="text-sm">{saveMsg}</span>}
        </div>
      ) : (
        <p className="text-xs text-[#8A8585]">只有店主可以修改設定。</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 導覽**

`src/components/dashboard/Sidebar.tsx`：lucide import 加 `Ticket`：

```tsx
import { LogOut, Menu, Plus, LayoutDashboard, UtensilsCrossed, ClipboardList, Sparkles, Settings, Ticket } from 'lucide-react';
```

導覽陣列在「問卷管理」之後加一行：

```tsx
  { href: '/dashboard/vouchers', label: '點數與餐券', icon: Ticket },
```

- [ ] **Step 6: 隱私頁**

`src/app/privacy/page.tsx`，在「資料刪除」那個 `<section>` 之前插入：

```tsx
          <section>
            <h2 className="text-lg font-bold mb-2">常來點的登入與點數</h2>
            <p className="text-[#8A8585]">
              您用 LINE 或 Google 登入領取點數時，我們只取得該服務的使用者識別碼、顯示名稱與頭像，不取得您的好友、訊息、電話或 Email。
              這些資料只用於記錄您在各店家的點數與餐券，不會提供給第三方。
              店家只看得到您在該店的填答與點數紀錄。刪除請求處理方式同下方「資料刪除」。
            </p>
          </section>
```

- [ ] **Step 7: 本機驗證**

`npm run dev`：
1. 開 `/feedbites/w/<測試店 id>`，未登入。Expected: 顯示「用 LINE 登入」，按鈕網址含 `store=`。
2. 用 Task 5 整合測試產生的 customer 手動造一個 cookie 測登入後畫面：

先查一個測試客人 id：

```bash
docker exec feedbites-testdb psql -U postgres -d feedbites -At -c "SELECT id FROM customers ORDER BY created_at DESC LIMIT 1"
```

再產 cookie 值（Node 24 可直接載入 .ts；`CUSTOMER_SESSION_SECRET` 必須和 dev server 讀到的相同）：

```bash
CID=<上一步的 id> node --env-file=.env.local --input-type=module -e "
import { signPayload } from './src/lib/customer-session.ts'
console.log(signPayload({ cid: process.env.CID, exp: Date.now() + 3600e3 }, process.env.CUSTOMER_SESSION_SECRET))"
```

> dev server 要指向測試庫（`.env.local` 的 `DATABASE_URL` 暫改為 5433 那個），否則帳本頁會查不到這位客人。

把印出的值設成瀏覽器 cookie `fb_customer`（DevTools → Application → Cookies），重新整理。Expected: 顯示點數、餐券、兌換目錄、最近紀錄。

3. 以店主帳號登入 `/feedbites/dashboard/vouchers`，輸入上一步看到的餐券代碼核銷。Expected: 第一次「✓ 核銷成功」，第二次「這張餐券已使用或已過期」。
4. 把兌換目錄第一項點數改高後儲存。Expected: 顯示「不能提高已上架項目的所需點數」。

- [ ] **Step 8: build 與 commit**

Run: `npx tsc --noEmit && npx eslint src/app/w src/app/dashboard/vouchers && npm run build`
Expected: 無錯誤，build 成功。

```bash
git add src/app/w src/app/dashboard/vouchers src/components/dashboard/Sidebar.tsx src/app/privacy/page.tsx
git commit -m "feat(ledger): customer wallet page and staff vouchers dashboard"
```

---

### Task 12: 全站品牌換成「常來點 EatAgain」

**Files:**
- Modify: `src/lib/brand.ts`
- Create: `public/brand/changlaidian-icon-1024.png`、`public/brand/changlaidian-lockup.png`（從 `docs/brand/` 複製）
- Modify: `public/manifest.webmanifest`、`public/icons/*`（重新產生）
- Modify: `src/` 內所有畫面上看得到的 FeedBites 字樣

**規則（逐一判斷，不要盲目全域取代）：**

| 類型 | 處理 |
|---|---|
| 畫面文字、`<title>`、metadata、email 主旨與內文、LINE 推播文字、「Powered by FeedBites」 | 換成「常來點」；需要英文處換 `EatAgain`；對客與店長端都換 |
| Logo 圖檔引用（`feedbites-logo.png`） | 換成 `BRAND_LOGO_LOCKUP` 或 `BRAND_ICON` 常數 |
| 網址 basePath `/feedbites` | **改成 `/eatagain`**。程式裡寫死的 `/feedbites/...` 字串一律改成用 `BASE_PATH` 常數組出來，之後再改只要動一處 |
| cookie 名稱（`feedbites_store_id`）、logger 服務名、資料庫、`package.json` name、Docker 容器名 | **不動**。改 cookie 名會讓所有店長登出；其餘是內部識別，客人看不到 |
| 寄件地址 `noreply@feedbites.app` | 只改顯示名稱：`常來點 EatAgain <noreply@feedbites.app>`，地址等有新網域再換 |
| 資料庫裡已存的圖片網址（`.../feedbites/uploads/...`） | **不改資料**，由 nginx 舊路徑繼續提供（Step 6） |

- [ ] **Step 1: 品牌常數**

`src/lib/brand.ts` 改為：

```ts
// 對客與店長端品牌（Jason 2026-09-13 定案）。改名只改這裡。
export const CUSTOMER_BRAND = '常來點'
export const CUSTOMER_BRAND_EN = 'EatAgain'
export const BRAND_FULL = `${CUSTOMER_BRAND} ${CUSTOMER_BRAND_EN}`
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/eatagain'
export const BRAND_LOGO_LOCKUP = `${BASE_PATH}/brand/changlaidian-lockup.png`
export const BRAND_ICON = `${BASE_PATH}/brand/changlaidian-icon-1024.png`
```

`next.config.ts` 的 `basePath` 與 `env.NEXT_PUBLIC_BASE_PATH` 都改成 `'/eatagain'`。`src/lib/local-upload.ts` 的 `UPLOADS_BASE_URL` 預設值改成 `https://poc.mcstation.ai/eatagain/uploads`。`playwright.config.ts` 註解與 `tests/` 內的 `/feedbites` 前綴改成 `/eatagain`。

- [ ] **Step 2: 圖檔**

```bash
mkdir -p public/brand
cp docs/brand/changlaidian-icon-1024.png docs/brand/changlaidian-lockup.png public/brand/
sed -n 1,40p scripts/generate-icons.mjs
```

依 `scripts/generate-icons.mjs` 的輸入參數，用 `public/brand/changlaidian-icon-1024.png` 當來源重新產生 `public/icons/`。`public/manifest.webmanifest` 的 `name` 改 `常來點 EatAgain`、`short_name` 改 `常來點`、`theme_color` 改 `#D9541E`。

- [ ] **Step 3: 列出所有出現處**

```bash
grep -rn "FeedBites\|Feedbites" src --include=*.tsx --include=*.ts
grep -rn "feedbites-logo" src public
grep -rn "/feedbites" src tests public next.config.ts playwright.config.ts
```

`/feedbites` 開頭的字串約 170 處。客戶端元件改成 `` `${BASE_PATH}/api/...` ``（從 `@/lib/brand` 匯入）；`src/proxy.ts` 內的轉址也用 `BASE_PATH`。

逐筆依上表判斷，每一處改完再往下。

- [ ] **Step 4: 驗證畫面上已無 FeedBites**

```bash
grep -rn "FeedBites\|Feedbites" src --include=*.tsx --include=*.ts | grep -v "^src/lib/logger"
```

再跑：

```bash
grep -rn "/feedbites" src tests public next.config.ts playwright.config.ts
```

Expected: 兩次 grep 都只剩上表「不動」類型（cookie 名 `feedbites_store_id`、程式註解）。剩下的每一筆在 commit 訊息裡列出保留理由。

`.env.local` 的 `PUBLIC_BASE_URL` 改成 `http://localhost:3000/eatagain`。`npm run dev` 後打開：登入頁、`/eatagain/dashboard`、一份問卷 `/eatagain/s/<id>` 完成頁、`/eatagain/w/<storeId>`、`/eatagain/m/<storeId>`。店長登入、問卷送出、領點卡片的 LINE 與 Google 連結都要實際點過，確認沒有 404。Expected: 看得到的地方全部是常來點與新 logo，瀏覽器分頁標題也是。

- [ ] **Step 5: 部署設定檔**

`scripts/nginx-feedbites.conf` 改為（新路徑為主、舊路徑轉址，舊上傳圖檔照常提供）：

```nginx
# 常來點 EatAgain（原 FeedBites）
location /eatagain/uploads/ {
    alias /home/jason/feedbites-uploads/;
}

location /feedbites/uploads/ {
    alias /home/jason/feedbites-uploads/;
}

location /eatagain/ {
    proxy_pass http://feedbites:3200/eatagain/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

location /feedbites/ {
    return 301 /eatagain/$request_uri_tail;
}
```

> `$request_uri_tail` 不是 nginx 內建變數。實作時改用 `rewrite ^/feedbites/(.*)$ /eatagain/$1 permanent;`，並保留原檔其他 header 設定（先 `cat scripts/nginx-feedbites.conf` 看現況，只改路徑與加轉址，不要刪掉原本的設定）。

`scripts/deploy-ec2.sh`、`scripts/deploy_boto3.py`、`scripts/quick_redeploy.py` 裡的健康檢查網址 `/feedbites` 改成 `/eatagain`；容器名、目錄名 `feedbites` 不動。

- [ ] **Step 6: build 與 commit**

Run: `npx tsc --noEmit && npx playwright test tests/unit && npm run build`
Expected: 全部成功。

```bash
git add src public tests scripts next.config.ts playwright.config.ts
git commit -m "feat(brand): rebrand to 常來點 EatAgain, move basePath to /eatagain with nginx redirect from /feedbites"
```

---

### Task 13: 審查、稽核與上線

**需要 Jason 確認的步驟有標 🔴。**

- [ ] **Step 1: 全部單元測試**

Run: `npx playwright test tests/unit`
Expected: 全數 passed（含既有 auth-allowlist、dedupe、logger）。

- [ ] **Step 2: 獨立審查**

本包涉及 auth 與 schema migration，依全域規範派 fresh-context 審查（`mcs-security` 或 `superpowers:code-reviewer`），重點：cookie 簽章與 secret 來源、callback 的 state／nonce 驗證、open redirect、claim 窗口能否被利用、並發核銷與換券、append-only 是否可繞過。審查意見修完才往下。

- [ ] **Step 3: Codex 三輪稽核**

依 `~/.claude/shared_intel/playbooks/CLAUDE_CODEX_AUDIT_WORKFLOW.md`：第一輪找碴、第二輪攤開採納與退回、第三輪紅隊。退回的意見寫理由。

- [ ] **Step 4: 🔴 正式站 env（需 Task 0 完成）**

EC2 `/home/jason/feedbites/.env.prod` 加入：

```
LINE_LOGIN_CHANNEL_ID=<Task 0>
LINE_LOGIN_CHANNEL_SECRET=<Task 0>
CUSTOMER_GOOGLE_CLIENT_ID=<global.env 的 GOOGLE_CLIENT_ID>
CUSTOMER_GOOGLE_CLIENT_SECRET=<global.env 的 GOOGLE_CLIENT_SECRET>
PUBLIC_BASE_URL=https://poc.mcstation.ai/eatagain
UPLOADS_BASE_URL=https://poc.mcstation.ai/eatagain/uploads
CUSTOMER_SESSION_SECRET=<openssl rand -base64 48 產生，另存 global.env 為 FEEDBITES_CUSTOMER_SESSION_SECRET>
```

`CRON_SECRET` 應已存在，沒有就一併產生。

- [ ] **Step 5: 🔴 正式庫 migration（先備份）**

透過 SSM 在 EC2 上：

```bash
docker exec feedbites-postgres pg_dump -U postgres feedbites > ~/feedbites_backup_20260913_pre021.sql
ls -la ~/feedbites_backup_20260913_pre021.sql
docker cp /home/jason/feedbites/supabase/migrations/021_customer_ledger.sql feedbites-postgres:/tmp/021.sql
docker exec feedbites-postgres psql -U postgres -d feedbites -v ON_ERROR_STOP=1 -f /tmp/021.sql
```

> 容器名稱與 DB 使用者以 EC2 實際為準，先 `docker ps` 確認；上面沿用 P0 計畫的寫法。備份檔大小不可為 0。

- [ ] **Step 6: 🔴 部署**

合併到 master、push，依 `scripts/deploy-ec2.sh` 重建容器（與 P0 上線同流程）。同時把新的 nginx 設定套到 EC2 並 `nginx -t` 通過後 reload；驗證 `https://poc.mcstation.ai/feedbites/dashboard` 會 301 到 `/eatagain/dashboard`，舊的店家 logo 圖片網址仍回 200。

- [ ] **Step 7: EC2 到期排程**

EC2 crontab 加一行（每天台北 03:00）：

```
0 19 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://poc.mcstation.ai/eatagain/api/cron/points-expiry >> /home/jason/feedbites/logs/points-expiry.log 2>&1
```

手動跑一次確認回 `{"ok":true,"inserted":0}`。

- [ ] **Step 8: 正式站端到端（真 LINE 帳號）**

1. 手機掃欣殿萬飲問卷 QR，匿名填完。
2. 完成頁按「用 LINE 登入領取」。
3. Expected: 回到 `/eatagain/w/<欣殿萬飲 store id>?claimed=50`，看到 50 點與一張見面禮券。
4. 店長後台核銷該券，第二次核銷被拒。
5. 同一支手機再填一次問卷。Expected: 完成頁直接顯示「今天已經領過點數囉」，不再出現 LINE 按鈕。
6. 用另一支沒登入過的手機，改按「No LINE? Continue with Google」走一次，Expected 同第 3 步。
7. 測完在正式庫刪除這兩位測試客人（`DELETE FROM customers WHERE id IN (SELECT customer_id FROM customer_identities WHERE subject IN ('<LINE sub>', '<Google sub>'))`），以免污染欣殿萬飲的數據。

- [ ] **Step 9: 三端截圖**

依 `~/.claude/shared_intel/playbooks/DEPLOY_VERIFICATION.md`，對 `/eatagain/w/<store id>` 與問卷完成頁做桌面、iPhone、Android 截圖，全部正常才算完成。

- [ ] **Step 10: 收尾紀錄**

- `shared_intel/PROGRESS_LOG.md` 最上方加一行完成紀錄。
- `shared_intel/DELIVERABLES_CHECKLIST.md` 加一行待 Jason 看：帳本頁網址、見面禮券預設面額仍待阿水確認。
- `shared_intel/CTO_RESOURCES.md` 登記 LINE Login channel、Google OAuth 新增的 redirect URI 與新 env。
- 通知欣殿萬飲試用負責人鄭子民（吧台主管）：店長後台核銷教學、見面禮券面額待阿水確認；桌上 QR 立牌用新網址 `/eatagain/s/<surveyId>` 重新產生後才印。

---

## Self-review 紀錄

- **Spec 覆蓋**：§一 驗收表 1、2、6 → Task 5、8、9、10、13；多登入方式與品牌更名 → Task 1、5、6、12；§三 資料模型（本包範圍）→ Task 1；§四 點數規則、首張券、兌換目錄、到期 → Task 2、5、7；§五 身分與登入 → Task 3、4、6、9；§九 核銷與錯誤 → Task 5、7；§十 安全個資 → Task 3、6、7、10 Step 6、13 Step 2；§十一 測試 → Task 2–6、13。
- **不在本包**：許願、補資料、推播（P2）；素材庫、菜品 ID、時段分析、集團與總部視角（P3）。`customers` 的補資料欄位本包已建，P2 直接用。
- **命名一致**：`awardSurveyCompleted`、`claimResponse`、`exchangeVoucher`、`redeemVoucher`、`runExpiry`、`getWallet`、`getRules`、`saveRules`、`upsertCustomer`、`IdentityProvider`、`getStoreIdForResponse` 在 Task 5 定義；`startLogin`、`finishLogin`、`OAUTH_STATE_COOKIE` 在 Task 3、6 定義；Task 6–12 引用名稱相同。
