import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from '@/lib/db'
import { store_knowledge, dishes, surveys, responses } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { getSelectedStore } from '@/lib/store-context'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// GET: Retrieve store knowledge
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })

    const store = await getSelectedStore(session.user.id)
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 })

    const knowledge = await db
      .select()
      .from(store_knowledge)
      .where(eq(store_knowledge.store_id, store.id))
      .orderBy(desc(store_knowledge.updated_at))

    return NextResponse.json(knowledge)
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// POST: Add knowledge or trigger AI learning
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })

    const store = await getSelectedStore(session.user.id)
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 })

    const { action, category, content } = await request.json()

    // Manual knowledge input from store owner
    if (action === 'add') {
      await db.insert(store_knowledge).values({
        store_id: store.id,
        category: category || 'philosophy',
        content,
        source: 'owner_input',
      })
      return NextResponse.json({ success: true })
    }

    // AI auto-learn: analyze store's dishes, responses, and metadata
    if (action === 'learn') {
      const [dishList, surveyList, existingKnowledge] = await Promise.all([
        db.select({ name: dishes.name, description: dishes.description, category: dishes.category })
          .from(dishes).where(eq(dishes.store_id, store.id)),
        db.select({ id: surveys.id, title: surveys.title, questions: surveys.questions })
          .from(surveys).where(eq(surveys.store_id, store.id)),
        db.select({ content: store_knowledge.content, category: store_knowledge.category })
          .from(store_knowledge).where(eq(store_knowledge.store_id, store.id)),
      ])

      // Get recent responses for insights
      const surveyIds = surveyList.map(s => s.id)
      let recentFeedback: string[] = []
      if (surveyIds.length > 0) {
        const { inArray } = await import('drizzle-orm')
        const recentResponses = await db
          .select({ answers: responses.answers })
          .from(responses)
          .where(inArray(responses.survey_id, surveyIds))
          .orderBy(desc(responses.submitted_at))
          .limit(30)

        for (const r of recentResponses) {
          for (const [, v] of Object.entries(r.answers as Record<string, unknown> || {})) {
            if (typeof v === 'string' && v.length > 10) {
              recentFeedback.push(v)
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
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

      const result = await model.generateContent([
        {
          text: `你是餐廳經營分析 AI。請根據以下資料，為這家店生成知識摘要。

店家資訊：
${JSON.stringify(storeInfo, null, 2)}

菜單（${dishList.length} 道菜）：
${dishList.map(d => `- ${d.name}（${d.category}）: ${d.description || '無描述'}`).join('\n')}

已有知識：
${existingKnowledge.map(k => `[${k.category}] ${k.content}`).join('\n') || '尚無'}

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
      ])

      const text = result.response.text()
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        return NextResponse.json({ error: '分析失敗' }, { status: 422 })
      }

      const parsed = JSON.parse(jsonMatch[0])
      const insights = parsed.insights || []

      // Upsert knowledge — update existing categories, insert new ones
      for (const insight of insights) {
        const [existing] = await db
          .select({ id: store_knowledge.id })
          .from(store_knowledge)
          .where(
            and(
              eq(store_knowledge.store_id, store.id),
              eq(store_knowledge.category, insight.category),
              eq(store_knowledge.source, 'ai_generated'),
            ),
          )
          .limit(1)

        if (existing) {
          await db
            .update(store_knowledge)
            .set({ content: insight.content, updated_at: new Date() })
            .where(eq(store_knowledge.id, existing.id))
        } else {
          await db.insert(store_knowledge).values({
            store_id: store.id,
            category: insight.category,
            content: insight.content,
            source: 'ai_generated',
          })
        }
      }

      return NextResponse.json({ success: true, learned: insights.length })
    }

    return NextResponse.json({ error: '無效的 action' }, { status: 400 })
  } catch (err) {
    console.error('Knowledge error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// DELETE: Remove a knowledge item
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })

    const store = await getSelectedStore(session.user.id)
    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 })

    const { id } = await request.json()

    await db
      .delete(store_knowledge)
      .where(and(eq(store_knowledge.id, id), eq(store_knowledge.store_id, store.id)))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
