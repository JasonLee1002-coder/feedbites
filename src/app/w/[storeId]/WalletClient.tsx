'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Wallet = {
  balance: number
  recent: { id: string; label: string; points: number; at: string }[]
  vouchers: { code: string; label: string; status: 'active' | 'used' | 'expired'; expires_at: string }[]
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })

export default function WalletClient(props: {
  brand: string
  storeId: string
  storeName: string
  logoUrl: string | null
  loginHref: string
  googleHref: string
  notice: string | null
  wallet: Wallet | null
  catalog: { id: string; label: string; cost_points: number }[]
}) {
  const { brand, storeId, storeName, logoUrl, loginHref, googleHref, notice, wallet, catalog } = props
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function exchange(catalogId: string) {
    setBusy(catalogId)
    setMessage(null)
    try {
      const res = await fetch('/feedbites/api/customer/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, catalog_id: catalogId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 201) {
        setMessage(`換到了：${data.voucher.label}`)
        router.refresh()
      } else {
        setMessage(data.error ?? '兌換失敗，請再試一次')
      }
    } catch {
      setMessage('網路不穩，請再試一次')
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#FFF8F0] px-4 py-8 text-[#3A2A1A]">
      <div className="mx-auto max-w-md">
        <header className="flex items-center gap-3">
          {logoUrl && <img src={logoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />}
          <div>
            <div className="text-xs text-[#A07850]">{brand}</div>
            <h1 className="text-xl font-bold">{storeName}</h1>
          </div>
        </header>

        {notice && (
          <div className="mt-4 rounded-xl bg-[#FF8C00]/10 px-4 py-3 text-sm font-medium text-[#CC5500]">{notice}</div>
        )}

        {!wallet ? (
          <section className="mt-8 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-base font-bold">用 LINE 登入，看你的點數和餐券</p>
            <a href={loginHref} className="mt-4 inline-block rounded-full bg-[#06C755] px-6 py-3 text-sm font-bold text-white">
              用 LINE 登入
            </a>
            <a href={googleHref} className="mt-3 block text-xs text-[#A07850] underline underline-offset-2">
              No LINE? Continue with Google
            </a>
          </section>
        ) : (
          <>
            <section className="mt-6 rounded-2xl bg-gradient-to-br from-[#FF8C00] to-[#E84000] p-6 text-white shadow-md">
              <div className="text-sm opacity-90">我的點數</div>
              <div className="mt-1 font-mono text-5xl font-black">{wallet.balance}</div>
            </section>

            <section className="mt-6">
              <h2 className="text-sm font-bold text-[#A07850]">我的餐券</h2>
              {wallet.vouchers.length === 0 && <p className="mt-2 text-sm text-[#A07850]">還沒有餐券</p>}
              <ul className="mt-2 space-y-2">
                {wallet.vouchers.map(v => (
                  <li
                    key={v.code}
                    className={`rounded-xl border bg-white p-4 ${v.status === 'active' ? 'border-[#FF8C00]' : 'border-[#E8E2D8] opacity-50'}`}
                  >
                    <div className="font-bold">{v.label}</div>
                    <div className="mt-1 font-mono text-2xl tracking-widest text-[#CC5500]">{v.code}</div>
                    <div className="mt-1 text-xs text-[#A07850]">
                      {v.status === 'active' ? `結帳時給店員看，${fmtDate(v.expires_at)} 前有效` : v.status === 'used' ? '已使用' : '已過期'}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6">
              <h2 className="text-sm font-bold text-[#A07850]">用點數換</h2>
              <ul className="mt-2 space-y-2">
                {catalog.map(c => (
                  <li key={c.id} className="flex items-center justify-between rounded-xl bg-white p-4">
                    <div>
                      <div className="font-medium">{c.label}</div>
                      <div className="text-xs text-[#A07850]">{c.cost_points} 點</div>
                    </div>
                    <button
                      onClick={() => exchange(c.id)}
                      disabled={busy !== null || wallet.balance < c.cost_points}
                      className="rounded-full bg-[#FF8C00] px-4 py-2 text-sm font-bold text-white disabled:opacity-30"
                    >
                      {busy === c.id ? '處理中' : '兌換'}
                    </button>
                  </li>
                ))}
              </ul>
              {message && <p className="mt-2 text-sm text-[#CC5500]">{message}</p>}
            </section>

            <section className="mt-6 mb-10">
              <h2 className="text-sm font-bold text-[#A07850]">最近紀錄</h2>
              <ul className="mt-2 divide-y divide-[#F0E6DA] rounded-xl bg-white">
                {wallet.recent.map(r => (
                  <li key={r.id} className="flex justify-between px-4 py-3 text-sm">
                    <span>{r.label}<span className="ml-2 text-xs text-[#A07850]">{fmtDate(r.at)}</span></span>
                    <span className={r.points >= 0 ? 'font-bold text-[#CC5500]' : 'text-[#8A8585]'}>
                      {r.points > 0 ? `+${r.points}` : r.points}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
