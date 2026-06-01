# ai-advisor v7.0 升級通知 — 自我進化架構

**發出日期：** 2026-05-26
**版本跳躍：** v6.0 → v7.0（Mode B → Mode C）
**重要性：** 架構進化，非 breaking change，可逐步升級

## 核心變化

v7.0 讓 AI 不再只靠用戶告訴它什麼，而是**主動去充實自己的行業知識**：

- **引擎 1**：排程搜尋外部知識（法規更新、市場動態、新判例）→ 自動存入知識庫
- **引擎 2**：每次對話後 AI 自省「我哪裡答得不夠好？」→ 記錄知識空白 → 下次填補
- **引擎 3**：知識有保鮮期，過期自動觸發重新驗證

## 新增 DB（需 migration）

```sql
-- 1. knowledge_gaps 表
CREATE TABLE knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project TEXT NOT NULL, domain TEXT NOT NULL,
  gap_topic TEXT NOT NULL, discovery_context TEXT,
  priority INT DEFAULT 1, status TEXT DEFAULT 'pending',
  filled_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. domain_knowledge 加欄位
ALTER TABLE domain_knowledge
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'seed',
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS refresh_interval_days INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_stale BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stale_reason TEXT;
```

## 升級優先順序
- **LexForge / Feedbites**（已是 Mode B）→ 直接升 v7.0 Mode C，收益最大
- **Benson Stock** → 搭配 v6.0 升級一起做
- **SARA / Yuzu-san / mcstation-web** → v6.0 後再考慮

完整規格：`~/.claude/skills/ai-advisor/SKILL.md §十六`
