import { test, expect } from '@playwright/test'
import {
  DEFAULT_RULES, mergeRules, validateRules, checkCatalogChange,
  taipeiDay, addMonths, computeBalance, computeExpiryRows, effectiveBalance,
  voucherLabel, type LedgerRowLite,
} from '../../src/lib/ledger/rules'

const d = (iso: string) => new Date(iso)
const row = (p: Partial<LedgerRowLite> & { id: string; points: number }): LedgerRowLite => ({
  event_type: p.points > 0 ? 'survey_completed' : 'voucher_exchanged',
  ref_id: null, expires_at: null, created_at: d('2026-01-01T00:00:00Z'), ...p,
})

test('taipeiDay 以台北時區切日', () => {
  expect(taipeiDay(d('2026-09-13T15:59:59Z'))).toBe('2026-09-13')
  expect(taipeiDay(d('2026-09-13T16:00:00Z'))).toBe('2026-09-14')
})

test('addMonths 加月份', () => {
  expect(addMonths(d('2026-01-15T00:00:00Z'), 12).toISOString()).toBe('2027-01-15T00:00:00.000Z')
})

test('mergeRules 空值回傳預設且不共用參照', () => {
  const r = mergeRules(null)
  expect(r).toEqual(DEFAULT_RULES)
  r.catalog[0].cost_points = 1
  expect(DEFAULT_RULES.catalog[0].cost_points).not.toBe(1)
})

test('mergeRules 只覆蓋有給的欄位', () => {
  const r = mergeRules({ survey_completed: 80, first_voucher: { value: 50 } as never })
  expect(r.survey_completed).toBe(80)
  expect(r.first_voucher.value).toBe(50)
  expect(r.first_voucher.valid_days).toBe(DEFAULT_RULES.first_voucher.valid_days)
})

test('點數開關預設關閉，mergeRules 後保留店主打開的設定', () => {
  expect(DEFAULT_RULES.enabled).toBe(false)
  expect(mergeRules(null).enabled).toBe(false)
  expect(mergeRules({ enabled: true }).enabled).toBe(true)
})

test('validateRules 預設值合法', () => {
  expect(validateRules(DEFAULT_RULES)).toBeNull()
})

test('validateRules 擋負數、重複 id、金額券缺面額', () => {
  expect(validateRules({ ...DEFAULT_RULES, enabled: 'yes' as never })).toMatch(/開關設定格式錯誤/)
  expect(validateRules({ ...DEFAULT_RULES, survey_completed: -1 })).toMatch(/填問卷得點/)
  const dup = mergeRules(null); dup.catalog.push({ ...dup.catalog[0] })
  expect(validateRules(dup)).toMatch(/重複/)
  const bad = mergeRules(null); bad.catalog[0] = { ...bad.catalog[0], kind: 'amount', value: null }
  expect(validateRules(bad)).toMatch(/面額/)
})

test('checkCatalogChange 允許新增、禁止移除與漲價', () => {
  const old = DEFAULT_RULES.catalog
  expect(checkCatalogChange(old, [...old, { ...old[0], id: 'new', cost_points: 999 }])).toBeNull()
  expect(checkCatalogChange(old, old.slice(1))).toMatch(/移除/)
  expect(checkCatalogChange(old, old.map((c, i) => i === 0 ? { ...c, cost_points: c.cost_points + 1 } : c))).toMatch(/提高/)
  expect(checkCatalogChange(old, old.map((c, i) => i === 0 ? { ...c, cost_points: c.cost_points - 1 } : c))).toBeNull()
})

test('checkCatalogChange 禁止已上架項目改券種', () => {
  const old = DEFAULT_RULES.catalog
  const changedKind = old.map((c, i) =>
    i === 0 ? { ...c, kind: c.kind === 'amount' ? 'item' : 'amount' } as typeof c : c
  )
  expect(checkCatalogChange(old, changedKind)).toMatch(/改券種/)
})

test('computeBalance 加總', () => {
  expect(computeBalance([row({ id: '1', points: 50 }), row({ id: '2', points: -30 })])).toBe(20)
})

test('computeExpiryRows 先進先出扣掉花費後，只讓過期的剩餘點數到期', () => {
  const now = d('2027-06-01T00:00:00Z')
  const rows = [
    row({ id: 'A', points: 100, created_at: d('2026-01-01T00:00:00Z'), expires_at: d('2027-01-01T00:00:00Z') }),
    row({ id: 'B', points: 50, created_at: d('2026-08-01T00:00:00Z'), expires_at: d('2027-08-01T00:00:00Z') }),
    row({ id: 'S', points: -60, created_at: d('2026-09-01T00:00:00Z') }),
  ]
  expect(computeExpiryRows(rows, now)).toEqual([{ ref_id: 'A', points: -40 }])
})

