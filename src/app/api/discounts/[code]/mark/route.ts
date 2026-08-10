// 店員手動標記優惠券已核銷。
//
// 這「不是」嚴格核銷機制：不防重複使用、不防偽造、不驗證顧客身分。
// 依 Jason 2026-08-10 決策，優惠碼被複製視為行銷成本（讓客人有佔便宜心態、主動宣傳）。
// 本 API 的唯一目的是讓店長能自己記帳 —— 在此之前 discount_codes.is_used
// 從建表以來沒有任何一行程式寫入過 true，儀表板的「已核銷」永遠顯示 0，
// 一個明顯錯誤的數字會讓店長不信任整個系統。
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { discount_codes, surveys } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getSelectedStore } from '@/lib/store-context'
import { logger, newRequestId } from '@/lib/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const request_id = newRequestId()
  try {
    const { code } = await params

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授權', request_id }, { status: 401 })
    }

    const store = await getSelectedStore(session.user.id)
    if (!store) {
      return NextResponse.json({ error: '找不到店家', request_id }, { status: 404 })
    }

    const body = await request.json()
    const { used } = body
    if (typeof used !== 'boolean') {
      return NextResponse.json({ error: 'used 必須是 boolean', request_id }, { status: 400 })
    }

    // 該優惠碼必須屬於目前選定店家的問卷，避免跨店核銷
    const [row] = await db
      .select({ id: discount_codes.id, is_used: discount_codes.is_used })
      .from(discount_codes)
      .innerJoin(surveys, eq(discount_codes.survey_id, surveys.id))
      .where(and(
        eq(discount_codes.code, code.toUpperCase().trim()),
        eq(surveys.store_id, store.id),
      ))
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: '找不到優惠碼', request_id }, { status: 404 })
    }

    await db
      .update(discount_codes)
      .set({ is_used: used, used_at: used ? new Date() : null })
      .where(eq(discount_codes.id, row.id))

    logger.info('discount.mark', { request_id, store_id: store.id }, `marked used=${used}`)
    return NextResponse.json({ ok: true, used, was_already_used: row.is_used, request_id })
  } catch (err) {
    logger.error('discount.mark.failed', { request_id }, err)
    return NextResponse.json({ error: '伺服器錯誤', request_id }, { status: 500 })
  }
}
