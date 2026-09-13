# 常來點 EatAgain 正式站部署手冊（顧客帳本第一包）

> 分支：`feat/customer-ledger-p1`。**不要用 `scripts/deploy-ec2.sh`**：它會重產 AUTH_SECRET 與 CRON_SECRET（所有店長被登出、既有排程 401）、整檔覆寫 env、不含新變數、SSM 指令不等上一步完成。
> 每一個 🔴 步驟都要 Jason 當次確認後才做。EC2：`i-0edcfd5786837c7b0`（ap-northeast-1），走 SSM。

## 0. 前置（Jason）

- [ ] LINE Login channel 已建，Callback：`https://poc.mcstation.ai/eatagain/api/customer/line/callback`
- [ ] Google OAuth client 已加 redirect URI：`https://poc.mcstation.ai/eatagain/api/customer/google/callback`；店長端若也用 Google 登入，對應的 `/eatagain/api/auth/callback/google` 一併加
- [ ] 店長後台登入白名單 email 清單（至少：Jason、欣殿萬飲店主帳號、鄭子民）
- [ ] 見面禮券面額（阿水確認；預設 NT$30、滿 150、30 天）

## 1. 偵察（唯讀，不需確認）

```bash
docker ps --format '{{.Names}} {{.Image}} {{.Ports}}' | grep -i -E 'feedbites|postgres|nginx'
docker inspect feedbites --format '{{json .Config.Env}}' | tr ',' '\n' | sed 's/=.*/=<redacted>/'
docker inspect feedbites --format '{{json .HostConfig.Binds}} {{.HostConfig.NetworkMode}}'
ls -la /home/jason/feedbites/.env* 
crontab -l | grep -i feedbites
docker exec <nginx 容器> nginx -T 2>/dev/null | grep -n feedbites
```

記下：容器實際讀哪個 env 檔、資料庫容器名與使用者、nginx 設定檔位置、crontab 內打 `/feedbites` 的排程。

## 2. 🔴 備份資料庫

```bash
docker exec <db 容器> pg_dump -U <db 使用者> feedbites > ~/feedbites_backup_20260914_pre021.sql
ls -la ~/feedbites_backup_20260914_pre021.sql   # 大小必須 > 0
```

## 3. 🔴 套用 migration 021（新容器啟動前）

```bash
cd /home/jason/feedbites && git fetch && git checkout feat/customer-ledger-p1 && git pull
docker cp supabase/migrations/021_customer_ledger.sql <db 容器>:/tmp/021.sql
docker exec <db 容器> psql -U <db 使用者> -d feedbites -1 -v ON_ERROR_STOP=1 -f /tmp/021.sql
docker exec <db 容器> psql -U <db 使用者> -d feedbites -c "\d point_ledger" -c "\d customer_identities" -c "\d responses"
```

`-1` 讓整份在單一交易內，失敗就完全不套用。`responses` 要看到 `customer_id`。

## 4. 🔴 補環境變數（只追加，不覆寫）

在步驟 1 找到的 env 檔**追加**，既有的 `AUTH_SECRET`、`CRON_SECRET` 保留原值：

```
LINE_LOGIN_CHANNEL_ID=<Jason 提供>
LINE_LOGIN_CHANNEL_SECRET=<Jason 提供>
CUSTOMER_GOOGLE_CLIENT_ID=<global.env GOOGLE_CLIENT_ID>
CUSTOMER_GOOGLE_CLIENT_SECRET=<global.env GOOGLE_CLIENT_SECRET>
CUSTOMER_SESSION_SECRET=<openssl rand -base64 48，另存 global.env 為 FEEDBITES_CUSTOMER_SESSION_SECRET>
PUBLIC_BASE_URL=https://poc.mcstation.ai/eatagain
ALLOWED_LOGIN_EMAILS=<步驟 0 的清單，逗號分隔>
```

同檔內若有 `AUTH_URL`、`NEXTAUTH_URL`、`UPLOADS_BASE_URL`、`NEXT_PUBLIC_BASE_PATH` 含 `/feedbites`，改成 `/eatagain`。

> ⚠️ `ALLOWED_LOGIN_EMAILS` 沒設或打錯，**所有店長都登不進去**（fail-closed）。上線後立刻用名單內帳號實測登入。

## 5. 🔴 建置並換容器

依步驟 1 查到的 `docker run` 參數（network、volume、env-file、port 3200）重建：

