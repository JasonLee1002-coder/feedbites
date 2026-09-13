// 顧客帳本規則 — 純函式，不碰資料庫，全部可單元測試。
// spec: docs/superpowers/specs/2026-09-13-customer-ledger-design.html §四

export const LEDGER_EVENTS = [
  'survey_completed', 'voucher_issued', 'voucher_exchanged', 'expired',
  'profile_field_added', 'wish_created', 'wish_adopted',
  'order_completed', 'locker_pickup',
] as const
export type LedgerEvent = (typeof LEDGER_EVENTS)[number]

export const EVENT_LABELS: Record<LedgerEvent, string> = {
  survey_completed: '填問卷',
  voucher_issued: '見面禮餐券',
  voucher_exchanged: '兌換餐券',
  expired: '點數到期',
  profile_field_added: '補充資料',
  wish_created: '許願',
  wish_adopted: '願望被採納',
  order_completed: '線上訂餐',
  locker_pickup: '智取櫃取餐',
}

export type VoucherKind = 'amount' | 'item'

export interface VoucherTemplate {
  kind: VoucherKind
  value: number | null
  item_label: string | null
  min_spend: number | null
  valid_days: number
}

export interface CatalogItem extends VoucherTemplate {
  id: string
  cost_points: number
}

export interface PointRules {
  enabled: boolean
  survey_completed: number
  profile_field: number
  wish_created: number
  wish_daily_limit: number
  wish_adopted: number
  earn_valid_months: number
  first_voucher: VoucherTemplate
  catalog: CatalogItem[]
}

// 正式站多家店共用同一套程式，點數功能預設關閉，只有店主在後台打開的店才生效。
// 首張券面額是讓系統能跑的預設值，正式值等阿水給毛利後由店長在後台改。
export const DEFAULT_RULES: PointRules = {
  enabled: false,
  survey_completed: 50,
  profile_field: 20,
  wish_created: 10,
  wish_daily_limit: 3,
  wish_adopted: 200,
  earn_valid_months: 12,
  first_voucher: { kind: 'amount', value: 30, item_label: null, min_spend: 150, valid_days: 30 },
  catalog: [
    { id: 'amt50', kind: 'amount', value: 50, item_label: null, min_spend: null, valid_days: 60, cost_points: 300 },
    { id: 'snack', kind: 'item', value: null, item_label: '指定小點一份', min_spend: null, valid_days: 60, cost_points: 600 },
  ],
}

export interface LedgerRowLite {
  id: string
  event_type: string
  points: number
  ref_id: string | null
  expires_at: Date | null
  created_at: Date
}

export function taipeiDay(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime())
  r.setUTCMonth(r.getUTCMonth() + months)
  return r
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000)
}

export function mergeRules(partial?: Partial<PointRules> | null): PointRules {
  const base: PointRules = JSON.parse(JSON.stringify(DEFAULT_RULES))
  if (!partial) return base
  return {
    ...base,
    ...partial,
    first_voucher: { ...base.first_voucher, ...(partial.first_voucher ?? {}) },
    catalog: partial.catalog ? JSON.parse(JSON.stringify(partial.catalog)) : base.catalog,
  }
}

const isNonNegInt = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0

// 給店長看的中文欄位名，錯誤訊息用這個而不是程式變數名。
const FIELD_LABELS: Record<string, string> = {
  survey_completed: '填問卷得點',
  profile_field: '補充資料得點',
  wish_created: '許願得點',
  wish_daily_limit: '每日許願上限',
  wish_adopted: '願望被採納得點',
  earn_valid_months: '點數有效月數',
}

function validateTemplate(t: VoucherTemplate, where: string): string | null {
  if (t.kind !== 'amount' && t.kind !== 'item') return `${where}的券種必須是折抵金額或指定品項`
  if (t.kind === 'amount' && !(isNonNegInt(t.value) && (t.value as number) >= 1)) return `${where}是金額券，需要面額（至少 1 元）`
  if (t.kind === 'item' && !(typeof t.item_label === 'string' && t.item_label.trim().length > 0)) return `${where}是品項券，需要品項名稱`
  if (t.min_spend !== null && !isNonNegInt(t.min_spend)) return `${where}的低消必須是非負整數`
  if (!(isNonNegInt(t.valid_days) && t.valid_days >= 1)) return `${where}的有效天數至少 1 天`
  return null
}

