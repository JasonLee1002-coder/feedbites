---
name: team-invite
description: 套用團隊邀請協作系統到新專案 — 分享連結邀請 + 自動加入 + 成員管理 + RLS 權限。當用戶要加入邀請功能、團隊管理、成員協作、invite、collaboration、多人管理 時觸發。
---

# 團隊邀請協作系統 Skill

為 Next.js + Supabase 專案加入完整的團隊邀請與成員管理系統。
用戶可以產生邀請連結 → 分享到任何通訊軟體 → 對方點連結登入即加入。

## 功能清單

| 功能 | 說明 |
|------|------|
| 邀請連結 | 產生唯一 token 連結，一鍵分享 |
| 原生分享 | 手機跳出分享選單（LINE/Messenger/簡訊等） |
| 附台詞分享 | 連結 + 邀請台詞一起複製，不用自己打字 |
| 自動加入 | 對方點連結 → Google 登入 → 自動成為成員 |
| Email 備案 | 輸入 email 邀請，對方註冊後自動加入 |
| 成員列表 | 顯示建立者、成員、待加入者 |
| 移除/退出 | 建立者可移除成員，成員可自行退出 |
| RLS 權限 | Supabase Row Level Security 自動共享資料 |

## 技術架構

### 資料庫（Supabase）

```sql
-- 權限檢查函數
CREATE OR REPLACE FUNCTION is_store_member(target_store_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM stores WHERE id = target_store_id AND user_id = auth.uid()
    UNION ALL
    SELECT 1 FROM store_members WHERE store_id = target_store_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 成員表
CREATE TABLE store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, user_id)
);

-- Email 待加入表（尚未註冊的用戶）
CREATE TABLE store_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, email)
);

-- 邀請連結 token（加在主表上）
ALTER TABLE stores ADD COLUMN IF NOT EXISTS invite_token TEXT DEFAULT NULL;
CREATE UNIQUE INDEX idx_stores_invite_token ON stores(invite_token) WHERE invite_token IS NOT NULL;

-- RLS 政策
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view store members" ON store_members
  FOR SELECT USING (is_store_member(store_id));
CREATE POLICY "Members can add members" ON store_members
  FOR INSERT WITH CHECK (is_store_member(store_id));
CREATE POLICY "Members can remove members" ON store_members
  FOR DELETE USING (is_store_member(store_id));

-- 讓成員也能存取相關資料表（依專案調整）
-- 範例：surveys, responses, dishes 等加上 is_store_member() 檢查
```

### API 路由

| 路由 | 方法 | 說明 |
|------|------|------|
| `/api/stores/members` | GET | 列出成員 + 待加入者 |
| `/api/stores/members` | POST | 用 email 邀請（已註冊直接加入，未註冊存 invites） |
| `/api/stores/members` | DELETE | 移除成員 / 取消邀請 / 自行退出 |
| `/api/stores/invite-link` | GET | 產生/取得邀請連結 token |
| `/api/stores/invite-link` | DELETE | 重置邀請連結 |
| `/api/stores/join` | GET | 檢查邀請 token 有效性 |
| `/api/stores/join` | POST | 透過 token 加入 |

### 前端頁面

| 頁面/元件 | 說明 |
|-----------|------|
| 設定頁成員管理區塊 | 邀請連結 + 成員列表 + 移除/退出 |
| `/invite/[token]` | 邀請登入頁（品牌風格 + Google 登入） |

### Auth Callback 整合

在 `/api/auth/callback` 加入兩段邏輯：

```typescript
// 1. 處理 email 邀請（對方用受邀 email 註冊時自動加入）
if (user.email) {
  const { data: pendingInvites } = await adminDb
    .from('store_invites')
    .select('id, store_id, invited_by')
    .eq('email', user.email.toLowerCase());

  if (pendingInvites?.length > 0) {
    for (const invite of pendingInvites) {
      await adminDb.from('store_members').upsert({
        store_id: invite.store_id,
        user_id: user.id,
        invited_by: invite.invited_by,
      }, { onConflict: 'store_id,user_id' });
    }
    await adminDb.from('store_invites').delete().eq('email', user.email.toLowerCase());
  }
}

// 2. 處理連結邀請（從 ?invite=token 參數）
const inviteToken = searchParams.get('invite');
if (inviteToken) {
  const { data: inviteStore } = await adminDb
    .from('stores')
    .select('id, user_id')
    .eq('invite_token', inviteToken)
    .single();

  if (inviteStore && inviteStore.user_id !== user.id) {
    await adminDb.from('store_members').upsert({
      store_id: inviteStore.id,
      user_id: user.id,
      invited_by: inviteStore.user_id,
    }, { onConflict: 'store_id,user_id' });
  }
}
```

### 邀請台詞模板

分享時自動附上台詞（可依專案品牌自訂）：

```
嗨！邀請你一起管理「{組織名稱}」的 {專案名稱} 系統 🍽️

點下面連結，登入就能加入：
{邀請連結}

加入後可以一起查看數據、管理內容！
```

## 套用步驟

1. 執行 SQL 建立 `store_members`、`store_invites` 表 + RLS
2. 在主表加 `invite_token` 欄位
3. 複製 API 路由到 `src/app/api/stores/`
4. 建立 `/invite/[token]` 邀請頁面
5. 在設定頁加入成員管理 UI
6. 在 auth callback 加入自動加入邏輯
7. 依專案需求調整 RLS 政策（讓成員能存取哪些資料）

## 設計原則

- **不發 email** — 用連結分享，讓用戶自己選通訊工具
- **手機原生分享** — `navigator.share()` 讓手機跳出分享選單
- **台詞一起複製** — 不只給連結，完整台詞讓轉發更方便
- **兩條路徑並存** — 連結邀請（主要）+ email 邀請（備案）
- **自動轉正** — 註冊後自動從 invites 轉為 members，不需手動操作

## 適用場景

- 餐廳管理系統（多店員共管）
- SaaS 專案（團隊協作）
- 社群/組織管理
- 任何需要「邀請 → 加入 → 共享權限」的場景
