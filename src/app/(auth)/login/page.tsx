'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.error) {
        setMessage(data.error);
      } else {
        router.push('/dashboard');
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
        <h2 className="text-xl font-bold text-[#3A3A3A] mb-1">店長登入</h2>
        <p className="text-sm text-[#8A8585] mb-6">管理你的餐廳問卷</p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="輸入密碼"
              className="w-full px-4 py-3 rounded-xl border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] transition-colors bg-[#FAF7F2]"
            />
          </div>

          {message && (
            <p className="text-sm text-red-500">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#C5A55A] text-white rounded-full text-sm font-semibold hover:bg-[#A08735] transition-colors disabled:opacity-50"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-[#8A8585] mt-6">
        還沒有帳號？{' '}
        <Link href="/register" className="text-[#C5A55A] hover:text-[#A08735]">
          免費開通
        </Link>
      </p>

      <p className="text-center text-xs text-[#B0AAA0] mt-4">
        &copy; {new Date().getFullYear()} MCS Pte. Ltd. &middot; Singapore
      </p>
    </div>
  );
}
