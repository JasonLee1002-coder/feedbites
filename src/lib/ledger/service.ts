// 顧客帳本資料庫服務。所有會改餘額的寫入都在交易內，並以 advisory lock 鎖住「客人 × 店」。
import { db } from '@/lib/db'
import { customers, customer_identities, point_ledger, store_point_rules, vouchers, responses, surveys } from '@/lib/db/schema'
import { and, desc, eq, gt, isNull, lte, sql } from 'drizzle-orm'
import { createVoucherCode } from './code'
import {
  addDays, addMonths, effectiveBalance, computeExpiryRows, mergeRules, taipeiDay,
  type LedgerRowLite, type PointRules, type VoucherTemplate,
} from './rules'

export const CLAIM_WINDOW_MS = 30 * 60 * 1000

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type Executor = typeof db | Tx
export type VoucherRow = typeof vouchers.$inferSelect

async function lockWallet(tx: Tx, customerId: string, storeId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${customerId}:${storeId}`}, 0))`)
}

async function loadRows(ex: Executor, customerId: string, storeId: string): Promise<LedgerRowLite[]> {
  const rows = await ex
    .select({
      id: point_ledger.id,
      event_type: point_ledger.event_type,
      points: point_ledger.points,
      ref_id: point_ledger.ref_id,
      expires_at: point_ledger.expires_at,
      created_at: point_ledger.created_at,
    })
    .from(point_ledger)
    .where(and(eq(point_ledger.customer_id, customerId), eq(point_ledger.store_id, storeId)))
  return rows.map(r => ({ ...r, id: String(r.id) }))
}

function voucherValues(t: VoucherTemplate, p: { customerId: string; storeId: string; costPoints: number }) {
  return {
    store_id: p.storeId,
    customer_id: p.customerId,
    code: createVoucherCode(),
    kind: t.kind,
    value: t.value,
    item_label: t.item_label,
    min_spend: t.min_spend,
    cost_points: p.costPoints,
    expires_at: addDays(new Date(), t.valid_days),
  }
}

export async function getRules(storeId: string): Promise<PointRules> {
  const [row] = await db
    .select({ rules: store_point_rules.rules })
    .from(store_point_rules)
    .where(eq(store_point_rules.store_id, storeId))
    .limit(1)
  return mergeRules(row?.rules as Partial<PointRules> | undefined)
}

export async function saveRules(storeId: string, rules: PointRules): Promise<void> {
  await db
    .insert(store_point_rules)
    .values({ store_id: storeId, rules })
    .onConflictDoUpdate({ target: store_point_rules.store_id, set: { rules, updated_at: new Date() } })
}

export type IdentityProvider = 'line' | 'google'

