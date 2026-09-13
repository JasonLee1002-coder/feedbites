'use client'

import type { ThemeColors } from '@/types/survey'
import { CUSTOMER_BRAND, BASE_PATH } from '@/lib/brand'

export type AwardedPoints = {
  awarded: number
  first_voucher: { code: string; label: string; expires_at: string } | null
  wallet_url: string
}

// 匿名客人：顯示 LINE 登入按鈕，登入後回呼會認領這一筆回答。
// 已登入客人：顯示已入帳結果。
export default function ClaimPointsCard({
  claimToken,
  points,
  colors,
}: {
  claimToken: string | null
  points: AwardedPoints | null
  colors: ThemeColors
}) {
  const box = 'mt-6 w-full max-w-sm mx-auto rounded-2xl p-5 text-center'

  if (points) {
    return (
      <div className={box} style={{ background: `${colors.primary}10`, border: `1px solid ${colors.border}` }}>
        <div className="text-3xl mb-1">🪙</div>
        <p className="text-base font-bold" style={{ color: colors.text }}>
          {points.awarded > 0 ? `+${points.awarded} 點已入帳` : '今天已經領過點數囉'}
        </p>
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
