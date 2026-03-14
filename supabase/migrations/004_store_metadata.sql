-- 004: Store metadata for big data analytics
-- These fields are filled by store owners (guided by AI assistant)
-- Used for cross-store analytics and market insights

ALTER TABLE stores ADD COLUMN IF NOT EXISTS cuisine_type TEXT;        -- 日料/中餐/西餐/咖啡/酒吧/韓式/泰式/甜點/夜市/其他
ALTER TABLE stores ADD COLUMN IF NOT EXISTS city TEXT;                -- 城市 (台北/高雄/台中...)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS district TEXT;            -- 區域 (信義區/駁二/...)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS price_range TEXT;         -- 平均客單價 (100以下/100-300/300-600/600-1000/1000以上)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS seating_capacity INTEGER; -- 座位數
ALTER TABLE stores ADD COLUMN IF NOT EXISTS opening_year INTEGER;     -- 開業年份
ALTER TABLE stores ADD COLUMN IF NOT EXISTS target_audience TEXT;     -- 目標客群 (上班族/學生/家庭/觀光客/商務)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS service_type TEXT;        -- 服務類型 (內用/外帶/外送/複合)
