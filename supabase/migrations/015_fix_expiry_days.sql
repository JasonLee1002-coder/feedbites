-- 015: Fix surveys with wrong discount_expiry_days (e.g. 7 instead of 30)
-- Surveys with expiry < 14 days were likely created with wrong defaults
UPDATE surveys SET discount_expiry_days = 30 WHERE discount_expiry_days IS NULL OR discount_expiry_days < 14;
