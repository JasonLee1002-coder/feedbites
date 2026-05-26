import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

export async function GET() {
  const steps: Record<string, string> = {};

  try {
    // Step 1: Auth
    const supabase = await createServerSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr) { steps.auth = `FAIL: ${authErr.message}`; }
    else if (!user) { steps.auth = 'FAIL: no user'; }
    else { steps.auth = `OK: ${user.id.slice(0, 8)}...`; }

    if (!user) return NextResponse.json({ steps });

    // Step 2: Store
    const store = await getSelectedStore(user.id);
    if (!store) { steps.store = 'FAIL: no store'; }
    else { steps.store = `OK: ${store.store_name} (${store.id.slice(0, 8)}...)`; }

    if (!store) return NextResponse.json({ steps });

    // Step 3: DB queries
    try {
      const db = createServiceSupabase();
      const [mem, know, surv] = await Promise.all([
        db.from('ai_memories').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
        db.from('store_knowledge').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
        db.from('domain_knowledge').select('id', { count: 'exact', head: true }).eq('project', 'feedbites'),
      ]);
      steps.db_memories = mem.error ? `FAIL: ${mem.error.message}` : `OK: ${mem.count} rows`;
      steps.db_knowledge = know.error ? `FAIL: ${know.error.message}` : `OK: ${know.count} rows`;
      steps.db_domain = surv.error ? `FAIL: ${surv.error.message}` : `OK: ${surv.count} rows`;
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
