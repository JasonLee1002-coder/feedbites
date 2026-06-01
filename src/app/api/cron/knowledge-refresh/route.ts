// src/app/api/cron/knowledge-refresh/route.ts
// v7.0 Mode C — 進化引擎 3：知識定期更新 Cron Job
// 由 Vercel Cron 每週一 02:00 UTC+8 觸發

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runKnowledgeIntake, markStaleKnowledge } from '@/lib/knowledge-intake';

export const maxDuration = 300; // 5 分鐘上限（Vercel Pro 支援）

export async function GET(request: NextRequest) {
  // 驗證 Vercel Cron 呼叫（防止外部濫用）
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. 標記過期知識
    const staleCount = await markStaleKnowledge('feedbites', db);

    // 2. 獲取新知識（每次最多 4 個來源，避免超時）
    const result = await runKnowledgeIntake('feedbites', db, 4);

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      stale_marked: staleCount,
      sources_processed: result.processed,
      knowledge_inserted: result.inserted,
      errors: result.errors,
    };

    console.log('[cron/knowledge-refresh]', summary);

    return NextResponse.json(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cron/knowledge-refresh] fatal error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