test('computeExpiryRows 已處理過的到期不重複產生，也不讓後面的點數被多扣', () => {
  const now = d('2028-01-01T00:00:00Z')
  const rows = [
    row({ id: 'A', points: 100, created_at: d('2026-01-01T00:00:00Z'), expires_at: d('2027-01-01T00:00:00Z') }),
    row({ id: 'S', points: -60, created_at: d('2026-06-01T00:00:00Z') }),
    row({ id: 'X', points: -40, event_type: 'expired', ref_id: 'A', created_at: d('2027-01-02T00:00:00Z') }),
    row({ id: 'B', points: 50, created_at: d('2027-02-01T00:00:00Z'), expires_at: d('2027-12-01T00:00:00Z') }),
  ]
  expect(computeExpiryRows(rows, now)).toEqual([{ ref_id: 'B', points: -50 }])
})

test('effectiveBalance 把尚未入帳的到期也扣掉', () => {
  const now = d('2027-06-01T00:00:00Z')
  const rows = [row({ id: 'A', points: 100, expires_at: d('2027-01-01T00:00:00Z') })]
  expect(computeBalance(rows)).toBe(100)
  expect(effectiveBalance(rows, now)).toBe(0)
})

test('computeExpiryRows 過期點數不能被之後的花費吃掉（100 已過期、50 有效、連換三次 30）', () => {
  const now = d('2027-06-01T00:00:00Z')
  const base = [
    row({ id: '1', points: 100, created_at: d('2026-01-01T00:00:00Z'), expires_at: d('2027-01-01T00:00:00Z') }),
    row({ id: '2', points: 50, created_at: d('2026-12-01T00:00:00Z'), expires_at: d('2027-12-01T00:00:00Z') }),
  ]
  expect(effectiveBalance(base, now)).toBe(50)
  const spend1 = row({ id: '3', points: -30, created_at: d('2027-02-01T00:00:00Z') })
  const afterFirst = [...base, spend1]
  // 第二次換 30 點之前，有效餘額已不足 30
  expect(effectiveBalance(afterFirst, now)).toBe(20)
  const spend2 = row({ id: '4', points: -30, created_at: d('2027-03-01T00:00:00Z') })
  const spend3 = row({ id: '5', points: -30, created_at: d('2027-04-01T00:00:00Z') })
  const all = [...afterFirst, spend2, spend3]
  expect(computeExpiryRows(all, now)).toEqual([{ ref_id: '1', points: -100 }])
  expect(effectiveBalance(all, now)).toBeLessThan(0)
})

test('computeExpiryRows 部分花費後到期：到期前花掉的算舊點，到期後的花費只扣新點', () => {
  const now = d('2027-06-01T00:00:00Z')
  const rows = [
    row({ id: '1', points: 100, created_at: d('2026-01-01T00:00:00Z'), expires_at: d('2027-01-01T00:00:00Z') }),
    row({ id: '2', points: -30, created_at: d('2026-06-01T00:00:00Z') }),
    row({ id: '3', points: 50, created_at: d('2026-12-01T00:00:00Z'), expires_at: d('2027-12-01T00:00:00Z') }),
    row({ id: '4', points: -20, created_at: d('2027-02-01T00:00:00Z') }),
  ]
  expect(computeExpiryRows(rows, now)).toEqual([{ ref_id: '1', points: -70 }])
  expect(effectiveBalance(rows, now)).toBe(30)
})

test('computeExpiryRows 同時間戳依 id 排序，且與輸入順序無關', () => {
  const T = d('2027-01-01T00:00:00Z')
  const now = d('2027-06-01T00:00:00Z')
  const earnOld = row({ id: '1', points: 100, created_at: d('2026-01-01T00:00:00Z'), expires_at: T })
  // 同一時刻：id 2 賺點、id 3 花費、id 4 賺點；舊點在 T 到期，花費當下不能用
  const earnBefore = row({ id: '2', points: 50, created_at: T, expires_at: d('2027-03-01T00:00:00Z') })
  const spend = row({ id: '3', points: -30, created_at: T })
  const earnAfter = row({ id: '4', points: 40, created_at: T, expires_at: d('2027-03-01T00:00:00Z') })
  const expected = [
    { ref_id: '1', points: -100 },
    { ref_id: '2', points: -20 },
    { ref_id: '4', points: -40 },
  ]
  expect(computeExpiryRows([earnOld, earnBefore, spend, earnAfter], now)).toEqual(expected)
  expect(computeExpiryRows([earnAfter, spend, earnBefore, earnOld], now)).toEqual(expected)
  // id 順序反過來（花費排在兩筆賺點之前）時，花費沒有可扣的點
  const spendFirst = row({ id: '2', points: -30, created_at: T })
  const e3 = row({ id: '3', points: 50, created_at: T, expires_at: d('2027-03-01T00:00:00Z') })
  expect(computeExpiryRows([earnOld, e3, spendFirst], now)).toEqual([
    { ref_id: '1', points: -100 },
    { ref_id: '3', points: -50 },
  ])
})

test('voucherLabel', () => {
  expect(voucherLabel({ kind: 'amount', value: 30, item_label: null, min_spend: 150 })).toBe('NT$30 折抵券（滿 NT$150 可用）')
  expect(voucherLabel({ kind: 'amount', value: 50, item_label: null, min_spend: null })).toBe('NT$50 折抵券')
  expect(voucherLabel({ kind: 'item', value: null, item_label: '指定小點一份', min_spend: null })).toBe('指定小點一份')
})
