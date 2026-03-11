'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [isStoreSetup, setIsStoreSetup] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // If redirected from OAuth callback with ?setup=true, show store name form
  useEffect(() => {
    if (searchParams.get('setup') === 'true') {
      setIsStoreSetup(true);
    }
  }, [searchParams]);

  async function handleGoogleRegister() {
    setGoogleLoading(true);
    setMessage('');
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      setMessage('Google 連線失敗，請稍後再試');
      setGoogleLoading(false);
    }
  }

  // Store setup for Google users (first-time login)
  async function handleStoreSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) {
      setMessage('請輸入餐廳名稱');
      return;
    }
    setLoading(true);
    setMessage('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setMessage('請先登入');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/auth/setup-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName: storeName.trim() }),
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
        setMessage('註冊成功！');
      }
    } catch {
      setMessage('發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  // Store setup form (for Google OAuth first-time users)
  if (isStoreSetup) {
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
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-[#3A3A3A] mb-1">Google 連結成功！</h2>
            <p className="text-sm text-[#8A8585]">最後一步，告訴我們你的餐廳名稱</p>
          </div>

          <form onSubmit={handleStoreSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#3A3A3A] mb-1.5">餐廳名稱</label>
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                required
                autoFocus
                placeholder="例如：町咖啡"
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
              {loading ? '建立中...' : '開始使用 FeedBites'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#B0AAA0] mt-6">
          &copy; {new Date().getFullYear()} MCS Pte. Ltd. &middot; Singapore
        </p>
      </div>
    );
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
            <p className="text-sm text-[#8A8585] mb-6">即可登入使用</p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-[#C5A55A] text-white rounded-full text-sm font-medium hover:bg-[#A08735] transition-colors"
            >
              前往登入
            </Link>
          </div>
        ) : (
          <>
            {/* Google Register Button */}
            <button
              onClick={handleGoogleRegister}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-full border border-[#E8E2D8] bg-white text-sm font-medium text-[#3A3A3A] hover:bg-[#FAF7F2] hover:border-[#C5A55A] transition-all disabled:opacity-50 mb-6"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {googleLoading ? '連線中...' : '使用 Google 帳號註冊'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-[#E8E2D8]" />
              <span className="text-xs text-[#B0AAA0]">或使用 Email</span>
              <div className="flex-1 h-px bg-[#E8E2D8]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3A3A3A] mb-1.5">餐廳名稱</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  required
                  placeholder="例如：町咖啡"
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
          </>
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
