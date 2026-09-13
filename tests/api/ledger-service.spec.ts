import { test, expect } from '@playwright/test'
import postgres from 'postgres'
import {
  upsertCustomer, claimResponse, getWallet, getRules, saveRules, awardSurveyCompleted,
  exchangeVoucher, redeemVoucher, runExpiry, setVoucherCodeGeneratorForTest, VOUCHER_CODE_ATTEMPTS,
} from '../../src/lib/ledger/service'
import { mergeRules } from '../../src/lib/ledger/rules'
import { pgClient } from '../../src/lib/db'

// 執行前提：DATABASE_URL 指向本機測試庫（絕不可指正式站），已套用 021。
const DB = process.env.DATABASE_URL
const SURVEY = process.env.TEST_SURVEY_A_ID
const STAFF = process.env.TEST_STAFF_USER_ID
test.skip(!DB || !SURVEY || !STAFF, '需設定 DATABASE_URL、TEST_SURVEY_A_ID、TEST_STAFF_USER_ID')
test.skip(!!DB && !DB.includes('localhost') && !DB.includes('127.0.0.1'), '只允許對本機測試庫執行')

let sql: ReturnType<typeof postgres>
let storeId: string
let customerId: string
const responseIds: string[] = []
const extraCustomers: string[] = []

async function freshCustomer(tag: string): Promise<string> {
  const id = await upsertCustomer({
    provider: 'google', subject: `test-${tag}-${Date.now()}-${Math.random()}`, displayName: null, pictureUrl: null,
  })
  extraCustomers.push(id)
  return id
}

async function grantPoints(cid: string, points: number) {
  await sql`
    INSERT INTO point_ledger (customer_id, store_id, event_type, points, ref_type, ref_id, expires_at)
    VALUES (${cid}, ${storeId}, 'order_completed', ${points}, 'test', ${'grant-' + Date.now() + '-' + Math.random()},
            NOW() + interval '1 year')`
}

async function ledgerCount(cid: string, eventType: string): Promise<number> {
  const [r] = await sql`SELECT count(*)::int AS n FROM point_ledger WHERE customer_id = ${cid} AND event_type = ${eventType}`
  return r.n
}

async function voucherCount(cid: string): Promise<number> {
  const [r] = await sql`SELECT count(*)::int AS n FROM vouchers WHERE customer_id = ${cid}`
  return r.n
}

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
  // 正式站點數功能預設關閉，測試店要先手動打開才能跑後面所有帳本測試。
  await saveRules(storeId, mergeRules({ enabled: true }))
  customerId = await upsertCustomer({ provider: 'line', subject: `test-${Date.now()}`, displayName: '測試客人', pictureUrl: null })
})

test.afterAll(async () => {
  if (responseIds.length) await sql`DELETE FROM responses WHERE id IN ${sql(responseIds)}`
  if (customerId) await sql`DELETE FROM customers WHERE id = ${customerId}`
  if (extraCustomers.length) await sql`DELETE FROM customers WHERE id IN ${sql(extraCustomers)}`
  await sql`DELETE FROM store_point_rules WHERE store_id = ${storeId}`
  setVoucherCodeGeneratorForTest()
  await sql.end()
  await pgClient.end()
})

