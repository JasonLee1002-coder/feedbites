---
name: feedback
description: 套用使用者問題回報系統到新專案 — 雙向對話回報 + 截圖上傳 + 服務統計 + 進度時間軸 + LINE 推播通知 + 感動設計。當用戶要加入回報系統、問題回報、feedback、bug report、客服系統、issue tracker 時觸發。
---

# 問題回報系統 Skill

為 Next.js 專案加入完整的使用者問題回報與雙向對話系統。
支援 Drizzle ORM + tRPC 或 Supabase，可依專案技術棧調整。

## 功能清單

| 功能 | 說明 |
|------|------|
| 兩步驟回報精靈 | 選類型 → 描述問題 + 截圖上傳 |
| 雙向對話 | 用戶與團隊可在回報內來回對話 |
| 服務統計 | 已解決數、處理中數、各類型數量 |
| 進度時間軸 | 提交 → 處理中 → 已解決（3 步驟視覺化） |
| 已解決慶祝動畫 | ✓ + 感謝訊息，讓用戶感受到被重視 |
| 回覆數預覽 | 不展開就能看到回覆數 badge |
| 截圖上傳 | 支援多張截圖，5MB 限制，base64 存儲 |
| LINE 推播通知 | admin 回覆時自動推播給用戶（選用） |
| Admin 後台 | 集中管理所有回報，篩選狀態/類別 |

## 回覆風格指南

回覆用戶時必須：
- 用**溫暖、有情感**的文字，不要冷冰冰的技術語言
- 讓用戶感受到「有人在乎、有人在聽」
- 善用 emoji 增加親切感
- 感謝用戶的回饋，表達重視
- 不只說「已修復」，要說明做了什麼 + 後續關注

---

## 技術架構

### 方案 A：Drizzle ORM + tRPC（推薦）

#### Schema（Drizzle）

```typescript
// packages/db/src/schema/dev-reports.ts
import {
  boolean, jsonb, pgTable, text, timestamp, uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// ── 回報主表 ─────────────────────────────────────────────────────────
export const devReports = pgTable("dev_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportType: text("report_type", {
    enum: ["text", "image", "voice"],
  }).notNull(),
  originalContent: text("original_content"),
  filePath: text("file_path"),
  aiAnalysis: text("ai_analysis"),
  aiMetadata: jsonb("ai_metadata").$type<{
    severity: "high" | "medium" | "low";
    component: string;
    suggestedAction: string;
    tags: string[];
    screenshotCount?: number;
    screenshots?: string[];  // base64 data URLs
  }>(),
  status: text("status", {
    enum: ["pending", "in_progress", "resolved", "wontfix"],
  }).notNull().default("pending"),
  resolutionNotes: text("resolution_notes"),
  lineMessageId: text("line_message_id").unique(),
  reporterUserId: uuid("reporter_user_id").references(() => users.id),
  category: text("category"),  // 'bug' | 'ux' | 'feature' | 'other'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 雙向對話回覆 ─────────────────────────────────────────────────────
export const feedbackReplies = pgTable("feedback_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id").notNull().references(() => devReports.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

#### tRPC Router（完整實作）

```typescript
// packages/api/src/routers/dev-report.ts
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { devReports, feedbackReplies, users } from "@yuzu/db";
import { eq, and, desc, sql, count } from "drizzle-orm";