```bash
cd /home/jason/feedbites
docker build -t feedbites:eatagain .
docker stop feedbites && docker rename feedbites feedbites-old
docker run -d --name feedbites <與舊容器相同的 network／volume／env-file／port 參數> feedbites:eatagain
docker logs feedbites --tail 50
```

出問題時回滾：`docker stop feedbites && docker rm feedbites && docker rename feedbites-old feedbites && docker start feedbites`（資料庫變更向下相容，舊版程式不讀新欄位）。穩定一天後再 `docker rm feedbites-old`。

## 6. 🔴 nginx

把 `scripts/nginx-feedbites.conf` 的內容替換進 nginx 主設定原本 feedbites 的區塊：

```bash
docker exec <nginx 容器> nginx -t && docker exec <nginx 容器> nginx -s reload
```

## 7. 排程

- 既有打 `/feedbites/api/cron/...` 的 crontab 改成 `/eatagain/...`（curl 不跟轉址，會悄悄失效）。
- 新增每日到期：

```
0 19 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://poc.mcstation.ai/eatagain/api/cron/points-expiry >> /home/jason/feedbites/logs/points-expiry.log 2>&1
```

手動跑一次，預期 `{"ok":true,"inserted":0}`。

## 8. 驗證（全部通過才算上線）

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://poc.mcstation.ai/eatagain/login                 # 200
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://poc.mcstation.ai/feedbites/dashboard   # 308 → /eatagain/dashboard
curl -s -o /dev/null -w "%{http_code}\n" https://poc.mcstation.ai/feedbites                      # 301
curl -s -o /dev/null -w "%{http_code}\n" "<資料庫裡任一 stores.logo_url>"                          # 200
curl -s -o /dev/null -w "%{http_code}\n" https://poc.mcstation.ai/eatagain/api/cron/points-expiry  # 401
```

1. 名單內帳號登入店長後台成功；名單外 email 被拒。
2. 欣殿萬飲後台「點數與餐券」：填入阿水確認的面額，打開「開放常來點點數與餐券」，儲存。
3. 手機掃欣殿萬飲問卷 → 填完 → 按「用 LINE 登入領取」→ 回到帳本頁看到點數與見面禮券。
4. 另一支手機走 Google。
5. 店長後台核銷該券；第二次核銷顯示「這張餐券已經用過了」。
6. 同一支手機再填一次，完成頁顯示「今天已經領過點數囉」。
7. 其他店（未打開開關）的問卷完成頁**沒有**領點卡片。
8. 抽一個既有 email 優惠券連結、一則 LINE 推播連結點開，轉址正常。
9. 三端截圖依 `~/.claude/shared_intel/playbooks/DEPLOY_VERIFICATION.md`。
10. 刪除測試客人：`DELETE FROM customers WHERE id IN (SELECT customer_id FROM customer_identities WHERE subject IN ('<LINE sub>','<Google sub>'));`

## 9. 收尾

- 分支合併 master、push。
- 欣殿萬飲 QR 立牌用 `https://poc.mcstation.ai/eatagain/s/<surveyId>` 重新產生後再印。
- 通知鄭子民：核銷怎麼做、兌換目錄怎麼改。
- `CTO_RESOURCES.md` 登記 LINE Login channel、Google redirect URI、新 env 與排程。

## 10. 店長 Google 登入部署（分支 `fix/staff-google-login`）

> 每一個 🔴 步驟都要 Jason 當次確認後才做。

### 10.1 🔴 環境變數（只追加，不覆寫）

在步驟 1 找到的 env 檔（`.env.production`）追加：

```
AUTH_GOOGLE_ID=<Google OAuth client ID>
AUTH_GOOGLE_SECRET=<Google OAuth client secret>
STAFF_EMAIL_LOGIN_ENABLED=true
```

並確認：

```
AUTH_URL=https://poc.mcstation.ai/eatagain/api/auth
```

- **`AUTH_URL` 一定要帶 `/api/auth`**。Auth.js 的 basePath 取自 AUTH_URL 的 pathname（`next-auth/lib/env.js` setEnvDefaults），寫成 `https://poc.mcstation.ai/eatagain` 時所有 `/eatagain/api/auth/*` 都會回 400 UnknownAction，Google 登入整個壞掉。`scripts/deploy-ec2.sh` 裡寫的就是不帶 `/api/auth` 的舊值，不要照抄。
- **`AUTH_URL` 不可缺**。正式環境沒有 AUTH_URL 時 Auth.js 會拒絕所有登入請求（UntrustedHost，刻意 fail-closed，不再信任請求的 Host 標頭）。
- `ALLOWED_LOGIN_EMAILS` 沿用步驟 4；名單內每個 email 都要是店長實際用來登入 Google 的帳號。
- 部署前在正式庫檢查有沒有大小寫或空白不一致的舊帳號（Google 登入一律用小寫 email 對應，對不上會建出新帳號、被導去建店）：

