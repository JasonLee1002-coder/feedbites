-- 013: Add email column to responses table
-- Run this in Supabase SQL Editor

ALTER TABLE responses ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_responses_email ON responses(email) WHERE email IS NOT NULL;
