'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  // Load store info from token
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/stores/join?token=${token}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else if (data.already_member) {
          setJoined(true);
          setStoreName(data.store_name);
        } else {
          setStoreName(data.store_name);
          // If user is already logged in, auto-join
          if (data.can_join) {
            handleAutoJoin();
          }
        }
      } catch {
        setError('連結無效或已過期');
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAutoJoin() {
    setJoining(true);
    try {
      const res = await fetch('/api/stores/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        setJoined(true);
        setStoreName(data.store_name);
      } else {
        setError(data.error || '加入失敗');
      }
    } catch {
      setError('加入失敗');
    } finally {
      setJoining(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    // Save token to localStorage so callback can use it
    localStorage.setItem('feedbites_invite_token', token);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?invite=${token}`,
        queryParams: { prompt: 'select_account' },
      },
    });

    if (authError) {
      setGoogleLoading(false);
      setError('登入失敗，請稍後再試');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🍽️</div>
          <p className="text-sm text-[#8A8585]">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] px-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-[#3A3A3A] mb-2">邀請連結無效</h1>
          <p className="text-sm text-[#8A8585] mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-2.5 bg-[#C5A55A] text-white rounded-xl text-sm font-bold hover:bg-[#A08735] transition-colors"
          >
            前往 FeedBites 首頁
          </a>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] px-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold text-[#3A3A3A] mb-2">成功加入！</h1>
          <p className="text-sm text-[#8A8585] mb-6">
            你已經是 <strong className="text-[#C5A55A]">{storeName}</strong> 的管理成員了
          </p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-[#C5A55A] text-white rounded-xl text-sm font-bold hover:bg-[#A08735] transition-colors"
          >
            進入管理後台
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] px-6">
      <div className="w-full max-w-sm">
        {/* Invite card */}
        <div className="bg-white rounded-3xl shadow-lg shadow-[#C5A55A]/10 border border-[#E8E2D8] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] p-6 text-center">
            <div className="text-4xl mb-3">🍽️</div>
            <h1 className="text-lg font-bold text-white mb-1">你被邀請加入</h1>
            <p className="text-2xl font-bold text-[#C5A55A]">{storeName}</p>
            <p className="text-xs text-white/50 mt-2">FeedBites 餐廳管理團隊</p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {joining ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-3 animate-bounce">🚀</div>
                <p className="text-sm text-[#8A8585]">加入中...</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-[#8A8585] text-center leading-relaxed">
                  登入後即可和店長一起管理問卷、查看回覆
                </p>

                {/* Google Login */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-[#E8E2D8] rounded-xl text-sm font-medium text-[#3A3A3A] hover:border-[#C5A55A] hover:shadow-md transition-all disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {googleLoading ? '登入中...' : '用 Google 帳號加入'}
                </button>

                <div className="text-center text-[10px] text-[#8A8585]">
                  第一次使用？登入即自動註冊
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <a href="/" className="text-xs text-[#C5A55A] font-medium">FeedBites</a>
          <p className="text-[10px] text-[#8A8585] mt-0.5">Bite. Rate. Save.</p>
        </div>
      </div>
    </div>
  );
}
