-- 002: Add missing columns and dishes table
-- Run this in Supabase SQL Editor

-- ── surveys: add discount_mode and discount_tiers ──
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS discount_mode TEXT DEFAULT 'basic';
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS discount_tiers JSONB;

-- ── responses: add xp_earned and phone ──
ALTER TABLE responses ADD COLUMN IF NOT EXISTS xp_earned INTEGER;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS phone TEXT;

-- ── stores: add frame_id ──
ALTER TABLE stores ADD COLUMN IF NOT EXISTS frame_id TEXT;

-- ── dishes table ──
CREATE TABLE IF NOT EXISTS dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  category TEXT NOT NULL DEFAULT '主食',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dishes_store_id ON dishes(store_id);

-- RLS for dishes
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage dishes" ON dishes
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
  );

CREATE POLICY "Public can read active dishes" ON dishes
  FOR SELECT USING (is_active = true);

-- ── responses: add index for phone lookups ──
CREATE INDEX IF NOT EXISTS idx_responses_phone ON responses(phone) WHERE phone IS NOT NULL;
