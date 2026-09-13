import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { and, count, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { vouchers } from '@/lib/db/schema'
import { getSelectedStore } from '@/lib/store-context'
import { getRules } from '@/lib/ledger/service'
import VouchersClient from './VouchersClient'

export const dynamic = 'force-dynamic'

export default async function VouchersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const store = await getSelectedStore(session.user.id)
  if (!store) redirect('/dashboard/new-store')

  const [issued] = await db.select({ n: count() }).from(vouchers).where(eq(vouchers.store_id, store.id))
  const [used] = await db.select({ n: count() }).from(vouchers).where(and(eq(vouchers.store_id, store.id), eq(vouchers.status, 'used')))

  return (
    <VouchersClient
      initialRules={await getRules(store.id)}
      canEdit={store.user_id === session.user.id}
      issued={issued?.n ?? 0}
      used={used?.n ?? 0}
    />
  )
}
