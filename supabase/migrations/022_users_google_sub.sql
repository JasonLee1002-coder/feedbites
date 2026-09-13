-- 022: users.google_sub — 店長 Google 登入綁定 Google 不可變的帳號 ID（OIDC sub）
--
-- 只用 email 對應帳號時，Google Workspace 管理員把同一個 email 重新指派給另一個人，
-- 新的人會以同 email 登入並繼承舊店長的 users.id 與店家權限。
-- 第一次 Google 登入時把 sub 寫入；之後同 email 但 sub 不同一律拒絕。
-- 既有使用者為 NULL，第一次 Google 登入時綁定。換 Google 帳號需人工把此欄清成 NULL。
-- 可重跑。

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL;
