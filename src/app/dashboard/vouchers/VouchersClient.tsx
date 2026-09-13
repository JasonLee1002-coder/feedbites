'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CatalogItem, PointRules } from '@/lib/ledger/rules'
import { BASE_PATH } from '@/lib/brand'

const input = 'w-full rounded-lg border border-[#E8E2D8] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#C5A55A]'
const fieldLabel = 'block text-xs font-medium text-[#8A8585] mb-1'

export default function VouchersClient({ initialRules, canEdit, issued, used }: {
  initialRules: PointRules
  canEdit: boolean
  issued: number
  used: number
}) {
  const router = useRouter()
  const [rules, setRules] = useState<PointRules>(initialRules)
  const [existingIds, setExistingIds] = useState<Set<string>>(() => new Set(initialRules.catalog.map(c => c.id)))
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null)

  async function redeem() {
    const c = code.trim().toUpperCase()
    if (!c || redeeming) return
    setRedeemMsg(null)
    setRedeeming(true)
    try {
      const res = await fetch(`${BASE_PATH}/api/vouchers/${encodeURIComponent(c)}/redeem`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      setRedeemMsg(res.ok ? '✓ 核銷成功' : data.error ?? '核銷失敗')
      if (res.ok) {
        setCode('')
        router.refresh()
      }
    } catch {
      setRedeemMsg('網路不穩，請再試一次')
    } finally {
      setRedeeming(false)
    }
  }

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch(`${BASE_PATH}/api/store-point-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      })
      const data = await res.json().catch(() => ({}))
      setSaveMsg(res.ok ? '✓ 已儲存' : data.error ?? '儲存失敗')
      if (res.ok) {
        setRules(data.rules)
        setExistingIds(new Set((data.rules as PointRules).catalog.map(c => c.id)))
      }
    } catch {
      setSaveMsg('網路不穩，請再試一次')
    } finally {
      setSaving(false)
    }
  }

  const fv = rules.first_voucher
  const setFv = (patch: Partial<PointRules['first_voucher']>) => setRules({ ...rules, first_voucher: { ...fv, ...patch } })
  const addItem = () => {
    const item: CatalogItem = { id: `item${Date.now()}`, kind: 'amount', value: 50, item_label: null, min_spend: null, valid_days: 60, cost_points: 300 }
    setRules({ ...rules, catalog: [...rules.catalog, item] })
  }
  const setItem = (idx: number, patch: Partial<CatalogItem>) =>
    setRules({ ...rules, catalog: rules.catalog.map((c, i) => (i === idx ? { ...c, ...patch } : c)) })
  const removeItem = (idx: number) =>
    setRules({ ...rules, catalog: rules.catalog.filter((_, i) => i !== idx) })
  const num = (v: string) => (v === '' ? null : Number(v))

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 text-[#3A3A3A]">
      <h1 className="text-xl font-bold">點數與餐券</h1>

      <section className="rounded-2xl border border-[#E8E2D8] bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="point-rules-enabled" className="font-bold">開放常來點點數與餐券</label>
          <input
            id="point-rules-enabled"
            type="checkbox"
            role="switch"
            aria-checked={rules.enabled}
            checked={rules.enabled}
            disabled={!canEdit}
            onChange={e => setRules({ ...rules, enabled: e.target.checked })}
            className="h-6 w-11 shrink-0 accent-[#C5A55A] disabled:opacity-40"
          />
        </div>
        <p className="mt-1 text-xs text-[#8A8585]">打開後，客人填完問卷可以用 LINE 或 Google 登入領點數與見面禮券</p>
        {!rules.enabled && <p className="mt-2 text-xs font-medium text-[#B5453D]">目前未開放，客人看不到</p>}
      </section>

      <section className="rounded-2xl border border-[#E8E2D8] bg-white p-5">
        <h2 className="font-bold">核銷餐券</h2>
        <p className="mt-1 text-xs text-[#8A8585]">客人出示 8 碼，輸入後核銷。每張只能用一次。</p>
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && redeem()}
            maxLength={8}
            placeholder="8 碼餐券代碼"
            aria-label="8 碼餐券代碼"
            disabled={redeeming}
            className={`${input} font-mono tracking-widest`}
          />
          <button
            onClick={redeem}
            disabled={redeeming || !code.trim()}
            className="shrink-0 rounded-lg bg-[#C5A55A] px-4 text-sm font-bold text-white disabled:opacity-40"
          >
            {redeeming ? '處理中' : '核銷'}
          </button>
        </div>
        {redeemMsg && <p className="mt-2 text-sm">{redeemMsg}</p>}
        <p className="mt-3 text-xs text-[#8A8585]">已發出 {issued} 張，已核銷 {used} 張</p>
      </section>

      <section className="rounded-2xl border border-[#E8E2D8] bg-white p-5">
        <h2 className="font-bold">見面禮餐券</h2>
        <p className="mt-1 text-xs text-[#8A8585]">客人第一次填完問卷並用 LINE 登入時自動發一張。</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <label>折抵金額<input type="number" disabled={!canEdit} value={fv.value ?? ''} onChange={e => setFv({ kind: 'amount', value: num(e.target.value) })} className={input} /></label>
          <label>低消（空白＝無）<input type="number" disabled={!canEdit} value={fv.min_spend ?? ''} onChange={e => setFv({ min_spend: num(e.target.value) })} className={input} /></label>
          <label>有效天數<input type="number" disabled={!canEdit} value={fv.valid_days} onChange={e => setFv({ valid_days: Number(e.target.value) })} className={input} /></label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <label>填問卷得點<input type="number" disabled={!canEdit} value={rules.survey_completed} onChange={e => setRules({ ...rules, survey_completed: Number(e.target.value) })} className={input} /></label>
          <label>點數有效月數<input type="number" disabled={!canEdit} value={rules.earn_valid_months} onChange={e => setRules({ ...rules, earn_valid_months: Number(e.target.value) })} className={input} /></label>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E8E2D8] bg-white p-5">
        <h2 className="font-bold">兌換目錄</h2>
        <p className="mt-1 text-xs text-[#8A8585]">已上架的項目只能降點數、不能移除或漲點數，避免客人覺得越集越沒用。</p>
        <ul className="mt-3 space-y-4">
          {rules.catalog.map((c, i) => {
            const isNew = !existingIds.has(c.id)
            return (
              <li key={c.id} className="rounded-xl border border-[#F0E6DA] p-3">
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div>
                    <label htmlFor={`cat-kind-${c.id}`} className={fieldLabel}>券種</label>
                    <select
                      id={`cat-kind-${c.id}`}
                      aria-label="券種"
                      disabled={!canEdit || !isNew}
                      value={c.kind}
                      onChange={e => setItem(i, { kind: e.target.value as CatalogItem['kind'] })}
                      className={input}
                    >
                      <option value="amount">折抵金額</option>
                      <option value="item">指定品項</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`cat-value-${c.id}`} className={fieldLabel}>{c.kind === 'amount' ? '面額' : '品項名稱'}</label>
                    {c.kind === 'amount'
                      ? <input id={`cat-value-${c.id}`} type="number" disabled={!canEdit} value={c.value ?? ''} onChange={e => setItem(i, { value: num(e.target.value) })} placeholder="金額" aria-label="面額" className={input} />
                      : <input id={`cat-value-${c.id}`} disabled={!canEdit} value={c.item_label ?? ''} onChange={e => setItem(i, { item_label: e.target.value })} placeholder="品項名稱" aria-label="品項名稱" className={input} />}
                  </div>
                  <div>
                    <label htmlFor={`cat-points-${c.id}`} className={fieldLabel}>所需點數</label>
                    <input id={`cat-points-${c.id}`} type="number" disabled={!canEdit} value={c.cost_points} onChange={e => setItem(i, { cost_points: Number(e.target.value) })} placeholder="所需點數" aria-label="所需點數" className={input} />
                  </div>
                  <div>
                    <label htmlFor={`cat-days-${c.id}`} className={fieldLabel}>有效天數</label>
                    <input id={`cat-days-${c.id}`} type="number" disabled={!canEdit} value={c.valid_days} onChange={e => setItem(i, { valid_days: Number(e.target.value) })} placeholder="有效天數" aria-label="有效天數" className={input} />
                  </div>
                </div>
                {canEdit && isNew && (
                  <button onClick={() => removeItem(i)} className="mt-2 text-xs font-bold text-[#B5453D]">移除</button>
                )}
              </li>
            )
          })}
        </ul>
        {canEdit && <button onClick={addItem} className="mt-3 text-sm font-bold text-[#C5A55A]">＋ 新增兌換項目</button>}
      </section>

      {canEdit ? (
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="rounded-lg bg-[#C5A55A] px-6 py-2 text-sm font-bold text-white disabled:opacity-40">
            {saving ? '儲存中' : '儲存設定'}
          </button>
          {saveMsg && <span className="text-sm">{saveMsg}</span>}
        </div>
      ) : (
        <p className="text-xs text-[#8A8585]">只有店主可以修改設定。</p>
      )}
    </div>
  )
}