// 同一個 (provider, subject) 永遠對應同一位客人；第一次登入時建客人。
export async function upsertCustomer(p: {
  provider: IdentityProvider
  subject: string
  displayName: string | null
  pictureUrl: string | null
}): Promise<string> {
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`identity:${p.provider}:${p.subject}`}, 0))`)
    const [existing] = await tx
      .select({ customer_id: customer_identities.customer_id })
      .from(customer_identities)
      .where(and(eq(customer_identities.provider, p.provider), eq(customer_identities.subject, p.subject)))
      .limit(1)
    if (existing) {
      await tx
        .update(customers)
        .set({ display_name: p.displayName, picture_url: p.pictureUrl, updated_at: new Date() })
        .where(eq(customers.id, existing.customer_id))
      return existing.customer_id
    }
    const [created] = await tx
      .insert(customers)
      .values({ display_name: p.displayName, picture_url: p.pictureUrl })
      .returning({ id: customers.id })
    await tx.insert(customer_identities).values({ provider: p.provider, subject: p.subject, customer_id: created.id })
    return created.id
  })
}

export async function awardSurveyCompleted(p: {
  customerId: string
  storeId: string
  responseId: string
  submittedAt: Date
}): Promise<{ pointsAwarded: number; firstVoucher: VoucherRow | null }> {
  const rules = await getRules(p.storeId)
  return db.transaction(async tx => {
    await lockWallet(tx, p.customerId, p.storeId)

    const earned = await tx
      .insert(point_ledger)
      .values({
        customer_id: p.customerId,
        store_id: p.storeId,
        event_type: 'survey_completed',
        points: rules.survey_completed,
        ref_type: 'response',
        ref_id: p.responseId,
        award_day: taipeiDay(p.submittedAt),
        expires_at: addMonths(p.submittedAt, rules.earn_valid_months),
      })
      .onConflictDoNothing()
      .returning({ id: point_ledger.id })

    const issued = await tx
      .insert(vouchers)
      .values(voucherValues(rules.first_voucher, { customerId: p.customerId, storeId: p.storeId, costPoints: 0 }))
      .onConflictDoNothing()
      .returning()
    const firstVoucher = issued[0] ?? null

    if (firstVoucher) {
      await tx.insert(point_ledger).values({
        customer_id: p.customerId,
        store_id: p.storeId,
        event_type: 'voucher_issued',
        points: 0,
        ref_type: 'voucher',
        ref_id: firstVoucher.id,
      })
    }

    return { pointsAwarded: earned.length ? rules.survey_completed : 0, firstVoucher }
  })
}

// 認領：只認領「本次」這一筆、仍是匿名、且在 30 分鐘內送出的回答。
export async function claimResponse(customerId: string, responseId: string, now: Date = new Date()) {
  const cutoff = new Date(now.getTime() - CLAIM_WINDOW_MS)
  const claimed = await db
    .update(responses)
    .set({ customer_id: customerId })
    .where(and(eq(responses.id, responseId), isNull(responses.customer_id), gt(responses.submitted_at, cutoff)))
    .returning({ survey_id: responses.survey_id, submitted_at: responses.submitted_at })
  if (!claimed.length) return null

  const [s] = await db
    .select({ store_id: surveys.store_id })
    .from(surveys)
    .where(eq(surveys.id, claimed[0].survey_id))
    .limit(1)
  if (!s) return null

  const award = await awardSurveyCompleted({
    customerId,
    storeId: s.store_id,
    responseId,
    submittedAt: claimed[0].submitted_at ?? now,
  })
  return { storeId: s.store_id, surveyId: claimed[0].survey_id, ...award }
}

export async function getStoreIdForResponse(responseId: string): Promise<string | null> {
  const [row] = await db
    .select({ store_id: surveys.store_id })
    .from(responses)
    .innerJoin(surveys, eq(responses.survey_id, surveys.id))
    .where(eq(responses.id, responseId))
    .limit(1)
  return row?.store_id ?? null
}

export async function getWallet(customerId: string, storeId: string, now: Date = new Date()) {
  const rows = await loadRows(db, customerId, storeId)
  const recent = await db
    .select({
      id: point_ledger.id,
      event_type: point_ledger.event_type,
      points: point_ledger.points,
      created_at: point_ledger.created_at,
    })
    .from(point_ledger)
    .where(and(eq(point_ledger.customer_id, customerId), eq(point_ledger.store_id, storeId)))
    .orderBy(desc(point_ledger.created_at), desc(point_ledger.id))
    .limit(10)
  const myVouchers = await db
    .select()
    .from(vouchers)
    .where(and(eq(vouchers.customer_id, customerId), eq(vouchers.store_id, storeId)))
    .orderBy(desc(vouchers.created_at))
  return { balance: effectiveBalance(rows, now), recent, vouchers: myVouchers }
}

export type ExchangeResult =
  | { ok: true; voucher: VoucherRow }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'insufficient'; shortBy: number }

export async function exchangeVoucher(customerId: string, storeId: string, catalogId: string): Promise<ExchangeResult> {
  const rules = await getRules(storeId)
  const item = rules.catalog.find(c => c.id === catalogId)
  if (!item) return { ok: false, reason: 'not_found' }

  return db.transaction(async tx => {
    await lockWallet(tx, customerId, storeId)
    const balance = effectiveBalance(await loadRows(tx, customerId, storeId), new Date())
    if (balance < item.cost_points) {
      return { ok: false as const, reason: 'insufficient' as const, shortBy: item.cost_points - balance }
    }
    const [voucher] = await tx
      .insert(vouchers)
      .values(voucherValues(item, { customerId, storeId, costPoints: item.cost_points }))
      .returning()
    await tx.insert(point_ledger).values({
      customer_id: customerId,
      store_id: storeId,
      event_type: 'voucher_exchanged',
      points: -item.cost_points,
      ref_type: 'voucher',
      ref_id: voucher.id,
    })
    return { ok: true as const, voucher }
  })
}

// 以單一條件式 UPDATE 的影響列數判斷，不做先查再改，並發下只有一個成功。
export async function redeemVoucher(code: string, storeId: string, staffUserId: string): Promise<'ok' | 'not_found' | 'unavailable'> {
  const normalized = code.trim().toUpperCase()
  const updated = await db
    .update(vouchers)
    .set({ status: 'used', used_at: new Date(), used_by: staffUserId })
    .where(and(
      eq(vouchers.code, normalized),
      eq(vouchers.store_id, storeId),
      eq(vouchers.status, 'active'),
      gt(vouchers.expires_at, new Date()),
    ))
    .returning({ id: vouchers.id })
  if (updated.length) return 'ok'

  const [exists] = await db
    .select({ id: vouchers.id })
    .from(vouchers)
    .where(and(eq(vouchers.code, normalized), eq(vouchers.store_id, storeId)))
    .limit(1)
  return exists ? 'unavailable' : 'not_found'
}

export async function runExpiry(now: Date = new Date()): Promise<number> {
  const pairs = await db
    .selectDistinct({ customer_id: point_ledger.customer_id, store_id: point_ledger.store_id })
    .from(point_ledger)
    .where(and(gt(point_ledger.points, 0), lte(point_ledger.expires_at, now)))

  let inserted = 0
  for (const p of pairs) {
    inserted += await db.transaction(async tx => {
      await lockWallet(tx, p.customer_id, p.store_id)
      const due = computeExpiryRows(await loadRows(tx, p.customer_id, p.store_id), now)
      if (!due.length) return 0
      const res = await tx
        .insert(point_ledger)
        .values(due.map(e => ({
          customer_id: p.customer_id,
          store_id: p.store_id,
          event_type: 'expired',
          points: e.points,
          ref_type: 'ledger',
          ref_id: e.ref_id,
        })))
        .onConflictDoNothing()
        .returning({ id: point_ledger.id })
      return res.length
    })
  }
  return inserted
}
