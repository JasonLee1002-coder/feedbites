'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, storeName }),
      });
      const data = await res.json();

      if (data.error) {
        setMessage(data.error);
      } else {
        setSuccess(true);
        setMessage('註冊成功！請查看 Email 確認信。');
      }
    } catch {
      setMessage('發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <h1 className="text-3xl font-bold text-[#3A3A3A] font-serif">
            Feed<span className="text-[#C5A55A]">Bites</span>
          </h1>
        </Link>
        <p className="text-xs text-[#C5A55A] tracking-[0.3em] mt-1">Bite. Rate. Save.</p>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#E8E2D8] shadow-sm">
        <h2 className="text-xl font-bold text-[#3A3A3A] mb-1">免費開通</h2>
        <p className="text-sm text-[#8A8585] mb-6">建立你的餐廳問卷帳號</p>

        {success ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎉</div>
            <p className="text-[#3A3A3A] font-medium mb-2">{message}</p>
            <p className="text-sm text-[#8A8585] mb-6">確認後即可登入使用</p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-[#C5A55A] text-white rounded-full text-sm font-medium hover:bg-[#A08735] transition-colors"
            >
              前往登入
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-1.5">餐廳名稱</label>
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                required
                placeholder="例如：小巷美食"
                className="w-full px-4 py-3 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] transition-colors bg-[#FAF7F2]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] transition-colors bg-[#FAF7F2]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-1.5">密碼</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="至少 6 個字元"
                className="w-full px-4 py-3 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] transition-colors bg-[#FAF7F2]"
              />
            </div>

            {message && !success && (
              <p className="text-sm text-red-500">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#C5A55A] text-white rounded-full text-sm font-semibold hover:bg-[#A08735] transition-colors disabled:opacity-50"
            >
              {loading ? '建立中...' : '免費建立帳號'}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-[#8A8585] mt-6">
        已有帳號？{' '}
        <Link href="/login" className="text-[#C5A55A] hover:text-[#A08735]">
          登入
        </Link>
      </p>

      <p className="text-center text-xs text-[#B0AAA0] mt-4">
        &copy; {new Date().getFullYear()} MCS Pte. Ltd. &middot; Singapore
      </p>
    </div>
  );
}
