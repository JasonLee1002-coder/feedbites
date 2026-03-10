-- FeedBites Database Schema
-- Run this in Supabase SQL Editor

-- Stores (linked to auth.users)
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  store_name TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  bg_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Surveys
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 'fine-dining',
  custom_colors JSONB,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  discount_enabled BOOLEAN DEFAULT true,
  discount_type TEXT DEFAULT 'percentage',
  discount_value TEXT DEFAULT '9折',
  discount_expiry_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Responses
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  respondent_name TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discount codes
CREATE TABLE discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
  response_id UUID REFERENCES responses(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stores_user_id ON stores(user_id);
CREATE INDEX idx_surveys_store_id ON surveys(store_id);
CREATE INDEX idx_responses_survey_id ON responses(survey_id);
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_survey_id ON discount_codes(survey_id);

-- Row Level Security
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Stores: owner can CRUD
CREATE POLICY "Users can view own store" ON stores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own store" ON stores
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own store" ON stores
  FOR UPDATE USING (auth.uid() = user_id);

-- Surveys: owner can CRUD, public can read active surveys
CREATE POLICY "Store owners can manage surveys" ON surveys
  FOR ALL USING (
    store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
  );
CREATE POLICY "Public can read active surveys" ON surveys
  FOR SELECT USING (is_active = true);

-- Responses: owner can read, public can insert
CREATE POLICY "Store owners can read responses" ON responses
  FOR SELECT USING (
    survey_id IN (
      SELECT s.id FROM surveys s
      JOIN stores st ON s.store_id = st.id
      WHERE st.user_id = auth.uid()
    )
  );
CREATE POLICY "Public can submit responses" ON responses
  FOR INSERT WITH CHECK (true);

-- Discount codes: owner can read/update, public can insert via API
CREATE POLICY "Store owners can manage discount codes" ON discount_codes
  FOR ALL USING (
    survey_id IN (
      SELECT s.id FROM surveys s
      JOIN stores st ON s.store_id = st.id
      WHERE st.user_id = auth.uid()
    )
  );
CREATE POLICY "Public can insert discount codes" ON discount_codes
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read own discount code" ON discount_codes
  FOR SELECT USING (true);
