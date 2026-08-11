-- 020: device_key — 供 AI 分析去重用
--
-- 這個欄位「不」用來阻擋重複填寫。重複填寫是刻意允許的（Jason 2026-08-10 決策：
-- 讓客人有佔便宜心態、主動宣傳來店），發券行為完全不受影響。
--
-- 用途：AI 意見分析時把同一裝置的多筆回應收斂成一筆（取最新），
-- 避免同一人的意見被放大成多人共識，導致店長依錯誤結論調整菜單。
--
-- 值為前端產生的隨機 UUID，存在 localStorage，不含任何個人資訊。
-- 舊資料為 NULL，一律各自視為獨立填答。

ALTER TABLE responses ADD COLUMN IF NOT EXISTS device_key TEXT;
CREATE INDEX IF NOT EXISTS idx_responses_device_key ON responses(device_key);
