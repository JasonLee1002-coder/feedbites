import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getSelectedStore } from '@/lib/store-context';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// GET: Retrieve store knowledge
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const adminDb = createServiceSupabase();
    const { data: knowledge } = await adminDb
      .from('store_knowledge')
      .select('*')
      .eq('store_id', store.id)
      .order('updated_at', { ascending: false });

    return NextResponse.json(knowledge || []);
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// POST: Add knowledge or trigger AI learning
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const adminDb = createServiceSupabase();
    const { action, category, content } = await request.json();

    // Manual knowledge input from store owner
    if (action === 'add') {
      const { error } = await adminDb.from('store_knowledge').insert({
        store_id: store.id,
        category: category || 'philosophy',
        content,
        source: 'owner_input',
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // AI auto-learn: analyze store's dishes, responses, and metadata
    if (action === 'learn') {
      // Gather store data
      const [{ data: dishes }, { data: surveys }, { data: existingKnowledge }] = await Promise.all([
        adminDb.from('dishes').select('name, description, category').eq('store_id', store.id),
        adminDb.from('surveys').select('id, title, questions').eq('store_id', store.id),
        adminDb.from('store_knowledge').select('content, category').eq('store_id', store.id),
      ]);

      // Get recent responses for insights
      const surveyIds = (surveys || []).map(s => s.id);
      let recentFeedback: string[] = [];
      if (surveyIds.length > 0) {
        const { data: responses } = await adminDb
          .from('responses')
          .select('answers')
          .in('survey_id', surveyIds)
          .order('submitted_at', { ascending: false })
          .limit(30);

        // Extract text answers
        for (const r of (responses || [])) {
          for (const [, v] of Object.entries(r.answers || {})) {
            if (typeof v === 'string' && v.length > 10) {
              recentFeedback.push(v);
            }
          }
        }
      }

      const storeInfo = {
        name: store.store_name,
        cuisine_type: store.cuisine_type,
        city: store.city,
        district: store.district,
        price_range: store.price_range,
        target_audience: store.target_audience,
      };

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const result = await model.generateContent([
        {
          text: `你是餐廳經營分析 AI。請根據以下資料，為這家店生成知識摘要。

店家資訊：
${JSON.stringify(storeInfo, null, 2)}

菜單（${(dishes || []).length} 道菜）：
${(dishes || []).map(d => `- ${d.name}（${d.category}）: ${d.description || '無描述'}`).join('\n')}

已有知識：
${(existingKnowledge || []).map(k => `[${k.category}] ${k.content}`).join('\n') || '尚無'}

最近客人回饋（${recentFeedback.length} 則）：
${recentFeedback.slice(0, 15).join('\n') || '尚無'}

請生成以下分類的知識摘要（每項 1-2 句）：
{
  "insights": [
    { "category": "specialty", "content": "這家店的招牌特色和強項（基於菜單分析）" },
    { "category": "customer_trend", "content": "客人偏好和趨勢（基於回饋分析）" },
    { "category": "menu_insight", "content": "菜單組合建議或亮點" },
    { "category": "operational", "content": "經營上可以改進的方向" }
  ]
}

只回覆 JSON。如果某個分類資料不足就跳過。基於實際數據分析，不要編造。`,
        },
      ]);

      const text = result.response.text();
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return NextResponse.json({ error: '分析失敗' }, { status: 422 });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const insights = parsed.insights || [];

      // Upsert knowledge — update existing categories, insert new ones
      for (const insight of insights) {
        const { data: existing } = await adminDb
          .from('store_knowledge')
          .select('id')
          .eq('store_id', store.id)
          .eq('category', insight.category)
          .eq('source', 'ai_generated')
          .single();

        if (existing) {
          await adminDb
            .from('store_knowledge')
            .update({ content: insight.content, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await adminDb.from('store_knowledge').insert({
            store_id: store.id,
            category: insight.category,
            content: insight.content,
            source: 'ai_generated',
          });
        }
      }

      return NextResponse.json({ success: true, learned: insights.length });
    }

    return NextResponse.json({ error: '無效的 action' }, { status: 400 });
  } catch (err) {
    console.error('Knowledge error:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

// DELETE: Remove a knowledge item
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });

    const store = await getSelectedStore(user.id);
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 });

    const { id } = await request.json();
    const adminDb = createServiceSupabase();

    await adminDb.from('store_knowledge').delete().eq('id', id).eq('store_id', store.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
