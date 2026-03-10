'use client';

import { useState, useEffect } from 'react';
import type { ThemeColors } from '@/types/survey';

interface DiscountCodeDisplayProps {
  code: string;
  discountValue: string;
  expiresAt: string;
  storeName: string;
  colors: ThemeColors;
}

export default function DiscountCodeDisplay({
  code,
  discountValue,
  expiresAt,
  storeName,
  colors,
}: DiscountCodeDisplayProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Auto reveal after 1 second with animation
    const timer = setTimeout(() => setRevealed(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const expiryDate = new Date(expiresAt).toLocaleDateString('zh-TW');

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: colors.background }}>
      {/* Celebration */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="text-6xl mb-4">🎉</div>
        <h1
          className="text-2xl font-bold tracking-wider mb-2"
          style={{ fontFamily: "'Noto Serif TC', serif", color: colors.text }}
        >
          感謝您的回饋
        </h1>
        <p className="text-sm" style={{ color: colors.textLight }}>
          {storeName} 感謝您的寶貴意見
        </p>
      </div>

      {/* Discount code card */}
      <div
        className="w-full max-w-sm rounded-3xl p-8 text-center relative overflow-hidden"
        style={{
          background: colors.surface,
          border: `2px solid ${colors.primary}`,
          boxShadow: `0 8px 32px ${colors.primary}20`,
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -left-3 top-1/2 w-6 h-6 rounded-full"
          style={{ background: colors.background, transform: 'translateY(-50%)' }}
        />
        <div
          className="absolute -right-3 top-1/2 w-6 h-6 rounded-full"
          style={{ background: colors.background, transform: 'translateY(-50%)' }}
        />

        <div className="text-sm font-medium mb-1" style={{ color: colors.primary }}>
          您的專屬折扣
        </div>
        <div className="text-3xl font-bold mb-6" style={{ color: colors.text }}>
          {discountValue}
        </div>

        {/* Code reveal */}
        <div className="mb-4">
          <div className="text-xs mb-2" style={{ color: colors.textLight }}>折扣碼</div>
          {revealed ? (
            <button
              onClick={copyCode}
              className="px-8 py-4 rounded-2xl text-3xl font-mono font-bold tracking-[0.5em] transition-all hover:scale-105"
              style={{
                background: `${colors.primary}10`,
                color: colors.primary,
                border: `1px dashed ${colors.primary}`,
              }}
            >
              {code}
            </button>
          ) : (
            <div
              className="px-8 py-4 rounded-2xl text-3xl font-mono tracking-[0.5em] animate-pulse"
              style={{ background: colors.border, color: 'transparent' }}
            >
              ??????
            </div>
          )}
        </div>

        {copied && (
          <div className="text-xs font-medium mb-2" style={{ color: colors.primary }}>
            已複製到剪貼簿！
          </div>
        )}

        <div className="text-xs" style={{ color: colors.textLight }}>
          有效期至 {expiryDate}<br />
          結帳時出示此碼即享優惠
        </div>

        {/* Dashed line */}
        <div
          className="my-6 border-t-2 border-dashed"
          style={{ borderColor: colors.border }}
        />

        <div className="text-xs" style={{ color: colors.textLight }}>
          📸 請截圖保存此畫面
        </div>
      </div>

      {/* FeedBites branding */}
      <div className="mt-8 text-center">
        <a href="/" target="_blank" className="text-xs font-medium" style={{ color: colors.primary }}>
          FeedBites
        </a>
        <div className="text-[10px] mt-0.5" style={{ color: colors.textLight }}>
          Bite. Rate. Save.
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease forwards;
        }
      `}</style>
    </div>
  );
}
