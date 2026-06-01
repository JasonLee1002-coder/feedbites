-- ============================================================
-- FeedBites PostgreSQL Schema
-- Target: omnicore-postgres container, feedbites database
-- Generated from Supabase migrations 001–019
-- Supabase-specific syntax (auth.users, RLS, policies) removed.
-- App-level auth via NextAuth v5 + users table.
-- ============================================================

-- Enable UUID generation (standard pg extension, not Supabase-specific)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- users (replaces Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        UNIQUE NOT NULL,
  password_hash TEXT       NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- stores (001 + 002 frame_id + 004 metadata + 010 line_user_id + 011 invite_token)
-- ============================================================
CREATE TABLE IF NOT EXISTS stores (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  email             TEXT        NOT NULL,
  store_name        TEXT        NOT NULL DEFAULT '',
  logo_url          TEXT,
  bg_image_url      TEXT,
  owner_avatar_url  TEXT,
  frame_id          TEXT,
  owner_line_user_id TEXT       DEFAULT NULL,
  invite_token      TEXT        DEFAULT NULL,
  -- 004 metadata
  cuisine_type      TEXT,
  city              TEXT,
  district          TEXT,
  price_range       TEXT,
  seating_capacity  INTEGER,
  opening_year      INTEGER,
  target_audience   TEXT,
  service_type      TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_user_id      ON stores(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_invite_token ON stores(invite_token) WHERE invite_token IS NOT NULL;

-- ============================================================
-- surveys (001 + 002 discount_mode/tiers + 009 prize_items + 014 prize_same_day_valid)
-- ============================================================
CREATE TABLE IF NOT EXISTS surveys (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id             UUID        REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  title                TEXT        NOT NULL,
  template_id          TEXT        NOT NULL DEFAULT 'fine-dining',
  custom_colors        JSONB,
  questions            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  is_active            BOOLEAN     DEFAULT true,
  discount_enabled     BOOLEAN     DEFAULT true,
  discount_type        TEXT        DEFAULT 'percentage',
  discount_value       TEXT        DEFAULT '9折',
  discount_expiry_days INTEGER     DEFAULT 30,
  discount_mode        TEXT        DEFAULT 'basic',
  discount_tiers       JSONB,
  prize_items          JSONB       DEFAULT NULL,
  prize_same_day_valid BOOLEAN     DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_store_id ON surveys(store_id);

-- ============================================================
-- responses (001 + 002 xp_earned/phone + 013 email)
-- ============================================================
CREATE TABLE IF NOT EXISTS responses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       UUID        REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  answers         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  respondent_name TEXT,
  phone           TEXT,
  email           TEXT,
  xp_earned       INTEGER,
  submitted_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_phone     ON responses(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_responses_email     ON responses(email) WHERE email IS NOT NULL;

-- ============================================================
-- discount_codes (001)
-- ============================================================
CREATE TABLE IF NOT EXISTS discount_codes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   UUID        REFERENCES surveys(id)   ON DELETE CASCADE NOT NULL,
  response_id UUID        REFERENCES responses(id) ON DELETE CASCADE NOT NULL,
  code        TEXT        UNIQUE NOT NULL,
  is_used     BOOLEAN     DEFAULT false,
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code      ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_survey_id ON discount_codes(survey_id);

-- ============================================================
-- dishes (002 + 007 price)
-- ============================================================
CREATE TABLE IF NOT EXISTS dishes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID        REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  photo_url   TEXT,
  category    TEXT        NOT NULL DEFAULT '主食',
  price       TEXT,
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dishes_store_id ON dishes(store_id);

-- ============================================================
-- dish_categories (017)
-- ============================================================
CREATE TABLE IF NOT EXISTS dish_categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  position   INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(store_id, name)
);

CREATE INDEX IF NOT EXISTS dish_categories_store_pos_idx ON dish_categories(store_id, position ASC);

-- ============================================================
-- store_members (003)
-- ============================================================
CREATE TABLE IF NOT EXISTS store_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID        REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID        REFERENCES users(id)  ON DELETE CASCADE NOT NULL,
  invited_by  UUID        REFERENCES users(id),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_members_store_id ON store_members(store_id);
CREATE INDEX IF NOT EXISTS idx_store_members_user_id  ON store_members(user_id);

-- ============================================================
-- store_invites (003)
-- ============================================================
CREATE TABLE IF NOT EXISTS store_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID        REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  email       TEXT        NOT NULL,
  invited_by  UUID        REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, email)
);

CREATE INDEX IF NOT EXISTS idx_store_invites_email ON store_invites(email);

-- ============================================================
-- store_knowledge (005)
-- ============================================================
CREATE TABLE IF NOT EXISTS store_knowledge (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID        REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  category   TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  source     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_knowledge_store_id ON store_knowledge(store_id);
CREATE INDEX IF NOT EXISTS idx_store_knowledge_category ON store_knowledge(category);

-- ============================================================
-- feedback_reports (006 + 012 satisfaction)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_reports (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id             UUID        REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  user_id              UUID        NOT NULL,
  user_email           TEXT,
  store_name           TEXT,
  title                TEXT        NOT NULL,
  description          TEXT        NOT NULL,
  category             TEXT        NOT NULL CHECK (category IN ('bug', 'suggestion', 'question')),
  priority             TEXT        NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status               TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'resolved', 'closed')),
  voice_transcript     TEXT,
  satisfaction_rating  INTEGER     CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  satisfaction_comment TEXT,
  satisfaction_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_reports_store        ON feedback_reports(store_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_status       ON feedback_reports(status);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_satisfaction ON feedback_reports(satisfaction_rating) WHERE satisfaction_rating IS NOT NULL;

-- ============================================================
-- feedback_attachments (006)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_attachments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  UUID        REFERENCES feedback_reports(id) ON DELETE CASCADE NOT NULL,
  file_url   TEXT        NOT NULL,
  file_name  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_attachments_report ON feedback_attachments(report_id);

-- ============================================================
-- feedback_responses (006)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_responses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID        REFERENCES feedback_reports(id) ON DELETE CASCADE NOT NULL,
  responder_email TEXT        NOT NULL,
  message         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_responses_report ON feedback_responses(report_id);

-- ============================================================
-- feedback_conversations (008)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_conversations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID        REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  session_id     TEXT        NOT NULL,
  source         TEXT        DEFAULT 'chat' CHECK (source IN ('chat', 'survey', 'widget')),
  customer_name  TEXT,
  metadata       JSONB       DEFAULT '{}',
  sentiment_score FLOAT,
  topics         TEXT[],
  severity       TEXT        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status         TEXT        DEFAULT 'new' CHECK (status IN ('new', 'analyzed', 'actioned', 'archived')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fc_store   ON feedback_conversations(store_id);
CREATE INDEX IF NOT EXISTS idx_fc_status  ON feedback_conversations(status);
CREATE INDEX IF NOT EXISTS idx_fc_created ON feedback_conversations(created_at DESC);

-- ============================================================
-- feedback_messages (008)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        REFERENCES feedback_conversations(id) ON DELETE CASCADE NOT NULL,
  role            TEXT        NOT NULL CHECK (role IN ('genie', 'customer')),
  content         TEXT        NOT NULL,
  metadata        JSONB       DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_conversation ON feedback_messages(conversation_id);

-- ============================================================
-- feedback_insights (008)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_insights (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id           UUID        REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  period_start       TIMESTAMPTZ NOT NULL,
  period_end         TIMESTAMPTZ NOT NULL,
  summary            TEXT        NOT NULL,
  issues             JSONB       NOT NULL DEFAULT '[]',
  self_review        JSONB       DEFAULT '{}',
  recommendations    JSONB       DEFAULT '[]',
  conversation_count INT         DEFAULT 0,
  avg_sentiment      FLOAT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fi_store  ON feedback_insights(store_id);
CREATE INDEX IF NOT EXISTS idx_fi_period ON feedback_insights(period_start, period_end);

-- ============================================================
-- ai_memories (016)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_memories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category   TEXT        NOT NULL DEFAULT 'general',
  subject    TEXT,
  content    TEXT        NOT NULL,
  confidence INT         NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_memories_store ON ai_memories(store_id, confidence DESC, updated_at DESC);

-- ============================================================
-- assistant_chat_history (016)
-- ============================================================
CREATE TABLE IF NOT EXISTS assistant_chat_history (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_history_store ON assistant_chat_history(store_id, created_at DESC);

-- ============================================================
-- domain_knowledge (018 + 019 extra columns)
-- ============================================================
CREATE TABLE IF NOT EXISTS domain_knowledge (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project               TEXT        NOT NULL DEFAULT 'feedbites',
  category              TEXT        NOT NULL,
  subject               TEXT,
  content               TEXT        NOT NULL,
  source                TEXT        DEFAULT 'internal',
  source_type           TEXT        DEFAULT 'seed',
  valid_until           DATE,
  confidence            INT         DEFAULT 1,
  last_verified_at      TIMESTAMPTZ DEFAULT NOW(),
  refresh_interval_days INT         DEFAULT NULL,
  is_stale              BOOLEAN     DEFAULT FALSE,
  stale_reason          TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS domain_knowledge_project_idx ON domain_knowledge(project, category);

-- ============================================================
-- knowledge_gaps (019)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project           TEXT        NOT NULL,
  domain            TEXT        NOT NULL,
  gap_topic         TEXT        NOT NULL,
  discovery_context TEXT,
  priority          INT         DEFAULT 1,
  status            TEXT        DEFAULT 'pending',
  filled_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_gaps ON knowledge_gaps(project, status, priority DESC);

-- ============================================================
-- Seed: admin user (password: feedbites2026)
-- bcrypt hash: $2b$10$K7L/8Y2z9mQ.P4v5Z3N2GeP3FKhQm4TF.rFr8oE0vvqm7KZuCbv3u
-- ============================================================
INSERT INTO users (email, password_hash)
VALUES ('jason@mcstation.ai', '$2b$10$K7L/8Y2z9mQ.P4v5Z3N2GeP3FKhQm4TF.rFr8oE0vvqm7KZuCbv3u')
ON CONFLICT (email) DO NOTHING;
