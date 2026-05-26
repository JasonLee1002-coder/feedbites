-- Migration 018: domain_knowledge table for Mode B 行業知識庫
-- Created: 2026-05-25

CREATE TABLE IF NOT EXISTS domain_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project TEXT NOT NULL DEFAULT 'feedbites',
  category TEXT NOT NULL,
  -- 'regulation'（食安法規）| 'trend'（市場趨勢）| 'strategy'（行銷策略）
  -- | 'customer_behavior'（顧客行為）| 'operations'（營運知識）
  subject TEXT,
  content TEXT NOT NULL,
  source TEXT DEFAULT 'internal',
  valid_until DATE,
  confidence INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS domain_knowledge_project_idx
  ON domain_knowledge(project, category);
