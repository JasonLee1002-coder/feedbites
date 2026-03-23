-- Feedback Genie: 對話式回饋收集 + AI 情報分析
-- Phase 1: 對話與訊息
-- Phase 2: AI 分析洞察

-- 回饋對話 (每次客戶互動 = 一次對話)
CREATE TABLE IF NOT EXISTS feedback_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  source TEXT DEFAULT 'chat' CHECK (source IN ('chat', 'survey', 'widget')),
  customer_name TEXT,
  metadata JSONB DEFAULT '{}',
  sentiment_score FLOAT,
  topics TEXT[],
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'analyzed', 'actioned', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 對話中的每條訊息
CREATE TABLE IF NOT EXISTS feedback_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES feedback_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('genie', 'customer')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI 分析洞察報告
CREATE TABLE IF NOT EXISTS feedback_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  summary TEXT NOT NULL,
  issues JSONB NOT NULL DEFAULT '[]',
  self_review JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  conversation_count INT DEFAULT 0,
  avg_sentiment FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fc_store ON feedback_conversations(store_id);
CREATE INDEX IF NOT EXISTS idx_fc_status ON feedback_conversations(status);
CREATE INDEX IF NOT EXISTS idx_fc_created ON feedback_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fm_conversation ON feedback_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_fi_store ON feedback_insights(store_id);
CREATE INDEX IF NOT EXISTS idx_fi_period ON feedback_insights(period_start, period_end);
