'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  // Load store info from token
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/feedbites/api/stores/join?token=${token}`);
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
      const res = await fetch('/feedbites/api/stores/join', {
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

  function handleLoginRedirect() {
    // Redirect to login, with invite token as query param so callback can process it
    window.location.href = `/feedbites/login?invite=${token}`;
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

                <button
                  onClick={handleLoginRedirect}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#C5A55A] text-white rounded-xl text-sm font-bold hover:bg-[#A08735] transition-all"
                >
                  登入 / 註冊後加入
                </button>

                <div className="text-center text-[10px] text-[#8A8585]">
                  第一次使用？前往登入頁即可免費註冊
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