test.describe.serial('顧客帳本', () => {
  test('同一個登入方式再登入，拿到同一位客人', async () => {
    const subject = `test-same-${Date.now()}`
    const a = await upsertCustomer({ provider: 'line', subject, displayName: '甲', pictureUrl: null })
    const b = await upsertCustomer({ provider: 'line', subject, displayName: '甲改名', pictureUrl: 'https://example.com/a.png' })
    const c = await upsertCustomer({ provider: 'line', subject, displayName: null, pictureUrl: null })
    try {
      expect(b).toBe(a)
      expect(c).toBe(a)
      const [row] = await sql`SELECT display_name, picture_url FROM customers WHERE id = ${a}`
      // 登入方沒給名字或頭像時保留舊值
      expect(row.display_name).toBe('甲改名')
      expect(row.picture_url).toBe('https://example.com/a.png')
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

  test('同一人對同一筆回答認領兩次：第二次不報錯、點數不重複', async () => {
    const cid = await freshCustomer('retry')
    const rules = await getRules(storeId)
    const rid = await insertResponse(1)
    const first = await claimResponse(cid, rid)
    expect(first?.pointsAwarded).toBe(rules.survey_completed)
    const second = await claimResponse(cid, rid)
    expect(second).not.toBeNull()
    expect(second?.pointsAwarded).toBe(0)
    expect(second?.firstVoucher).toBeNull()
    expect(await ledgerCount(cid, 'survey_completed')).toBe(1)
    expect(await voucherCount(cid)).toBe(1)
    expect((await getWallet(cid, storeId)).balance).toBe(rules.survey_completed)
  })

  test('該店關閉點數功能時，claimResponse 回 null，不發點也不綁客人', async () => {
    const rulesBefore = await getRules(storeId)
    await saveRules(storeId, { ...rulesBefore, enabled: false })
    try {
      const cid = await freshCustomer('disabled')
      const rid = await insertResponse(1)
      const r = await claimResponse(cid, rid)
      expect(r).toBeNull()
      expect(await ledgerCount(cid, 'survey_completed')).toBe(0)
      expect(await voucherCount(cid)).toBe(0)
      const [row] = await sql`SELECT customer_id FROM responses WHERE id = ${rid}`
      expect(row.customer_id).toBeNull()
    } finally {
      await saveRules(storeId, { ...rulesBefore, enabled: true })
    }
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
    expect(results.sort()).toEqual(['ok', 'used'])
    expect(await redeemVoucher(code, storeId, STAFF!)).toBe('used')
    expect(await redeemVoucher('ZZZZZZZZ', storeId, STAFF!)).toBe('not_found')
  })

  test('過期的券核銷回 expired', async () => {
    const code = 'EXP' + Math.random().toString(36).slice(2, 7).toUpperCase()
    await sql`
      INSERT INTO vouchers (store_id, customer_id, code, kind, value, cost_points, expires_at)
      VALUES (${storeId}, ${customerId}, ${code}, 'amount', 30, 999, NOW() - interval '1 minute')`
    expect(await redeemVoucher(code, storeId, STAFF!)).toBe('expired')
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

  test('見面禮券代碼撞號時換一組重試', async () => {
    const [{ code: taken }] = await sql`SELECT code FROM vouchers LIMIT 1`
    const cid = await freshCustomer('welcome-collide')
    const rid = await insertResponse(1)
    let calls = 0
    setVoucherCodeGeneratorForTest(() => (++calls === 1 ? taken : 'W' + Math.random().toString(36).slice(2, 9).toUpperCase()))
    try {
      const r = await awardSurveyCompleted({ customerId: cid, storeId, responseId: rid, submittedAt: new Date() })
      expect(calls).toBe(2)
      expect(r.firstVoucher).not.toBeNull()
      expect(r.firstVoucher!.code).not.toBe(taken)
      expect(await ledgerCount(cid, 'voucher_issued')).toBe(1)
    } finally {
      setVoucherCodeGeneratorForTest()
    }
  })

  test('換券代碼撞號時重試；連撞 5 次才失敗且不扣點', async () => {
    const rules = await getRules(storeId)
    const item = rules.catalog[0]
    const [{ code: taken }] = await sql`SELECT code FROM vouchers LIMIT 1`
    const cid = await freshCustomer('exchange-collide')
    await grantPoints(cid, item.cost_points * 2)

    let calls = 0
    setVoucherCodeGeneratorForTest(() => { calls++; return taken })
    try {
      await expect(exchangeVoucher(cid, storeId, item.id)).rejects.toThrow()
      expect(calls).toBe(VOUCHER_CODE_ATTEMPTS)
      expect(await voucherCount(cid)).toBe(0)
      expect((await getWallet(cid, storeId)).balance).toBe(item.cost_points * 2)

      calls = 0
      setVoucherCodeGeneratorForTest(() => (++calls < 3 ? taken : 'X' + Math.random().toString(36).slice(2, 9).toUpperCase()))
      const r = await exchangeVoucher(cid, storeId, item.id)
      expect(r.ok).toBe(true)
      expect(calls).toBe(3)
      expect((await getWallet(cid, storeId)).balance).toBe(item.cost_points)
    } finally {
      setVoucherCodeGeneratorForTest()
    }
  })

  test('並發：兩個換券同時換同一檔，只能成功一次', async () => {
    const rules = await getRules(storeId)
    const item = rules.catalog[0]
    const cid = await freshCustomer('concurrent-exchange')
    const granted = Math.floor(item.cost_points * 1.5)
    await grantPoints(cid, granted)
    const results = await Promise.all([
      exchangeVoucher(cid, storeId, item.id),
      exchangeVoucher(cid, storeId, item.id),
    ])
    expect(results.filter(r => r.ok)).toHaveLength(1)
    expect(results.filter(r => !r.ok && r.reason === 'insufficient')).toHaveLength(1)
    expect(await voucherCount(cid)).toBe(1)
    expect((await getWallet(cid, storeId)).balance).toBe(granted - item.cost_points)
  })

  test('並發：兩個登入同時用同一 subject，只建一位客人', async () => {
    const subject = `test-concurrent-${Date.now()}`
    const [a, b] = await Promise.all([
      upsertCustomer({ provider: 'line', subject, displayName: '並發', pictureUrl: null }),
      upsertCustomer({ provider: 'line', subject, displayName: '並發', pictureUrl: null }),
    ])
    extraCustomers.push(a, b)
    expect(a).toBe(b)
    const [r] = await sql`SELECT count(*)::int AS n FROM customer_identities WHERE provider = 'line' AND subject = ${subject}`
    expect(r.n).toBe(1)
  })

  test('並發：同一筆回答同時發點兩次，只給一次點與一張見面禮券', async () => {
    const rules = await getRules(storeId)
    const cid = await freshCustomer('concurrent-award')
    const rid = await insertResponse(1)
    const args = { customerId: cid, storeId, responseId: rid, submittedAt: new Date() }
    const results = await Promise.all([awardSurveyCompleted(args), awardSurveyCompleted(args)])
    expect(results.reduce((n, r) => n + r.pointsAwarded, 0)).toBe(rules.survey_completed)
    expect(results.filter(r => r.firstVoucher)).toHaveLength(1)
    expect(await ledgerCount(cid, 'survey_completed')).toBe(1)
    expect(await voucherCount(cid)).toBe(1)
  })
})
