-- Add invite_token for shareable invite links (LINE sharing)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS invite_token TEXT DEFAULT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_invite_token ON stores(invite_token) WHERE invite_token IS NOT NULL;
