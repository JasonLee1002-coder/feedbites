import { test, expect } from '@playwright/test'
import postgres from 'postgres'
import {
  upsertCustomer, claimResponse, getWallet, getRules,
  exchangeVoucher, redeemVoucher, runExpiry,
} from '../../src/lib/ledger/service'
import { pgClient } from '../../src/lib/db'

// 執行前提：DATABASE_URL 指向本機測試庫（絕不可指正式站），已套用 021。
const DB = process.env.DATABASE_URL
const SURVEY = process.env.TEST_SURVEY_A_ID
const STAFF = process.env.TEST_STAFF_USER_ID
test.skip(!DB || !SURVEY || !STAFF, '需設定 DATABASE_URL、TEST_SURVEY_A_ID、TEST_STAFF_USER_ID')
test.skip(!!DB && DB.includes('mcstation'), '拒絕對正式站執行')

let sql: ReturnType<typeof postgres>
let storeId: string
let customerId: string
const responseIds: string[] = []

async function insertResponse(minutesAgo: number): Promise<string> {
  const [r] = await sql`
    INSERT INTO responses (survey_id, answers, submitted_at)
    VALUES (${SURVEY!}, '{}'::jsonb, NOW() - make_interval(mins => ${minutesAgo}))
    RETURNING id`
  responseIds.push(r.id)
  return r.id
}

test.beforeAll(async () => {
  sql = postgres(DB!, { max: 2 })
  const [s] = await sql`SELECT store_id FROM surveys WHERE id = ${SURVEY!}`
  storeId = s.store_id
  customerId = await upsertCustomer({ provider: 'line', subject: `test-${Date.now()}`, displayName: '測試客人', pictureUrl: null })
})

test.afterAll(async () => {
  if (responseIds.length) await sql`DELETE FROM responses WHERE id IN ${sql(responseIds)}`
  if (customerId) await sql`DELETE FROM customers WHERE id = ${customerId}`
  await sql.end()
  await pgClient.end()
})

test.describe.serial('顧客帳本', () => {
  test('同一個登入方式再登入，拿到同一位客人', async () => {
    const subject = `test-same-${Date.now()}`
    const a = await upsertCustomer({ provider: 'line', subject, displayName: '甲', pictureUrl: null })
    const b = await upsertCustomer({ provider: 'line', subject, displayName: '甲改名', pictureUrl: null })
    try {
      expect(b).toBe(a)
    } finally {
      await sql`DELETE FROM customers WHERE id = ${a}`
    }
  })

  test('窗口內認領：發問卷點數與一張見面禮券', async () => {
    const rules = await getRules(storeId)
    const rid = await insertResponse(1)
    const r = await claimResponse(customerId, rid)
    expect(r?.storeId).toBe(storeId)
    expect(r?.pointsAwarded).toBe(rules.survey_completed)
    expect(r?.firstVoucher?.cost_points).toBe(0)

    const w = await getWallet(customerId, storeId)
    expect(w.balance).toBe(rules.survey_completed)
    expect(w.vouchers).toHaveLength(1)
    expect(w.recent.map(x => x.event_type).sort()).toEqual(['survey_completed', 'voucher_issued'])
  })

  test('同一天再填：不再給點，也不再發見面禮券', async () => {
    const rid = await insertResponse(1)
    const r = await claimResponse(customerId, rid)
    expect(r?.pointsAwarded).toBe(0)
    expect(r?.firstVoucher).toBeNull()
  })

  test('超過 30 分鐘的回答不能認領', async () => {
    const rid = await insertResponse(31)
    expect(await claimResponse(customerId, rid)).toBeNull()
  })

  test('已被認領的回答不能被第二個人認領', async () => {
    const rid = await insertResponse(1)
    await claimResponse(customerId, rid)
    const other = await upsertCustomer({ provider: 'google', subject: `test-other-${Date.now()}`, displayName: null, pictureUrl: null })
    try {
      expect(await claimResponse(other, rid)).toBeNull()
    } finally {
      await sql`DELETE FROM customers WHERE id = ${other}`
    }
  })

  test('點數不足換券回報還差幾點', async () => {
    const rules = await getRules(storeId)
    const w = await getWallet(customerId, storeId)
    const item = rules.catalog.find(c => c.cost_points > w.balance)!
    const r = await exchangeVoucher(customerId, storeId, item.id)
    expect(r).toEqual({ ok: false, reason: 'insufficient', shortBy: item.cost_points - w.balance })
  })

  test('同一張券同時核銷兩次，只有一次成功', async () => {
    const w = await getWallet(customerId, storeId)
    const code = w.vouchers[0].code
    const results = await Promise.all([
      redeemVoucher(code, storeId, STAFF!),
      redeemVoucher(code, storeId, STAFF!),
    ])
    expect(results.sort()).toEqual(['ok', 'unavailable'])
    expect(await redeemVoucher('ZZZZZZZZ', storeId, STAFF!)).toBe('not_found')
  })

  test('到期：過期的剩餘點數被扣掉，重跑不重複扣', async () => {
    const before = (await getWallet(customerId, storeId)).balance
    await sql`
      INSERT INTO point_ledger (customer_id, store_id, event_type, points, ref_type, ref_id, expires_at, created_at)
      VALUES (${customerId}, ${storeId}, 'order_completed', 100, 'test', ${'exp-' + Date.now()},
              NOW() - interval '1 day', NOW() - interval '400 days')`
    // 有效餘額已經不含過期點數
    expect((await getWallet(customerId, storeId)).balance).toBe(before)
    await runExpiry()
    await runExpiry()
    const rows = await sql`SELECT count(*)::int AS n FROM point_ledger WHERE customer_id = ${customerId} AND event_type = 'expired'`
    expect(rows[0].n).toBe(1)
    expect((await getWallet(customerId, storeId)).balance).toBe(before)
  })
})
