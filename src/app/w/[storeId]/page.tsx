import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { stores } from '@/lib/db/schema'
import { CUSTOMER_COOKIE, isUuid, readCustomerId } from '@/lib/customer-session'
import { getRules, getWallet } from '@/lib/ledger/service'
import { EVENT_LABELS, voucherLabel, type LedgerEvent } from '@/lib/ledger/rules'
import { CUSTOMER_BRAND } from '@/lib/brand'
import WalletClient from './WalletClient'

export const dynamic = 'force-dynamic'

export default async function WalletPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>
  searchParams: Promise<{ claimed?: string; login?: string; claim?: string }>
}) {
  const { storeId } = await params
  const sp = await searchParams
  if (!isUuid(storeId)) notFound()

  const [store] = await db
    .select({ store_name: stores.store_name, logo_url: stores.logo_url })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1)
  if (!store) notFound()

  const jar = await cookies()
  const customerId = readCustomerId(jar.get(CUSTOMER_COOKIE)?.value)
  const rules = await getRules(storeId)
  const now = new Date().getTime()
  // claim 是簽章 token，由登入路由驗證；這裡只做長度防呆後原樣轉交
  const retryClaim = typeof sp.claim === 'string' && sp.claim.length > 0 && sp.claim.length < 512 ? sp.claim : null
  const loginQuery = `store=${storeId}${retryClaim ? `&claim=${encodeURIComponent(retryClaim)}` : ''}`
  const loginHref = `/feedbites/api/customer/line/start?${loginQuery}`
  const googleHref = `/feedbites/api/customer/google/start?${loginQuery}`

  if (!customerId) {
    return (
      <WalletClient
        brand={CUSTOMER_BRAND}
        storeId={storeId}
        storeName={store.store_name}
        logoUrl={store.logo_url}
        loginHref={loginHref}
        googleHref={googleHref}
        notice={sp.login === 'failed' || sp.login === 'cancelled' ? '登入沒有完成，可以再試一次' : null}
        wallet={null}
        catalog={rules.catalog.map(c => ({ id: c.id, label: voucherLabel(c), cost_points: c.cost_points }))}
      />
    )
  }

  const w = await getWallet(customerId, storeId)
  const claimedNotice =
    sp.claimed === 'none' ? '這份問卷已經領過或超過 30 分鐘，下次填問卷記得登入'
    : sp.claimed && Number(sp.claimed) > 0 ? `+${sp.claimed} 點已入帳`
    : sp.claimed === '0' ? '今天已經領過點數囉'
    : null

  return (
    <WalletClient
      brand={CUSTOMER_BRAND}
      storeId={storeId}
      storeName={store.store_name}
      logoUrl={store.logo_url}
      loginHref={loginHref}
      googleHref={googleHref}
      notice={claimedNotice}
      catalog={rules.catalog.map(c => ({ id: c.id, label: voucherLabel(c), cost_points: c.cost_points }))}
      wallet={{
        balance: w.balance,
        recent: w.recent.map(r => ({
          id: String(r.id),
          label: EVENT_LABELS[r.event_type as LedgerEvent] ?? r.event_type,
          points: r.points,
          at: r.created_at.toISOString(),
        })),
        vouchers: w.vouchers.map(v => ({
          code: v.code,
          label: voucherLabel(v),
          status: v.status === 'used' ? 'used' : v.expires_at.getTime() <= now ? 'expired' : 'active',
          expires_at: v.expires_at.toISOString(),
        })),
      }}
    />
  )
}
