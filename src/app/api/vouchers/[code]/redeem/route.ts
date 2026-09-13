import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSelectedStore } from '@/lib/store-context'
import { redeemVoucher } from '@/lib/ledger/service'
import { logger, newRequestId } from '@/lib/logger'

// 與刮刮卡的 discounts/mark 不同：餐券是點數換來的，必須嚴格一次性。
export async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const request_id = newRequestId()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '未授權', request_id }, { status: 401 })

  const store = await getSelectedStore(session.user.id)
  if (!store) return NextResponse.json({ error: '找不到店家', request_id }, { status: 404 })

  const { code } = await params
  try {
    const r = await redeemVoucher(code, store.id, session.user.id)
    if (r === 'ok') return NextResponse.json({ ok: true, request_id })
    if (r === 'unavailable') return NextResponse.json({ error: '這張餐券已使用或已過期', request_id }, { status: 409 })
    return NextResponse.json({ error: '找不到這張餐券', request_id }, { status: 404 })
  } catch (err) {
    logger.error('voucher.redeem.failed', { request_id, store_id: store.id }, err)
    return NextResponse.json({ error: '伺服器錯誤', request_id }, { status: 500 })
  }
}
