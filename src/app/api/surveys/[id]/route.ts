import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { surveys } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSelectedStore } from '@/lib/store-context'

// GET: Get single survey (public if active, or owner)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [survey] = await db
      .select()
      .from(surveys)
      .where(eq(surveys.id, id))
      .limit(1)

    if (!survey) {
      return NextResponse.json({ error: '找不到問卷' }, { status: 404 })
    }

    // If survey is active, allow public access
    if (survey.is_active) {
      return NextResponse.json(survey)
    }

    // If not active, only owner can view
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const store = await getSelectedStore(session.user.id)
    if (!store || survey.store_id !== store.id) {
      return NextResponse.json({ error: '未授權' }, { status: 403 })
    }

    return NextResponse.json(survey)
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// PUT: Update survey (owner only)
export async function PUT(
  request: NextRequest,
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

    // Verify ownership
    const [existing] = await db
      .select({ store_id: surveys.store_id })
      .from(surveys)
      .where(eq(surveys.id, id))
      .limit(1)

    if (!existing || existing.store_id !== store.id) {
      return NextResponse.json({ error: '未授權' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title, template_id, custom_colors, questions, is_active,
      discount_type, discount_value, discount_expiry_days,
      discount_enabled, discount_mode, discount_tiers,
      prize_items, prize_same_day_valid,
    } = body

    const updateData: Record<string, unknown> = { updated_at: new Date() }
    if (title !== undefined) updateData.title = title
    if (template_id !== undefined) updateData.template_id = template_id
    if (custom_colors !== undefined) updateData.custom_colors = custom_colors
    if (questions !== undefined) updateData.questions = questions
    if (is_active !== undefined) updateData.is_active = is_active
    if (discount_type !== undefined) updateData.discount_type = discount_type
    if (discount_value !== undefined) updateData.discount_value = discount_value
    if (discount_expiry_days !== undefined) updateData.discount_expiry_days = discount_expiry_days
    if (discount_enabled !== undefined) updateData.discount_enabled = discount_enabled
    if (discount_mode !== undefined) updateData.discount_mode = discount_mode
    if (discount_tiers !== undefined) updateData.discount_tiers = discount_tiers
    if (prize_items !== undefined) updateData.prize_items = prize_items
    if (prize_same_day_valid !== undefined) updateData.prize_same_day_valid = prize_same_day_valid

    const [survey] = await db
      .update(surveys)
      .set(updateData)
      .where(eq(surveys.id, id))
      .returning()

    return NextResponse.json(survey)
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// PATCH: Partial update (e.g. toggle active status)
export async function PATCH(
  request: NextRequest,
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

    // Verify ownership
    const [existing] = await db
      .select({ store_id: surveys.store_id })
      .from(surveys)
      .where(eq(surveys.id, id))
      .limit(1)

    if (!existing || existing.store_id !== store.id) {
      return NextResponse.json({ error: '未授權' }, { status: 403 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = { updated_at: new Date() }
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.title !== undefined) updateData.title = body.title

    const [survey] = await db
      .update(surveys)
      .set(updateData)
      .where(eq(surveys.id, id))
      .returning()

    return NextResponse.json(survey)
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// DELETE: Delete survey (owner only)
export async function DELETE(
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

    // Verify ownership
    const [existing] = await db
      .select({ store_id: surveys.store_id })
      .from(surveys)
      .where(eq(surveys.id, id))
      .limit(1)

    if (!existing || existing.store_id !== store.id) {
      return NextResponse.json({ error: '未授權' }, { status: 403 })
    }

    await db.delete(surveys).where(eq(surveys.id, id))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
