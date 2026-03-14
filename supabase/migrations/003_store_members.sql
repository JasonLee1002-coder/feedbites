-- 003: Store members (collaboration) & invites
-- Run this in Supabase SQL Editor

-- ══ Helper function: check if user is owner or member of a store ══
CREATE OR REPLACE FUNCTION is_store_member(target_store_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM stores WHERE id = target_store_id AND user_id = auth.uid()
    UNION ALL
    SELECT 1 FROM store_members WHERE store_id = target_store_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ══ store_members table ══
CREATE TABLE store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, user_id)
);

CREATE INDEX idx_store_members_store_id ON store_members(store_id);
CREATE INDEX idx_store_members_user_id ON store_members(user_id);

-- ══ store_invites table (for unregistered emails) ══
CREATE TABLE store_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, email)
);

CREATE INDEX idx_store_invites_email ON store_invites(email);

-- ══ RLS for store_members ══
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view store members" ON store_members
  FOR SELECT USING (is_store_member(store_id));

CREATE POLICY "Members can add members" ON store_members
  FOR INSERT WITH CHECK (is_store_member(store_id));

CREATE POLICY "Members can remove members" ON store_members
  FOR DELETE USING (is_store_member(store_id));

-- ══ RLS for store_invites ══
ALTER TABLE store_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invites" ON store_invites
  FOR SELECT USING (is_store_member(store_id));

CREATE POLICY "Members can create invites" ON store_invites
  FOR INSERT WITH CHECK (is_store_member(store_id));

CREATE POLICY "Members can delete invites" ON store_invites
  FOR DELETE USING (is_store_member(store_id));

-- ══ Update existing RLS policies to use is_store_member() ══

-- stores: allow members to SELECT
CREATE POLICY "Members can view member stores" ON stores
  FOR SELECT USING (
    id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
  );

-- surveys: allow members to manage
DROP POLICY IF EXISTS "Store owners can manage surveys" ON surveys;
CREATE POLICY "Store members can manage surveys" ON surveys
  FOR ALL USING (is_store_member(store_id));

-- responses: allow members to read
DROP POLICY IF EXISTS "Store owners can read responses" ON responses;
CREATE POLICY "Store members can read responses" ON responses
  FOR SELECT USING (
    survey_id IN (
      SELECT s.id FROM surveys s WHERE is_store_member(s.store_id)
    )
  );

-- discount_codes: allow members to manage
DROP POLICY IF EXISTS "Store owners can manage discount codes" ON discount_codes;
CREATE POLICY "Store members can manage discount codes" ON discount_codes
  FOR ALL USING (
    survey_id IN (
      SELECT s.id FROM surveys s WHERE is_store_member(s.store_id)
    )
  );

-- dishes: allow members to manage
DROP POLICY IF EXISTS "Store owners can manage dishes" ON dishes;
CREATE POLICY "Store members can manage dishes" ON dishes
  FOR ALL USING (is_store_member(store_id));
