-- 005: Store knowledge base — AI learns about each store
-- The AI assistant accumulates knowledge over time to become a true vice-manager

CREATE TABLE IF NOT EXISTS store_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,  -- menu_insight, philosophy, customer_trend, operational, specialty
  content TEXT NOT NULL,
  source TEXT,             -- 'ai_generated', 'owner_input', 'survey_analysis', 'menu_analysis'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_knowledge_store_id ON store_knowledge(store_id);
CREATE INDEX IF NOT EXISTS idx_store_knowledge_category ON store_knowledge(category);

ALTER TABLE store_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store members can manage knowledge" ON store_knowledge
  FOR ALL USING (is_store_member(store_id));

CREATE POLICY "Public cannot access knowledge" ON store_knowledge
  FOR SELECT USING (false);
