import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { surveys } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getSelectedStore } from '@/lib/store-context'

// GET: List surveys for authenticated store owner
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const store = await getSelectedStore(session.user.id)
    if (!store) {
      return NextResponse.json({ error: '找不到店家' }, { status: 404 })
    }

    const surveyList = await db
      .select()
      .from(surveys)
      .where(eq(surveys.store_id, store.id))
      .orderBy(desc(surveys.created_at))

    return NextResponse.json(surveyList)
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// POST: Create new survey
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const store = await getSelectedStore(session.user.id)
    if (!store) {
      return NextResponse.json({ error: '找不到店家' }, { status: 404 })
    }

    const body = await request.json()
    const {
      title,
      template_id,
      custom_colors,
      questions,
      discount_type = 'percentage',
      discount_value = '10',
      discount_expiry_days = 30,
      discount_enabled = true,
      discount_mode = 'basic',
      discount_tiers = null,
    } = body

    if (!title || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const [survey] = await db
      .insert(surveys)
      .values({
        store_id: store.id,
        title,
        template_id: template_id || 'fine-dining',
        custom_colors: custom_colors || null,
        questions,
        is_active: true,
        discount_type,
        discount_value,
        discount_expiry_days,
        discount_enabled,
        discount_mode,
        discount_tiers,
      })
      .returning()

    return NextResponse.json(survey, { status: 201 })
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
