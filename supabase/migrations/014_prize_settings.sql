-- 014: Prize wheel settings
-- discount_expiry_days already exists; add same-day-valid flag

ALTER TABLE surveys ADD COLUMN IF NOT EXISTS prize_same_day_valid BOOLEAN DEFAULT true;
