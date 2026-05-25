-- 017: 菜單自定義分類 — 每家店獨立管理分類名稱與排序

CREATE TABLE IF NOT EXISTS dish_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(store_id, name)
);
CREATE INDEX IF NOT EXISTS dish_categories_store_pos_idx ON dish_categories(store_id, position ASC);

ALTER TABLE dish_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all_dish_categories" ON dish_categories USING (true) WITH CHECK (true);

-- 遷移現有分類（dishes.category TEXT 欄位不動）
INSERT INTO dish_categories (store_id, name, position)
SELECT DISTINCT ON (store_id, category)
  store_id,
  category,
  (ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY category) - 1)::int
FROM dishes
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (store_id, name) DO NOTHING;
