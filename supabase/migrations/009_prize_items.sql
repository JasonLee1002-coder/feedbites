-- Add customizable prize wheel items to surveys
-- prize_items: JSONB array of { label, emoji, color }
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS prize_items JSONB DEFAULT NULL;

-- When prize_items is NULL, frontend falls back to DEFAULT_PRIZES
-- Example: [{"label":"9折優惠","emoji":"🎫","color":"#FF8C00"},{"label":"免費飲品","emoji":"🥤","color":"#42A5F5"}]
