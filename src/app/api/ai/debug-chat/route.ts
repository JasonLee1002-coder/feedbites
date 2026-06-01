import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ai_memories, store_knowledge, domain_knowledge } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { getSelectedStore } from '@/lib/store-context';

export async function GET() {
  const steps: Record<string, string> = {};

  try {
    // Step 1: Auth
    const session = await auth();
    if (!session?.user?.id) {
      steps.auth = 'FAIL: no session';
      return NextResponse.json({ steps });
    }
    steps.auth = `OK: ${session.user.id.slice(0, 8)}...`;

    // Step 2: Store
    const store = await getSelectedStore(session.user.id);
    if (!store) {
      steps.store = 'FAIL: no store';
      return NextResponse.json({ steps });
    }
    steps.store = `OK: ${store.store_name} (${store.id.slice(0, 8)}...)`;

    // Step 3: DB queries
    try {
      const [memRow, knowRow, domainRow] = await Promise.all([
        db.select({ count: count() }).from(ai_memories).where(eq(ai_memories.store_id, store.id)),
        db.select({ count: count() }).from(store_knowledge).where(eq(store_knowledge.store_id, store.id)),
        db.select({ count: count() }).from(domain_knowledge).where(eq(domain_knowledge.project, 'feedbites')),
      ]);
      steps.db_memories = `OK: ${memRow[0]?.count ?? 0} rows`;
      steps.db_knowledge = `OK: ${knowRow[0]?.count ?? 0} rows`;
      steps.db_domain = `OK: ${domainRow[0]?.count ?? 0} rows`;
    } catch (e) {
      steps.db = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Step 4: Gemini
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent('說一個字：好');
      const text = result.response.text().trim();
      steps.gemini = `OK: "${text.slice(0, 20)}"`;
    } catch (e) {
      steps.gemini = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    }

  } catch (e) {
    steps.outer = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({ steps, env_key_set: !!process.env.GEMINI_API_KEY });
}