export const devReportRouter = router({
  // ── 建立回報 ──────────────────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      reportType: z.enum(["text", "image", "voice", "screenshot"]).default("text"),
      originalContent: z.string().min(1),
      category: z.string().optional(),
      screenshots: z.array(z.string()).optional(), // base64 data URLs
    }))
    .mutation(async ({ ctx, input }) => {
      const content = input.screenshots?.length
        ? `${input.originalContent} (截圖 ${input.screenshots.length} 張)`
        : input.originalContent;

      const [row] = await ctx.db
        .insert(devReports)
        .values({
          reportType: input.reportType === "screenshot" ? "image" : input.reportType,
          originalContent: content,
          status: "pending",
          reporterUserId: ctx.userId,
          category: input.category ?? null,
          aiMetadata: {
            severity: "medium" as const,
            component: input.category ?? "一般",
            suggestedAction: "",
            tags: [],
            ...(input.screenshots?.length
              ? { screenshotCount: input.screenshots.length, screenshots: input.screenshots }
              : {}),
          },
        })
        .returning();

      return { id: row.id };
    }),

  // ── 列出回報（公開，可篩選）───────────────────────────────────────
  list: publicProcedure
    .input(z.object({
      status: z.enum(["pending", "in_progress", "resolved", "wontfix"]).optional(),
      reportType: z.enum(["text", "image", "voice"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.status) conditions.push(eq(devReports.status, input.status));
      if (input.reportType) conditions.push(eq(devReports.reportType, input.reportType));

      const where = conditions.length > 0
        ? conditions.length === 1 ? conditions[0] : and(...conditions)
        : undefined;

      return ctx.db.select().from(devReports)
        .where(where)
        .orderBy(desc(devReports.createdAt))
        .limit(input.limit).offset(input.offset);
    }),

  // ── 單筆回報 ──────────────────────────────────────────────────────
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(devReports)
        .where(eq(devReports.id, input.id)).limit(1);
      return row ?? null;
    }),

  // ── 更新狀態 ──────────────────────────────────────────────────────
  updateStatus: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "in_progress", "resolved", "wontfix"]),
      resolutionNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(devReports).set({
        status: input.status,
        resolutionNotes: input.resolutionNotes,
        updatedAt: new Date(),
      }).where(eq(devReports.id, input.id));
    }),

  // ── 統計數據 ──────────────────────────────────────────────────────
  getStats: publicProcedure.query(async ({ ctx }) => {
    const [stats] = await ctx.db.select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) FILTER (WHERE ${devReports.status} = 'pending')::int`,
      inProgress: sql<number>`count(*) FILTER (WHERE ${devReports.status} = 'in_progress')::int`,
      resolved: sql<number>`count(*) FILTER (WHERE ${devReports.status} = 'resolved')::int`,
    }).from(devReports);
    return stats ?? { total: 0, pending: 0, inProgress: 0, resolved: 0 };
  }),

  // ── 我的回報（含回覆數）────────────────────────────────────────────
  myReports: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select({
      id: devReports.id,
      reportType: devReports.reportType,
      originalContent: devReports.originalContent,
      category: devReports.category,
      status: devReports.status,
      aiMetadata: devReports.aiMetadata,
      createdAt: devReports.createdAt,
      updatedAt: devReports.updatedAt,
      replyCount: sql<number>`(SELECT count(*)::int FROM feedback_replies WHERE feedback_replies.report_id = ${devReports.id})`,
    }).from(devReports)
      .where(eq(devReports.reporterUserId, ctx.userId))
      .orderBy(desc(devReports.createdAt));
  }),

  // ── 取得對話回覆 ──────────────────────────────────────────────────
  getReplies: protectedProcedure
    .input(z.object({ reportId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.select({
        id: feedbackReplies.id,
        content: feedbackReplies.content,
        isAdmin: feedbackReplies.isAdmin,
        createdAt: feedbackReplies.createdAt,
        authorName: users.name,
        authorAvatar: users.avatarUrl,
      }).from(feedbackReplies)
        .innerJoin(users, eq(users.id, feedbackReplies.authorUserId))
        .where(eq(feedbackReplies.reportId, input.reportId))
        .orderBy(feedbackReplies.createdAt);
    }),

  // ── 新增回覆 + LINE 推播 ─────────────────────────────────────────
  addReply: protectedProcedure
    .input(z.object({ reportId: z.string().uuid(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.userRole === "owner";

      const [reply] = await ctx.db.insert(feedbackReplies).values({
        reportId: input.reportId,
        authorUserId: ctx.userId,
        content: input.content,
        isAdmin,
      }).returning();

      // Admin 回覆 → LINE 推播給回報者（non-fatal）
      if (isAdmin) {
        try {
          const [reporter] = await ctx.db
            .select({ lineUserId: users.lineUserId, name: users.name })
            .from(devReports)
            .innerJoin(users, eq(users.id, devReports.reporterUserId))
            .where(eq(devReports.id, input.reportId))
            .limit(1);

          if (reporter?.lineUserId) {
            const { lineClient } = await import("@yuzu/line-bot");
            await lineClient.pushMessage({
              to: reporter.lineUserId,
              messages: [{
                type: "text",
                text: `💬 你的回報有新回覆：\n\n${input.content.slice(0, 200)}\n\n前往查看 → ${process.env.NEXT_PUBLIC_APP_URL}/feedback`,
              }],
            });
          }
        } catch (err) {
          console.error("[Feedback] LINE push failed (non-fatal):", err);
        }
      }

      return reply;
    }),
});
```

### 方案 B：Supabase 直連（替代方案）

```sql
-- 回報主表
CREATE TABLE feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  description TEXT,
  category TEXT,        -- 'bug' | 'ux' | 'feature' | 'other'
  status TEXT DEFAULT 'pending',  -- 'pending' | 'in_progress' | 'resolved' | 'wontfix'
  screenshots JSONB DEFAULT '[]',  -- base64 data URLs array
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 雙向對話回覆
CREATE TABLE feedback_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES feedback_reports(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_reports_status ON feedback_reports(status);
CREATE INDEX idx_feedback_replies_report ON feedback_replies(report_id);
```

---

## 前端頁面（完整實作）

```tsx
// src/app/(app)/feedback/page.tsx
"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";           // 改成你的 trpc hook
import { PageHeader } from "@/components/page-header"; // 改成你的 header
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════════════════════════════════

type Category = "bug" | "ux" | "feature" | "other";
type Step = "category" | "detail" | "done";
type Tab = "report" | "history";

interface CategoryOption {
  value: Category;
  icon: string;
  label: string;
  desc: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    value: "bug",
    icon: "🐛",
    label: "發現 Bug",
    desc: "功能壞掉、錯誤訊息",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200 hover:border-red-400",
  },
  {
    value: "ux",
    icon: "😵‍💫",
    label: "操作不順",
    desc: "步驟太多、不好用",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200 hover:border-orange-400",
  },
  {
    value: "feature",
    icon: "💡",
    label: "功能建議",
    desc: "希望新增的功能",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200 hover:border-blue-400",
  },
  {
    value: "other",
    icon: "❓",
    label: "其他",
    desc: "其他意見或回饋",
    color: "text-gray-700",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200 hover:border-gray-400",
  },
];

const CATEGORY_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  bug: { label: "Bug", color: "text-red-700", bg: "bg-red-100" },
  ux: { label: "操作不順", color: "text-orange-700", bg: "bg-orange-100" },
  feature: { label: "功能建議", color: "text-blue-700", bg: "bg-blue-100" },
  other: { label: "其他", color: "text-gray-700", bg: "bg-gray-100" },
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "待處理", color: "text-yellow-800", bg: "bg-yellow-100" },
  in_progress: { label: "處理中", color: "text-blue-800", bg: "bg-blue-100" },
  resolved: { label: "已解決", color: "text-green-800", bg: "bg-green-100" },
  wontfix: { label: "不修復", color: "text-gray-800", bg: "bg-gray-100" },
};

function formatDate(date: Date | string) {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════
// Status Timeline — 視覺化進度（提交 → 處理中 → 已解決）
// ═══════════════════════════════════════════════════════════════════════

function StatusTimeline({ status }: { status: string }) {
  const steps = [
    { key: "pending", label: "提交" },
    { key: "in_progress", label: "處理中" },
    { key: "resolved", label: "已解決" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === status);
  const activeIdx = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div className="flex items-center gap-1 py-3">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              i <= activeIdx ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-400"
            }`}>
              {i <= activeIdx ? "✓" : i + 1}
            </div>
            <span className={`mt-1 text-[10px] ${i <= activeIdx ? "text-orange-600 font-semibold" : "text-gray-400"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mx-1 h-0.5 w-8 ${i < activeIdx ? "bg-orange-400" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Reply Thread — 雙向對話回覆
// ═══════════════════════════════════════════════════════════════════════

function ReplyThread({ reportId }: { reportId: string }) {
  const [replyText, setReplyText] = useState("");
  const utils = trpc.useUtils();

  const { data: replies, isLoading } = trpc.devReport.getReplies.useQuery({ reportId });
  const addReply = trpc.devReport.addReply.useMutation({
    onSuccess: () => {
      setReplyText("");
      utils.devReport.getReplies.invalidate({ reportId });
      utils.devReport.myReports.invalidate();
    },
  });

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500">對話紀錄</p>

      {isLoading && <p className="text-xs text-gray-400">載入中...</p>}
      {replies && replies.length === 0 && <p className="text-xs text-gray-400">尚無回覆</p>}

      {replies?.map((r) => (
        <motion.div
          key={r.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl px-3 py-2 text-sm ${
            r.isAdmin
              ? "ml-0 mr-8 bg-orange-50 border border-orange-200"
              : "ml-8 mr-0 bg-gray-100"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            {r.isAdmin && (
              <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">管理員</span>
            )}
            <span className="text-xs font-medium text-gray-700">{r.authorName}</span>
            <span className="text-[10px] text-gray-400">{formatDate(r.createdAt)}</span>
          </div>
          <p className="text-gray-800 whitespace-pre-wrap">{r.content}</p>
        </motion.div>
      ))}

      {/* 回覆輸入框 */}
      <div className="flex gap-2 pt-1">
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="輸入回覆..."
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && replyText.trim() && !addReply.isPending) {
              addReply.mutate({ reportId, content: replyText.trim() });
            }
          }}
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (replyText.trim() && !addReply.isPending) {
              addReply.mutate({ reportId, content: replyText.trim() });
            }
          }}
          disabled={!replyText.trim() || addReply.isPending}
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-50"
        >
          {addReply.isPending ? "..." : "送出"}
        </motion.button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// My Reports Tab — 我的回報歷史（含展開、截圖、時間軸、對話）
// ═══════════════════════════════════════════════════════════════════════

function MyReportsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: reports, isLoading } = trpc.devReport.myReports.useQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-gray-400">
        <p className="text-sm">還沒有回報紀錄</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const catBadge = CATEGORY_BADGE[report.category ?? "other"] || CATEGORY_BADGE.other!;
        const statusBadge = STATUS_BADGE[report.status] || STATUS_BADGE.pending!;
        const isExpanded = expandedId === report.id;
        const metadata = report.aiMetadata as any;
        const screenshots: string[] = metadata?.screenshots ?? [];

        return (
          <motion.div key={report.id} layout className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {/* 摘要列 — 點擊展開 */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : report.id)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${catBadge.bg} ${catBadge.color}`}>
                    {catBadge.label}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge.bg} ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                  {report.replyCount > 0 && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                      {report.replyCount} 則回覆
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 truncate">{(report.originalContent ?? "").slice(0, 100)}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">{formatDate(report.createdAt)}</p>
              </div>
              <svg
                className={`mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* 展開詳情 */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-gray-100 px-4 py-3"
                >
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {report.originalContent}
                  </p>

                  {/* 截圖預覽 */}
                  {screenshots.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {screenshots.map((src, i) => (
                        <img key={i} src={src} alt={`截圖 ${i + 1}`}
                          className="h-24 w-24 rounded-xl border border-gray-200 object-cover shrink-0" />
                      ))}
                    </div>
                  )}

                  {/* 進度時間軸 */}
                  <StatusTimeline status={report.status} />

                  {/* 雙向對話 */}
                  <ReplyThread reportId={report.id} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Main Page — 兩步驟回報精靈 + 歷史 Tab
// ═══════════════════════════════════════════════════════════════════════

export default function FeedbackPage() {
  const [activeTab, setActiveTab] = useState<Tab>("report");
  const [step, setStep] = useState<Step>("category");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createReport = trpc.devReport.create.useMutation({
    onSuccess: () => setStep("done"),
  });

  function handleSelectCategory(cat: Category) {
    setSelectedCategory(cat);
    setStep("detail");
  }

  function handleScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = () => setScreenshots((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function handleSubmit() {
    if (!selectedCategory || !description.trim()) return;
    const label = CATEGORIES.find((c) => c.value === selectedCategory)?.label ?? "";
    createReport.mutate({
      reportType: screenshots.length > 0 ? "screenshot" : "text",
      originalContent: `[${label}] ${description.trim()}`,
      category: selectedCategory,
      screenshots,
    });
  }

  function handleReset() {
    setStep("category");
    setSelectedCategory(null);
    setDescription("");
    setScreenshots([]);
  }

  return (
    <div>
      <PageHeader title="問題回報" backHref="/" />
      <div className="mx-auto max-w-5xl px-4 py-4">

        {/* ═══ Tab 切換 ═══ */}
        <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab("report")}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${
              activeTab === "report" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500"
            }`}
          >回報問題</button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${
              activeTab === "history" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500"
            }`}
          >我的回報</button>
        </div>

        <AnimatePresence mode="wait">
          {/* ═══ Tab 1: 回報表單 ═══ */}
          {activeTab === "report" && (
            <motion.div key="tab-report" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <AnimatePresence mode="wait">

                {/* Step 1: 選類型 */}
                {step === "category" && (
                  <motion.div key="category" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    <p className="text-center text-sm text-gray-500">遇到什麼問題了嗎？</p>
                    <div className="space-y-2">
                      {CATEGORIES.map((cat, i) => (
                        <motion.button
                          key={cat.value}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectCategory(cat.value)}
                          className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all ${cat.borderColor} ${cat.bgColor}`}
                        >
                          <span className="text-2xl">{cat.icon}</span>
                          <div className="flex-1">
                            <p className={`text-sm font-bold ${cat.color}`}>{cat.label}</p>
                            <p className="text-xs text-gray-400">{cat.desc}</p>
                          </div>
                          <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: 描述 + 截圖 */}
                {step === "detail" && selectedCategory && (
                  <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">類型：</span>
                      {(() => {
                        const cat = CATEGORIES.find((c) => c.value === selectedCategory)!;
                        return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cat.bgColor} ${cat.color}`}>{cat.label}</span>;
                      })()}
                    </div>

                    {/* 截圖上傳 */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">截圖（選填）</label>
                      {screenshots.length > 0 && (
                        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                          {screenshots.map((src, i) => (
                            <div key={i} className="relative shrink-0">
                              <img src={src} alt={`截圖 ${i + 1}`} className="h-20 w-20 rounded-xl border border-gray-200 object-cover" />
                              <button onClick={() => setScreenshots((prev) => prev.filter((_, j) => j !== i))}
                                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button onClick={() => fileInputRef.current?.click()}
                        className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 py-6 hover:border-orange-300 hover:bg-orange-50/30">
                        <span className="text-sm text-gray-500">點擊上傳截圖</span>
                        <span className="text-[10px] text-gray-400">JPG / PNG，最大 5MB</span>
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleScreenshot} />
                    </div>

                    {/* 描述文字 */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">描述問題 <span className="text-red-500">*</span></label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                        placeholder="請描述你遇到的問題或建議..." autoFocus maxLength={2000} rows={5}
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm leading-relaxed focus:border-orange-400 focus:outline-none" />
                      <p className="mt-1 text-right text-[10px] text-gray-400">{description.length}/2000</p>
                    </div>

                    {/* 按鈕 */}
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => { setStep("category"); setSelectedCategory(null); }}
                        className="rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-600">返回</button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleSubmit}
                        disabled={!description.trim() || createReport.isPending}
                        className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-md disabled:opacity-50">
                        {createReport.isPending ? "送出中..." : "送出回報"}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: 完成 🎉 */}
                {step === "done" && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-16">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                      <svg className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </motion.div>
                    <h2 className="mt-4 text-lg font-bold text-gray-900">感謝回報！</h2>
                    <p className="mt-1 text-sm text-gray-500">我們會盡快處理</p>
                    <div className="mt-6 flex gap-3">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleReset}
                        className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-md">繼續回報</motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => { handleReset(); setActiveTab("history"); }}
                        className="rounded-xl bg-gray-100 px-6 py-2.5 text-sm font-bold text-gray-600">查看紀錄</motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══ Tab 2: 我的回報 ═══ */}
          {activeTab === "history" && (
            <motion.div key="tab-history" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <MyReportsTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

---

## 套用步驟

### 步驟 1：建立資料庫 Schema
- **Drizzle**：複製 `devReports` + `feedbackReplies` schema → 執行 `drizzle-kit push`
- **Supabase**：執行上方 SQL migration

### 步驟 2：建立 API 層
- **tRPC**：複製 `devReportRouter` → 在 root router 註冊 `devReport: devReportRouter`
- **REST API**：改為 Next.js Route Handlers（`/api/feedback/route.ts` 等）

### 步驟 3：建立前端頁面
- 複製整個 `FeedbackPage` 組件到 `src/app/(app)/feedback/page.tsx`
- 安裝依賴：`pnpm add framer-motion`（動畫庫）
- 調整 import 路徑（trpc hook、PageHeader 等）

### 步驟 4：導航連結
- 在 Dashboard / 選單加入「問題回報」入口，連結到 `/feedback`

### 步驟 5：LINE 推播（選用）
- 設定 `LINE_CHANNEL_ACCESS_TOKEN` 環境變數
- 在 `addReply` mutation 中加入 LINE push 邏輯
- Admin 回覆 → 自動推播 Flex Message 給回報者

---

## 設計原則

- **感動設計** — 進度時間軸、完成動畫讓用戶感受到被重視
- **雙向對話** — 不是單向工單，是即時互動的對話體驗
- **零摩擦** — 兩步驟完成回報（選類型 → 描述送出）
- **溫暖回覆** — 用有情感的文字回覆，不要冷冰冰的技術語言
- **截圖即證據** — 拖拉上傳，base64 存儲無需額外 storage

## 依賴套件

```json
{
  "framer-motion": "^11.x",
  "zod": "^3.x",
  "@trpc/server": "^11.x",
  "@trpc/react-query": "^11.x",
  "drizzle-orm": "^0.36.x"
}
```
