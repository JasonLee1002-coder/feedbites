import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stores, surveys, responses, discount_codes, dishes, feedback_reports } from '@/lib/db/schema'
import { and, eq, inArray } from 'drizzle-orm'

// POST: Reset (clear) specific data categories for a store
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })

    const { storeId } = await params

    // Verify ownership
    const [store] = await db
      .select({ id: stores.id, user_id: stores.user_id })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1)

    if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 })
    if (store.user_id !== session.user.id) {
      return NextResponse.json({ error: '只有店長可以清空資料' }, { status: 403 })
    }

    const body = await request.json()
    const targets: string[] = body.targets || []
    const results: Record<string, number> = {}

    // Clear surveys (cascades to responses + discount_codes via FK)
    if (targets.includes('surveys')) {
      const deleted = await db
        .delete(surveys)
        .where(eq(surveys.store_id, storeId))
        .returning({ id: surveys.id })
      results.surveys = deleted.length
    }

    // Clear responses only (keep surveys)
    if (targets.includes('responses')) {
      const surveyList = await db
        .select({ id: surveys.id })
        .from(surveys)
        .where(eq(surveys.store_id, storeId))

      if (surveyList.length > 0) {
        const surveyIds = surveyList.map(s => s.id)

        // Delete discount codes first (FK dependency)
        await db
          .delete(discount_codes)
          .where(inArray(discount_codes.survey_id, surveyIds))

        // Delete responses
        const deleted = await db
          .delete(responses)
          .where(inArray(responses.survey_id, surveyIds))
          .returning({ id: responses.id })
        results.responses = deleted.length
      }
    }

    // Clear dishes
    if (targets.includes('dishes')) {
      const deleted = await db
        .delete(dishes)
        .where(eq(dishes.store_id, storeId))
        .returning({ id: dishes.id })
      results.dishes = deleted.length
    }

    // Clear feedback reports
    if (targets.includes('feedback')) {
      const deleted = await db
        .delete(feedback_reports)
        .where(eq(feedback_reports.store_id, storeId))
        .returning({ id: feedback_reports.id })
      results.feedback = deleted.length
    }

    return NextResponse.json({ ok: true, cleared: results })
  } catch (err) {
    console.error('Store reset error:', err)
    return NextResponse.json({ error: '清空失敗，請重試' }, { status: 500 })
  }
}
