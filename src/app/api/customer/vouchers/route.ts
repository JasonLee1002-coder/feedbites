import { NextRequest, NextResponse } from 'next/server'
import { CUSTOMER_COOKIE, isUuid, readCustomerId } from '@/lib/customer-session'
import { exchangeVoucher } from '@/lib/ledger/service'
import { voucherLabel } from '@/lib/ledger/rules'
import { logger, newRequestId } from '@/lib/logger'

// POST { store_id, catalog_id } — customer_id 只取自 session，不接受 body 帶入
export async function POST(req: NextRequest) {
  const request_id = newRequestId()
  const customerId = readCustomerId(req.cookies.get(CUSTOMER_COOKIE)?.value)
  if (!customerId) return NextResponse.json({ error: '請先用 LINE 或 Google 登入', request_id }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { store_id, catalog_id } = body as { store_id?: string; catalog_id?: string }
  if (!isUuid(store_id) || typeof catalog_id !== 'string') {
    return NextResponse.json({ error: '參數錯誤', request_id }, { status: 400 })
  }

  try {
    const r = await exchangeVoucher(customerId, store_id, catalog_id)
    if (r.ok) {
      return NextResponse.json({
        voucher: { code: r.voucher.code, label: voucherLabel(r.voucher), expires_at: r.voucher.expires_at },
      }, { status: 201 })
    }
    if (r.reason === 'insufficient') {
      return NextResponse.json({ error: `還差 ${r.shortBy} 點`, short_by: r.shortBy, request_id }, { status: 402 })
    }
    return NextResponse.json({ error: '找不到兌換項目', request_id }, { status: 404 })
  } catch (err) {
    logger.error('voucher.exchange.failed', { request_id }, err)
    return NextResponse.json({ error: '伺服器錯誤', request_id }, { status: 500 })
  }
}
