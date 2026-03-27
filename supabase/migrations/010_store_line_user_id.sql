-- Add LINE User ID for store owners (for push notifications via Yuzu-san)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS owner_line_user_id TEXT DEFAULT NULL;
