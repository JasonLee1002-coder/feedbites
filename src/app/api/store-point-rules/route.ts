import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSelectedStore } from '@/lib/store-context'
import { getRules, saveRules } from '@/lib/ledger/service'
import { checkCatalogChange, mergeRules, validateRules, type PointRules } from '@/lib/ledger/rules'
import { logger, newRequestId } from '@/lib/logger'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '未授權' }, { status: 401 })
  const store = await getSelectedStore(session.user.id)
  if (!store) return NextResponse.json({ error: '找不到店家' }, { status: 404 })
  return NextResponse.json({ rules: await getRules(store.id), can_edit: store.user_id === session.user.id })
}

// 只有店主能改；成員（店員、外包拍照人員）唯讀。
export async function PUT(req: NextRequest) {
  const request_id = newRequestId()
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '未授權', request_id }, { status: 401 })
  const store = await getSelectedStore(session.user.id)
  if (!store) return NextResponse.json({ error: '找不到店家', request_id }, { status: 404 })
  if (store.user_id !== session.user.id) return NextResponse.json({ error: '只有店主可以修改', request_id }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const next = mergeRules((body as { rules?: Partial<PointRules> }).rules)
  const invalid = validateRules(next)
  if (invalid) return NextResponse.json({ error: invalid, request_id }, { status: 400 })

  const current = await getRules(store.id)
  const catalogErr = checkCatalogChange(current.catalog, next.catalog)
  if (catalogErr) return NextResponse.json({ error: catalogErr, request_id }, { status: 400 })

  try {
    await saveRules(store.id, next)
    logger.info('point_rules.saved', { request_id, store_id: store.id }, 'ok')
    return NextResponse.json({ rules: next, request_id })
  } catch (err) {
    logger.error('point_rules.save.failed', { request_id, store_id: store.id }, err)
    return NextResponse.json({ error: '伺服器錯誤', request_id }, { status: 500 })
  }
}
