# Store Owner UX Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 從店長角度重構 FeedBites 使用體驗，讓店長用 5 分鐘空檔就能掌握店況並採取行動。

**Architecture:** 分三階段。Phase 1 純前端（Dashboard 任務牆 + 手機底部導航 + Gemini 3D 圖示）；Phase 2 後端（LINE 緊急警示）；Phase 3 資料層（菜品評分 + 問卷一鍵開關）。每個 Phase 可獨立部署。

**Tech Stack:** Next.js App Router、Supabase、framer-motion、Gemini API（圖示生成）、LINE Messaging API（已存在）

---

## 檔案地圖

| 動作 | 路徑 | 說明 |
|------|------|------|
| 修改 | `src/components/dashboard/DashboardClient.tsx` | 加入任務牆區塊 |
| 修改 | `src/app/dashboard/page.tsx` | 傳入緊急關鍵字資料 |
| 新增 | `src/components/dashboard/UrgentAlert.tsx` | 緊急警示卡片元件 |
| 新增 | `src/components/dashboard/MobileNav.tsx` | 手機底部導航 |
| 修改 | `src/app/dashboard/layout.tsx` | 掛載 MobileNav |
| 修改 | `src/components/dashboard/Sidebar.tsx` | 手機版隱藏側欄 |
| 新增 | `public/icons/` | Gemini 生成的 3D 圖示（PNG） |
| 新增 | `src/app/api/ai/urgent-check/route.ts` | 分析回饋找緊急關鍵字 |
| 新增 | `src/lib/line/urgent-alert.ts` | LINE 緊急推播邏輯 |
| 修改 | `src/app/api/surveys/[id]/responses/route.ts` | 收到回饋後觸發緊急檢查 |
| 新增 | `src/app/dashboard/menu/[dishId]/page.tsx` | 菜品詳情（含評分） |
| 新增 | `src/app/api/dishes/[id]/stats/route.ts` | 菜品評分 API |
| 修改 | `src/app/dashboard/menu/page.tsx` | 每道菜顯示評分 badge |
| 修改 | `src/app/dashboard/surveys/page.tsx` | 加入一鍵開關 toggle |

---

## Phase 1 — 視覺 & 導航

---

### Task 1：生成 Gemini 3D 可愛圖示

**目的：** 用 Gemini Imagen 生成一套風格一致的 3D 可愛圖示，取代 Lucide 線稿 icon。

**Files:**
- Create: `scripts/generate-icons.mjs`
- Create: `public/icons/` (存放 PNG)

- [ ] **Step 1：確認 Gemini API Key 存在**

```bash
echo $GEMINI_API_KEY
# 若空白，在 .env.local 加入：
# GEMINI_API_KEY=你的key
```

- [ ] **Step 2：建立圖示生成腳本**

建立 `scripts/generate-icons.mjs`：

```js
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const icons = [
  { name: 'home',     prompt: '3D cute cartoon house icon, warm orange color, rounded corners, white background, minimal, app icon style, PNG' },
  { name: 'menu',     prompt: '3D cute cartoon fork and spoon icon, orange color, rounded, white background, minimal, app icon style, PNG' },
  { name: 'survey',   prompt: '3D cute cartoon clipboard with checkmarks icon, orange color, rounded, white background, minimal, app icon style, PNG' },
  { name: 'insights', prompt: '3D cute cartoon brain or light bulb icon, golden color, rounded, white background, minimal, app icon style, PNG' },
  { name: 'settings', prompt: '3D cute cartoon gear/cog icon, orange color, rounded, white background, minimal, app icon style, PNG' },
  { name: 'alert',    prompt: '3D cute cartoon red bell with exclamation icon, rounded, white background, minimal, app icon style, PNG' },
  { name: 'star',     prompt: '3D cute cartoon gold star icon, shiny, rounded, white background, minimal, app icon style, PNG' },
  { name: 'feedback', prompt: '3D cute cartoon speech bubble with heart icon, orange color, rounded, white background, minimal, app icon style, PNG' },
];

const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-preview-image-generation' });
const outDir = './public/icons';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const icon of icons) {
  console.log(`Generating: ${icon.name}...`);
  try {
    const result = await model.generateContent([icon.prompt]);
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
    if (imagePart?.inlineData?.data) {
      const buf = Buffer.from(imagePart.inlineData.data, 'base64');
      fs.writeFileSync(path.join(outDir, `${icon.name}.png`), buf);
      console.log(`  ✅ Saved ${icon.name}.png`);
    } else {
      console.log(`  ⚠️ No image data for ${icon.name}`);
    }
  } catch (e) {
    console.error(`  ❌ ${icon.name}: ${e.message}`);
  }
}
```

