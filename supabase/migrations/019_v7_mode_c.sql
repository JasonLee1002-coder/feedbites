-- Migration 019: v7.0 Mode C — 自我進化架構
-- Created: 2026-05-26

-- ── knowledge_gaps 表（知識空白追蹤）──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project TEXT NOT NULL,
  domain TEXT NOT NULL,
  gap_topic TEXT NOT NULL,
  discovery_context TEXT,
  priority INT DEFAULT 1,
  status TEXT DEFAULT 'pending',
  filled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_gaps
  ON knowledge_gaps (project, status, priority DESC);

-- ── domain_knowledge 加欄位（知識新鮮度管理）────────────────────────────────
ALTER TABLE domain_knowledge
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'seed',
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS refresh_interval_days INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_stale BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stale_reason TEXT;
