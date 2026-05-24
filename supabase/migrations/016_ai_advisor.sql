-- 016: AI Advisor — 副店長長期記憶 + 跨 session 對話記錄

-- ai_memories: 每家店獨立學習，越用越聰明
CREATE TABLE ai_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  -- 'customer'（顧客偏好）| 'performance'（業績洞察）
  -- | 'survey'（問卷趨勢）| 'preference'（店長習慣）| 'general'
  subject TEXT,
  content TEXT NOT NULL,
  confidence INT NOT NULL DEFAULT 1
);
CREATE INDEX ON ai_memories (store_id, confidence DESC, updated_at DESC);

-- assistant_chat_history: 跨 session 對話記錄（每店保留最近 50 筆）
CREATE TABLE assistant_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL
);
CREATE INDEX ON assistant_chat_history (store_id, created_at DESC);

-- RLS
ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all_ai_memories" ON ai_memories
  USING (true) WITH CHECK (true);
CREATE POLICY "service_all_chat_history" ON assistant_chat_history
  USING (true) WITH CHECK (true);
