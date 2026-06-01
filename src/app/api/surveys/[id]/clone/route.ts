import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { surveys } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSelectedStore } from '@/lib/store-context'

// POST: Clone a survey
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const store = await getSelectedStore(session.user.id)
    if (!store) {
      return NextResponse.json({ error: '找不到店家' }, { status: 404 })
    }

    // Get the original survey (must belong to this store)
    const [original] = await db
      .select()
      .from(surveys)
      .where(and(eq(surveys.id, id), eq(surveys.store_id, store.id)))
      .limit(1)

    if (!original) {
      return NextResponse.json({ error: '找不到問卷' }, { status: 404 })
    }

    // Create clone
    const [clone] = await db
      .insert(surveys)
      .values({
        store_id: store.id,
        title: `${original.title} (複製)`,
        template_id: original.template_id,
        custom_colors: original.custom_colors,
        questions: original.questions,
        is_active: false,
        discount_type: original.discount_type,
        discount_value: original.discount_value,
        discount_expiry_days: original.discount_expiry_days,
        discount_enabled: original.discount_enabled,
        discount_mode: original.discount_mode,
        discount_tiers: original.discount_tiers,
      })
      .returning()

    return NextResponse.json(clone, { status: 201 })
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
