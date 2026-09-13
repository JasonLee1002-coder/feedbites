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
