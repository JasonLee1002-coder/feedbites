'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';

export default function NewStorePage() {
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) {
      setError('請輸入餐廳名稱');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/setup-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName: storeName.trim() }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        // The setup-store API auto-selects the new store via cookie
        window.location.href = '/dashboard';
      }
    } catch {
      setError('發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-[#8A8585] hover:text-[#C5A55A] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        返回總覽
      </Link>

      <div className="bg-white rounded-2xl p-8 border border-[#E8E2D8] shadow-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#C5A55A]/10 flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-[#C5A55A]" />
          </div>
          <h1 className="text-xl font-bold text-[#3A3A3A]" style={{ fontFamily: "'Noto Serif TC', serif" }}>
            新增店家
          </h1>
          <p className="text-sm text-[#8A8585] mt-1">
            一個帳號可以管理多間餐廳的問卷
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#3A3A3A] mb-1.5">餐廳名稱</label>
            <input
              type="text"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              required
              autoFocus
              placeholder="例如：町咖啡 二店"
              className="w-full px-4 py-3 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] transition-colors bg-[#FAF7F2]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#C5A55A] text-white rounded-full text-sm font-semibold hover:bg-[#A08735] transition-colors disabled:opacity-50"
          >
            {loading ? '建立中...' : '建立新店家'}
          </button>
        </form>
      </div>
    </div>
  );
}
