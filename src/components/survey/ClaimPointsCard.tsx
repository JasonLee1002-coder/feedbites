'use client'

import { useState } from 'react'
import type { ThemeColors } from '@/types/survey'
import { CUSTOMER_BRAND, BASE_PATH } from '@/lib/brand'

export type AwardedPoints = {
  awarded: number
  first_voucher: { code: string; label: string; expires_at: string } | null
  wallet_url: string
}

// 匿名客人：顯示 LINE 登入按鈕，登入後回呼會認領這一筆回答。
// 已登入客人：顯示已入帳結果。
// variant 'card'：原本置中卡片，用在無折扣碼的感謝頁。
// variant 'bar'：固定在畫面底部的精簡領點列，用在折扣頁上方，避免被 DiscountCodeDisplay 的 min-h-screen 擠出畫面外。
export default function ClaimPointsCard({
  claimToken,
  points,
  colors,
  variant = 'card',
}: {
  claimToken: string | null
  points: AwardedPoints | null
  colors: ThemeColors
  variant?: 'card' | 'bar'
}) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  if (points) {
    const label = points.awarded > 0 ? `+${points.awarded} 點已入帳` : '今天已經領過點數囉'

    if (variant === 'bar') {
      return (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
          style={{ background: colors.surface, borderTop: `1px solid ${colors.border}` }}
        >
          <a href={points.wallet_url} className="min-w-0 flex-1 truncate text-sm font-bold" style={{ color: colors.text }}>
            {label}・打開我的{CUSTOMER_BRAND}
          </a>
          <button
            onClick={() => setDismissed(true)}
            aria-label="關閉"
            className="shrink-0 text-lg leading-none"
            style={{ color: colors.textLight }}
          >
            ×
          </button>
        </div>
      )
    }

    const box = 'mt-6 w-full max-w-sm mx-auto rounded-2xl p-5 text-center'
    return (
      <div className={box} style={{ background: `${colors.primary}10`, border: `1px solid ${colors.border}` }}>
        <div className="text-3xl mb-1">🪙</div>
        <p className="text-base font-bold" style={{ color: colors.text }}>{label}</p>
        {points.first_voucher && (
          <p className="mt-2 text-sm" style={{ color: colors.text }}>
            🎁 見面禮：{points.first_voucher.label}
            <span className="block font-mono tracking-widest mt-1">{points.first_voucher.code}</span>
          </p>
        )}
        <a
          href={points.wallet_url}
          className="mt-4 inline-block rounded-full px-5 py-2 text-sm font-bold text-white"
          style={{ background: colors.primary }}
        >
          打開我的{CUSTOMER_BRAND}
        </a>
      </div>
    )
  }

  if (!claimToken) return null
  const claim = encodeURIComponent(claimToken)

  if (variant === 'bar') {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
        style={{ background: colors.surface, borderTop: `1px solid ${colors.border}` }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <a
            href={`${BASE_PATH}/api/customer/line/start?claim=${claim}`}
            className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white"
            style={{ background: '#06C755' }}
          >
            用 LINE 登入領點數與見面禮券
          </a>
          <a
            href={`${BASE_PATH}/api/customer/google/start?claim=${claim}`}
            className="truncate text-[10px] underline underline-offset-2"
            style={{ color: colors.textLight }}
          >
            No LINE? Google
          </a>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="關閉"
          className="shrink-0 text-lg leading-none"
          style={{ color: colors.textLight }}
        >
          ×
        </button>
      </div>
    )
  }

  const box = 'mt-6 w-full max-w-sm mx-auto rounded-2xl p-5 text-center'
  return (
    <div className={box} style={{ background: '#06C75510', border: '1px solid #06C75540' }}>
      <p className="text-base font-bold" style={{ color: colors.text }}>
        領取點數和一張見面禮餐券
      </p>
      <p className="mt-1 text-xs" style={{ color: colors.textLight }}>
        點數可以換餐券，下次來店直接用
      </p>
      <a
        href={`${BASE_PATH}/api/customer/line/start?claim=${claim}`}
        className="mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white"
        style={{ background: '#06C755' }}
      >
        用 LINE 登入領取
      </a>
      <a
        href={`${BASE_PATH}/api/customer/google/start?claim=${claim}`}
        className="mt-3 block text-xs underline underline-offset-2"
        style={{ color: colors.textLight }}
      >
        No LINE? Continue with Google
      </a>
      <p className="mt-2 text-[10px]" style={{ color: colors.textLight }}>
        請在 30 分鐘內領取
      </p>
    </div>
  )
}