export function validateRules(r: PointRules): string | null {
  if (typeof r.enabled !== 'boolean') return '開關設定格式錯誤'
  const numeric: (keyof PointRules)[] = [
    'survey_completed', 'profile_field', 'wish_created', 'wish_daily_limit', 'wish_adopted', 'earn_valid_months',
  ]
  for (const k of numeric) {
    if (!isNonNegInt(r[k])) return `${FIELD_LABELS[k]}必須是非負整數`
  }
  if (r.earn_valid_months < 1) return '點數有效月數至少 1 個月'
  const fv = validateTemplate(r.first_voucher, '見面禮券')
  if (fv) return fv
  const ids = new Set<string>()
  for (let i = 0; i < r.catalog.length; i++) {
    const c = r.catalog[i]
    const label = `第 ${i + 1} 個兌換項目`
    if (typeof c.id !== 'string' || c.id.trim() === '') return `${label}缺少 id`
    if (ids.has(c.id)) return `${label}的 id 重複：${c.id}`
    ids.add(c.id)
    if (!(isNonNegInt(c.cost_points) && c.cost_points >= 1)) return `${label}所需點數至少 1`
    const e = validateTemplate(c, label)
    if (e) return e
  }
  return null
}

// 兌換目錄只加不減：麥當勞把小可樂從 300 點調到 360 點，被罵「越集越沒用」。
export function checkCatalogChange(oldCatalog: CatalogItem[], nextCatalog: CatalogItem[]): string | null {
  const next = new Map(nextCatalog.map(c => [c.id, c]))
  for (const o of oldCatalog) {
    const n = next.get(o.id)
    if (!n) return `不能移除已上架的兌換項目：${o.id}`
    if (n.kind !== o.kind) return '已上架的兌換項目不能改券種'
    if (n.cost_points > o.cost_points) return `不能提高已上架項目的所需點數：${o.id}`
  }
  return null
}

export function computeBalance(rows: LedgerRowLite[]): number {
  return rows.reduce((s, r) => s + r.points, 0)
}

function compareRows(a: LedgerRowLite, b: LedgerRowLite): number {
  const t = a.created_at.getTime() - b.created_at.getTime()
  if (t !== 0) return t
  const na = Number(a.id)
  const nb = Number(b.id)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

// 依時間順序模擬先進先出：每筆花費只能扣「花費當下還沒到期」的點數，
// 已過期的點數不能被後來的花費吃掉（否則會透支）。
// 回傳已到期、尚有剩餘、且還沒寫過 expired 列的點數桶。
export function computeExpiryRows(rows: LedgerRowLite[], now: Date): { ref_id: string; points: number }[] {
  type Bucket = { row: LedgerRowLite; remaining: number; dead: boolean; processed: boolean }
  const buckets: Bucket[] = []
  const byId = new Map<string, Bucket>()

  for (const r of [...rows].sort(compareRows)) {
    if (r.event_type === 'expired') {
      const b = r.ref_id ? byId.get(r.ref_id) : undefined
      if (b) {
        b.remaining += r.points
        b.dead = true
        b.processed = true
      }
      continue
    }
    if (r.points > 0) {
      const b: Bucket = { row: r, remaining: r.points, dead: false, processed: false }
      buckets.push(b)
      byId.set(r.id, b)
      continue
    }
    if (r.points < 0) {
      const at = r.created_at.getTime()
      for (const b of buckets) {
        if (!b.dead && b.row.expires_at !== null && b.row.expires_at.getTime() <= at) b.dead = true
      }
      let toConsume = -r.points
      for (const b of buckets) {
        if (toConsume <= 0) break
        if (b.dead || b.remaining <= 0) continue
        const take = Math.min(b.remaining, toConsume)
        b.remaining -= take
        toConsume -= take
      }
    }
  }

  return buckets
    .filter(b => !b.processed && b.remaining > 0 &&
      (b.dead || (b.row.expires_at !== null && b.row.expires_at.getTime() <= now.getTime())))
    .map(b => ({ ref_id: b.row.id, points: -b.remaining }))
}

export function effectiveBalance(rows: LedgerRowLite[], now: Date): number {
  return computeBalance(rows) + computeExpiryRows(rows, now).reduce((s, e) => s + e.points, 0)
}

export function voucherLabel(v: { kind: string; value: number | null; item_label: string | null; min_spend: number | null }): string {
  if (v.kind === 'item') return v.item_label ?? '品項券'
  const base = `NT$${v.value} 折抵券`
  return v.min_spend ? `${base}（滿 NT$${v.min_spend} 可用）` : base
}