- [ ] **Step 3：安裝依賴並執行**

```bash
npm install @google/generative-ai
node scripts/generate-icons.mjs
# 預期：public/icons/ 下出現 home.png, menu.png, survey.png, insights.png, settings.png, alert.png, star.png, feedback.png
```

- [ ] **Step 4：確認圖示品質，不滿意就調整 prompt 重跑**

- [ ] **Step 5：Commit**

```bash
git add public/icons/ scripts/generate-icons.mjs
git commit -m "feat: Gemini 生成 3D 可愛圖示集"
```

---

### Task 2：手機底部導航列 MobileNav

**Files:**
- Create: `src/components/dashboard/MobileNav.tsx`
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/components/dashboard/Sidebar.tsx`

- [ ] **Step 1：建立 MobileNav 元件**

建立 `src/components/dashboard/MobileNav.tsx`：

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/dashboard',          label: '首頁',   icon: '/icons/home.png' },
  { href: '/dashboard/menu',     label: '菜單',   icon: '/icons/menu.png' },
  { href: '/dashboard/surveys',  label: '問卷',   icon: '/icons/survey.png' },
  { href: '/dashboard/insights', label: 'AI洞察', icon: '/icons/insights.png' },
  { href: '/dashboard/settings', label: '設定',   icon: '/icons/settings.png' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur-md border-t border-[#E8E2D8] safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard' || pathname === '/dashboard/'
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[52px]">
              <motion.div
                animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`relative w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-[#FF8C00]/10' : ''}`}
              >
                <Image src={item.icon} alt={item.label} width={28} height={28} className="object-contain" />
                {isActive && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF8C00] rounded-full"
                  />
                )}
              </motion.div>
              <span className={`text-[9px] font-medium ${isActive ? 'text-[#FF8C00]' : 'text-[#8A8585]'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2：掛載到 layout**

修改 `src/app/dashboard/layout.tsx`，在 `</div>` 之前加入：

```tsx
import MobileNav from '@/components/dashboard/MobileNav';

// 在 return 的最外層 div 裡，main 之後加：
<MobileNav />
```

完整 return 結構：
```tsx
return (
  <div className="min-h-screen bg-[#FAF7F2] overflow-x-hidden">
    <Sidebar ... />
    <main className="lg:pl-60 overflow-x-hidden">
      <div className="pt-14 lg:pt-0 pb-20 lg:pb-0 max-w-full">
        {isCollab && ( ... )}
        {children}
      </div>
    </main>
    <MobileNav />
  </div>
);
```

注意 `pb-20 lg:pb-0`：手機版底部留 padding，避免內容被 nav 遮住。

- [ ] **Step 3：隱藏 Sidebar 手機版 header 的導航項目**

`src/components/dashboard/Sidebar.tsx` 找到手機版 hamburger menu 下的 nav items，確認它們已有 `hidden lg:flex` 或只在桌面顯示。若側欄裡的 nav 在手機版可見，加上 `hidden lg:block`。

- [ ] **Step 4：本地測試手機寬度（375px）**，確認底部 nav 正常、不與 AI 副店長重疊（副店長改為 `bottom: 80px` 以上）

- [ ] **Step 5：Commit**

```bash
git add src/components/dashboard/MobileNav.tsx src/app/dashboard/layout.tsx src/components/dashboard/Sidebar.tsx
git commit -m "feat: 手機底部導航列，使用 3D 可愛圖示"
```

---

### Task 3：今日任務牆 — UrgentAlert 元件

**Files:**
- Create: `src/components/dashboard/UrgentAlert.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/dashboard/DashboardClient.tsx`

- [ ] **Step 1：建立緊急關鍵字分析（純前端，server-side）**

在 `src/app/dashboard/page.tsx` 的資料 fetch 區塊，在取得 `allResponses` 之後加入：

```ts
// 分析近 24 小時的文字回覆，找出重複關鍵字
const urgentKeywords: { keyword: string; count: number; samples: string[] }[] = [];
const negativeWords = ['鹹', '淡', '慢', '貴', '冷', '硬', '油', '臭', '差', '爛', '等太久', '不新鮮', '不好', '難吃'];
const recentTextResponses: string[] = [];

const dayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
const recentResp = allResp.filter(r => r.submitted_at >= dayAgo);

for (const r of recentResp) {
  if (r.answers) {
    for (const v of Object.values(r.answers)) {
      if (typeof v === 'string' && v.length > 2) recentTextResponses.push(v);
    }
  }
}

for (const kw of negativeWords) {
  const matches = recentTextResponses.filter(t => t.includes(kw));
  if (matches.length >= 2) {
    urgentKeywords.push({ keyword: kw, count: matches.length, samples: matches.slice(0, 2) });
  }
}
urgentKeywords.sort((a, b) => b.count - a.count);
const topUrgent = urgentKeywords.slice(0, 3);
```

然後把 `topUrgent` 傳給 `DashboardClient`：

```tsx
<DashboardClient
  ...（原有 props）
  urgentKeywords={topUrgent}
/>
```

- [ ] **Step 2：更新 DashboardData interface**

`src/components/dashboard/DashboardClient.tsx` 的 interface 加入：

```ts
urgentKeywords: { keyword: string; count: number; samples: string[] }[];
```

- [ ] **Step 3：建立 UrgentAlert 元件**

建立 `src/components/dashboard/UrgentAlert.tsx`：

```tsx
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

interface UrgentAlertProps {
  keywords: { keyword: string; count: number; samples: string[] }[];
  storeName: string;
  todayResponses: number;
  overallAvg: number | null;
  pendingCount: number;
}

export default function UrgentAlert({ keywords, storeName, todayResponses, overallAvg, pendingCount }: UrgentAlertProps) {
  const hasUrgent = keywords.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-5 space-y-3"
    >
      {/* 緊急警示 */}
      {hasUrgent && (
        <motion.div
          className="rounded-2xl p-4 border border-red-200 bg-red-50"
          animate={{ boxShadow: ['0 0 0 0 rgba(239,68,68,0)', '0 0 0 6px rgba(239,68,68,0.1)', '0 0 0 0 rgba(239,68,68,0)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Image src="/icons/alert.png" alt="alert" width={24} height={24} />
            <span className="text-sm font-bold text-red-700">今日需要注意</span>
          </div>
          <div className="space-y-1.5">
            {keywords.map((kw) => (
              <Link key={kw.keyword} href="/dashboard/surveys" className="block">
                <div className="flex items-start gap-2 bg-white rounded-xl px-3 py-2 border border-red-100 hover:border-red-300 transition-colors">
                  <span className="text-red-500 font-bold text-xs mt-0.5">「{kw.keyword}」×{kw.count}</span>
                  <span className="text-[11px] text-[#666] leading-relaxed flex-1">
                    {kw.samples[0]?.slice(0, 30)}{kw.samples[0]?.length > 30 ? '...' : ''}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* 今日狀況 */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/surveys">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="bg-white rounded-2xl p-4 border border-[#E8E2D8] flex items-center gap-3"
          >
            <Image src="/icons/feedback.png" alt="feedback" width={36} height={36} />
            <div>
              <div className="text-2xl font-bold text-[#3A3A3A]">{todayResponses}</div>
              <div className="text-[11px] text-[#8A8585]">今日回饋</div>
            </div>
          </motion.div>
        </Link>

        <Link href="/dashboard/insights">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="bg-white rounded-2xl p-4 border border-[#E8E2D8] flex items-center gap-3"
          >
            <Image src="/icons/star.png" alt="star" width={36} height={36} />
            <div>
              <div className="text-2xl font-bold text-[#3A3A3A]">
                {overallAvg ? overallAvg.toFixed(1) : '--'}
              </div>
              <div className="text-[11px] text-[#8A8585]">平均評分</div>
            </div>
          </motion.div>
        </Link>
      </div>

      {/* 待辦提示 */}
      {pendingCount > 0 && (
        <Link href="/dashboard/surveys">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="bg-[#FFF8F0] rounded-2xl p-4 border border-[#FF8C00]/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📬</span>
              <span className="text-sm text-[#3A3A3A]">有 <b>{pendingCount}</b> 筆回饋等你看</span>
            </div>
            <span className="text-[#FF8C00] text-xs font-bold">查看 →</span>
          </motion.div>
        </Link>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 4：在 DashboardClient 中使用 UrgentAlert**

`src/components/dashboard/DashboardClient.tsx` 頂部 import：

```tsx
import UrgentAlert from './UrgentAlert';
```

在 `WhatsNew` 之後、Hero Banner 之前插入：

```tsx
<UrgentAlert
  keywords={urgentKeywords}
  storeName={storeName}
  todayResponses={todayResponses}
  overallAvg={overallAvg}
  pendingCount={recentResponses.filter(r => !r.avg || r.avg === null).length}
/>
```

- [ ] **Step 5：Commit**

```bash
git add src/components/dashboard/UrgentAlert.tsx src/app/dashboard/page.tsx src/components/dashboard/DashboardClient.tsx
git commit -m "feat: 今日任務牆 — 緊急警示 + 快速狀況卡"
```

---

## Phase 2 — LINE 緊急推播

---

### Task 4：LINE 緊急警示推播

觸發條件：同一個負面關鍵字在過去 **1 小時內** 出現 **3 次以上**，推播給店長。

**Files:**
- Create: `src/lib/line/urgent-alert.ts`
- Modify: `src/app/api/surveys/[id]/responses/route.ts`

- [ ] **Step 1：建立推播邏輯**

建立 `src/lib/line/urgent-alert.ts`：

```ts
import { pushFlexMessage } from './push';

const NEGATIVE_WORDS = ['鹹', '淡', '慢', '貴', '冷', '硬', '油', '臭', '差', '爛', '等太久', '不新鮮', '不好', '難吃'];

export async function checkAndPushUrgentAlert({
  lineUserId,
  storeName,
  recentTexts,
}: {
  lineUserId: string;
  storeName: string;
  recentTexts: string[];
}) {
  for (const kw of NEGATIVE_WORDS) {
    const matches = recentTexts.filter(t => t.includes(kw));
    if (matches.length >= 3) {
      await pushFlexMessage(lineUserId, `🚨 緊急：「${kw}」被提到 ${matches.length} 次`, {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'horizontal',
          backgroundColor: '#DC2626',
          paddingAll: '16px',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '🚨 FeedBites 緊急警示', size: 'sm', color: '#FFFFFF', weight: 'bold' },
                { type: 'text', text: storeName, size: 'xs', color: '#FFFFFFCC' },
              ],
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          paddingAll: '16px',
          contents: [
            {
              type: 'text',
              text: `「${kw}」在過去 1 小時被提到 ${matches.length} 次`,
              weight: 'bold',
              size: 'md',
              wrap: true,
              color: '#3A3A3A',
            },
            { type: 'separator', color: '#E8E2D8' },
            ...matches.slice(0, 2).map(m => ({
              type: 'text' as const,
              text: `• ${m.slice(0, 40)}`,
              size: 'sm' as const,
              color: '#555555',
              wrap: true,
            })),
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '12px',
          contents: [{
            type: 'button',
            action: {
              type: 'uri',
              label: '立刻查看回饋',
              uri: 'https://feedbites-seven.vercel.app/dashboard/surveys',
            },
            style: 'primary',
            color: '#DC2626',
            height: 'sm',
          }],
        },
        styles: { footer: { separator: true } },
      });
      return; // 只推一次最嚴重的
    }
  }
}
```

- [ ] **Step 2：在收到回饋時觸發**

`src/app/api/surveys/[id]/responses/route.ts` 找到 POST handler，在成功 insert response 之後加入：

```ts
import { checkAndPushUrgentAlert } from '@/lib/line/urgent-alert';

// 在 insert 成功後：
const storeLineId = store.line_user_id;
if (storeLineId) {
  // 取過去 1 小時文字回覆
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const { data: recentResps } = await adminDb
    .from('responses')
    .select('answers')
    .in('survey_id', [params.id])
    .gte('submitted_at', hourAgo);

  const recentTexts: string[] = [];
  for (const r of recentResps ?? []) {
    for (const v of Object.values(r.answers ?? {})) {
      if (typeof v === 'string' && v.length > 2) recentTexts.push(v);
    }
  }

  // 不 await，不阻塞回應
  checkAndPushUrgentAlert({
    lineUserId: storeLineId,
    storeName: store.store_name,
    recentTexts,
  }).catch(() => {});
}
```

- [ ] **Step 3：Commit**

```bash
git add src/lib/line/urgent-alert.ts src/app/api/surveys/[id]/responses/route.ts
git commit -m "feat: LINE 緊急警示推播 — 同關鍵字 3 次觸發"
```

---

## Phase 3 — 資料層深度功能

---

### Task 5：菜品層級評分

讓每道菜可以看到：被提及次數、平均評分、近期留言。

**Files:**
- Create: `src/app/api/dishes/[id]/stats/route.ts`
- Modify: `src/app/dashboard/menu/page.tsx`

- [ ] **Step 1：建立菜品統計 API**

建立 `src/app/api/dishes/[id]/stats/route.ts`：

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

  const store = await getSelectedStore(user.id);
  if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

  const adminDb = createServiceSupabase();

  // 取得菜品名稱
  const { data: dish } = await adminDb
    .from('dishes')
    .select('name')
    .eq('id', params.id)
    .eq('store_id', store.id)
    .single();

  if (!dish) return NextResponse.json({ error: '找不到菜品' }, { status: 404 });

  // 取得此店所有問卷的回覆，搜尋包含菜名的文字回覆
  const { data: surveys } = await adminDb
    .from('surveys')
    .select('id')
    .eq('store_id', store.id);

  const surveyIds = surveys?.map(s => s.id) ?? [];
  if (surveyIds.length === 0) return NextResponse.json({ mentions: 0, avgRating: null, comments: [] });

  const { data: responses } = await adminDb
    .from('responses')
    .select('answers, submitted_at')
    .in('survey_id', surveyIds)
    .order('submitted_at', { ascending: false })
    .limit(200);

  const dishName = dish.name;
  const comments: string[] = [];
  const ratings: number[] = [];

  for (const r of responses ?? []) {
    if (!r.answers) continue;
    for (const [, v] of Object.entries(r.answers)) {
      if (typeof v === 'string' && v.includes(dishName)) {
        comments.push(v);
      }
      const n = Number(v);
      if (!isNaN(n) && n >= 1 && n <= 5) ratings.push(n);
    }
  }

  return NextResponse.json({
    mentions: comments.length,
    avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    comments: comments.slice(0, 5),
  });
}
```

- [ ] **Step 2：在菜單頁面的每道菜下方顯示評分 badge**

`src/app/dashboard/menu/page.tsx` — 找到菜品卡片 render，在菜品名稱下方加入：

```tsx
{/* 評分 badge — client-side fetch */}
<DishRatingBadge dishId={dish.id} />
```

建立 `src/components/dashboard/DishRatingBadge.tsx`：

```tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function DishRatingBadge({ dishId }: { dishId: string }) {
  const [stats, setStats] = useState<{ mentions: number; avgRating: number | null } | null>(null);

  useEffect(() => {
    fetch(`/api/dishes/${dishId}/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, [dishId]);

  if (!stats || (stats.mentions === 0 && !stats.avgRating)) return null;

  return (
    <div className="flex items-center gap-2 mt-1">
      {stats.avgRating && (
        <span className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          <Image src="/icons/star.png" alt="star" width={12} height={12} />
          {stats.avgRating.toFixed(1)}
        </span>
      )}
      {stats.mentions > 0 && (
        <span className="text-[11px] text-[#8A8585]">被提及 {stats.mentions} 次</span>
      )}
    </div>
  );
}
```

- [ ] **Step 3：新增 `src/components/dashboard/DishRatingBadge.tsx` 到 git**

- [ ] **Step 4：Commit**

```bash
git add src/app/api/dishes/[id]/stats/route.ts src/components/dashboard/DishRatingBadge.tsx src/app/dashboard/menu/page.tsx
git commit -m "feat: 菜品層級評分 badge — 提及次數 + 平均分"
```

---

### Task 6：問卷一鍵開關

在問卷列表直接 toggle 啟用/停用，不需要進入編輯頁。

**Files:**
- Modify: `src/app/dashboard/surveys/page.tsx`（找到問卷卡片，加 toggle switch）

- [ ] **Step 1：確認 toggle API 存在**

```bash
grep -n "is_active\|toggle" src/app/api/surveys/*/route.ts
```

若 PUT `/api/surveys/[id]` 支援 `{ is_active: boolean }`，直接使用。

- [ ] **Step 2：建立 SurveyToggle 元件**

建立 `src/components/dashboard/SurveyToggle.tsx`：

```tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface SurveyToggleProps {
  surveyId: string;
  initialActive: boolean;
}

export default function SurveyToggle({ surveyId, initialActive }: SurveyToggleProps) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    const newVal = !active;
    setActive(newVal); // optimistic
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newVal }),
      });
      if (!res.ok) setActive(!newVal); // revert
    } catch {
      setActive(!newVal);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      disabled={loading}
      className="flex items-center gap-1.5 shrink-0"
      aria-label={active ? '停用問卷' : '啟用問卷'}
    >
      <motion.div
        className={`w-10 h-6 rounded-full relative ${active ? 'bg-[#FF8C00]' : 'bg-[#D1C9BC]'} transition-colors`}
        animate={loading ? { opacity: 0.5 } : { opacity: 1 }}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
          animate={{ left: active ? '18px' : '2px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.div>
      <span className={`text-[11px] font-medium ${active ? 'text-[#FF8C00]' : 'text-[#8A8585]'}`}>
        {active ? '開啟' : '關閉'}
      </span>
    </button>
  );
}
```

- [ ] **Step 3：在問卷列表卡片加入 SurveyToggle**

`src/app/dashboard/surveys/page.tsx` — 找到每個問卷卡片 render，在右側加入：

```tsx
import SurveyToggle from '@/components/dashboard/SurveyToggle';

// 在問卷卡片 flex 列尾端：
<SurveyToggle surveyId={survey.id} initialActive={survey.is_active} />
```

- [ ] **Step 4：Commit**

```bash
git add src/components/dashboard/SurveyToggle.tsx src/app/dashboard/surveys/page.tsx
git commit -m "feat: 問卷一鍵開關 toggle，問卷列表直接啟用/停用"
```

---

### Task 7：最終整合 Push

- [ ] **Step 1：全部 push**

```bash
git push
```

- [ ] **Step 2：Vercel 部署後逐項驗證**

| 項目 | 驗證方式 |
|------|---------|
| 3D 圖示 | 手機開 dashboard，確認圖示顯示 |
| 底部導航 | 手機寬度，確認 5 個 tab 可點擊跳頁 |
| 任務牆 | 有回饋的店家，首頁顯示今日回饋數 |
| 緊急警示 | 手動在 Supabase 塞入含負面詞的回覆，看是否推播 |
| 菜品評分 | 菜單頁，有評分的菜品下方顯示 badge |
| 一鍵開關 | 問卷列表 toggle，重整後狀態保留 |

---

## 執行順序建議

```
Task 1 (圖示) → Task 2 (手機導航) → Task 3 (任務牆)
         ↓
Task 4 (LINE 推播)
         ↓
Task 5 (菜品評分) → Task 6 (問卷開關) → Task 7 (Push)
```

Phase 1 做完就可先 push 看效果，Phase 2、3 再繼續。