```sql
SELECT id, email FROM users WHERE email <> lower(trim(email));
```

有結果先停下來回報，不要直接改。

### 10.2 🔴 套用 migration 022（新容器啟動前）

```bash
docker cp supabase/migrations/022_users_google_sub.sql <db 容器>:/tmp/022.sql
docker exec <db 容器> psql -U <db 使用者> -d feedbites -1 -v ON_ERROR_STOP=1 -f /tmp/022.sql
docker exec <db 容器> psql -U <db 使用者> -d feedbites -c "\d users"
```

`users` 要看到 `google_sub` 欄位與 `uq_users_google_sub` 索引。可重跑。舊版程式不讀這個欄位，回滾容器不必回滾資料庫。

### 10.3 🔴 Google Cloud Console

OAuth client 的「已授權的重新導向 URI」加上：

```
https://poc.mcstation.ai/eatagain/api/auth/callback/google
```

### 10.4 🔴 建置與搬運映像檔（這台 EC2 不可以 build）

不要在 EC2 上跑 `docker build`，一律在本機建好再搬過去：

```bash
# 本機
docker build --platform linux/amd64 -t feedbites:staff-google .
docker save feedbites:staff-google | gzip > feedbites_staff-google_20260914.tar.gz
aws s3 cp feedbites_staff-google_20260914.tar.gz s3://transtep-rd/deploy/

# EC2（走 SSM）
aws s3 cp s3://transtep-rd/deploy/feedbites_staff-google_20260914.tar.gz /tmp/
gunzip -c /tmp/feedbites_staff-google_20260914.tar.gz | docker load
docker images | grep staff-google
```

換容器沿用步驟 5 的 `docker stop` / `rename` / `run` 參數與回滾方式，只是映像檔名改成 `feedbites:staff-google`（步驟 5 的 `docker build` 那一行不要在 EC2 上跑）。

### 10.5 驗證順序（照順序，前一步沒過不往下）

1. `STAFF_EMAIL_LOGIN_ENABLED=true` 狀態部署完成，`docker logs feedbites --tail 50` 沒有 `UntrustedHost`、`UnknownAction`。
2. 用**已經有店家**的白名單帳號，按「使用 Google 登入」完整走一次：進得去原本的店，**沒有**被導去建店頁。
3. 登出，再用同一個 Google 帳號登入一次，仍然進得去原本的店。
4. 白名單外的 Google 帳號登入：回到登入頁並顯示「這個 Google 帳號沒有登入權限」。
5. 開無痕視窗：登入頁仍有 email 表單，用白名單內 email 登入仍可用。
6. 以上都通過，才把 env 檔改成 `STAFF_EMAIL_LOGIN_ENABLED=false`。
7. **重啟容器**（`docker restart feedbites`）。環境變數只在啟動時讀，不重啟等於沒改。
8. 確認：
   - 登入頁**沒有** email 表單，只剩 Google 按鈕。
   - `curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" -d '{"email":"x@example.com"}' https://poc.mcstation.ai/eatagain/api/auth/login` 回 `403`。
   - 步驟 2 那個 Google 登入的分頁重新整理後仍在後台（Google session 不受開關影響）；用 email 登入取得的舊 session 會被登出，屬正常。

### 10.6 Google 帳號綁定（上線後的維運）

- 店長**第一次**用 Google 登入時，系統會把該 Google 帳號的不可變 ID（`sub`）寫進 `users.google_sub`。之後同一個 email 換成別的 Google 帳號（例如 Workspace 管理員把 email 重新指派給另一個人）會被拒絕，登入頁顯示沒有登入權限，log 事件是 `staff_google_signin_rejected`（`reason` 為 `sub_mismatch` 或 `sub_taken`，只記 sub 前 4 碼）。
- 店長確實換了 Google 帳號時，確認本人後人工清除綁定，下次登入會重新綁定：

```sql
UPDATE users SET google_sub = NULL, updated_at = NOW() WHERE email = '<店長 email>';
```
