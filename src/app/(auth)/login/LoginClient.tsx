'use client';
import { BRAND_ICON } from '@/lib/brand';

import { useState, Suspense } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BASE_PATH } from '@/lib/brand'
import { signInWithGoogle } from './actions';

function isInAppWebView(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Line\/|FBAN|FBAV|Instagram|MicroMessenger|WeChat|Snapchat|Twitter\/|TikTok/i.test(ua);
}

function WebViewWarning({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-5 text-white text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <h2 className="font-extrabold text-lg">請用手機瀏覽器開啟</h2>
          <p className="text-white/90 text-sm mt-1">
            目前在 LINE / FB 內開啟，登入可能無法使用
          </p>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="font-bold text-blue-800 text-sm mb-2">📱 iPhone（Safari）</p>
            <div className="space-y-1.5 text-xs text-blue-700">
              <div className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                <span>點擊右下角 <strong>「...」</strong> 選單</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                <span>選擇 <strong>「在瀏覽器中開啟」</strong></span>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-2xl p-4">
            <p className="font-bold text-green-800 text-sm mb-2">🤖 Android（Chrome）</p>
            <div className="space-y-1.5 text-xs text-green-700">
              <div className="flex items-start gap-2">
                <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                <span>點擊右上角 <strong>「⋮」</strong> 選單</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                <span>選擇 <strong>「在 Chrome 中開啟」</strong></span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onDismiss}
            className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            我知道了，繼續嘗試
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginClient({ emailLoginEnabled }: { emailLoginEnabled: boolean }) {
  return (
    <Suspense>
      <LoginForm emailLoginEnabled={emailLoginEnabled} />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function GoogleSignInButton({ inviteToken }: { inviteToken: string | null }) {
  const { pending } = useFormStatus();
  return (
    <>
      {inviteToken && <input type="hidden" name="invite" value={inviteToken} />}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 flex items-center justify-center gap-3 bg-white border border-[#E8E2D8] rounded-full text-sm font-semibold text-[#3A3A3A] hover:border-[#C5A55A] hover:bg-[#FAF7F2] transition-colors disabled:opacity-50"
      >
        <GoogleIcon />
        {pending ? '前往 Google…' : '用 Google 登入'}
      </button>
    </>
  );
}

function authErrorMessage(code: string): string {
  if (code === 'AccessDenied') return '這個 Google 帳號沒有登入權限，請聯絡常來點管理員';
  return '登入失敗，請重試';
}

function LoginForm({ emailLoginEnabled }: { emailLoginEnabled: boolean }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [webViewDismissed, setWebViewDismissed] = useState(false);
  const showWebViewWarning = !webViewDismissed && isInAppWebView();
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const inviteToken = searchParams.get('invite');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`${BASE_PATH}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.error) {
        setMessage(data.error);
      } else {
        // If there's a pending invite token, join the store before going to dashboard
        if (inviteToken) {
          await fetch(`${BASE_PATH}/api/stores/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: inviteToken }),
          }).catch(() => {}); // best-effort, don't block navigation
        }
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
      {showWebViewWarning && <WebViewWarning onDismiss={() => setWebViewDismissed(true)} />}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex flex-col items-center gap-3">
          <img src={BRAND_ICON} alt="" className="w-16 h-16 rounded-2xl" />
          <h1 className="text-3xl font-bold text-[#3A3A3A] font-serif">
            常來<span className="text-[#C5A55A]">點</span>
          </h1>
        </Link>
        <p className="text-xs text-[#C5A55A] tracking-[0.3em] mt-1">Eat. Earn. Eat again.</p>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#E8E2D8] shadow-sm">
        <h2 className="text-xl font-bold text-[#3A3A3A] mb-1">店長登入</h2>
        <p className="text-sm text-[#8A8585] mb-6">使用已開通的 Google 帳號登入</p>

        {authError && (
          <p className="text-sm text-red-500 mb-4">{authErrorMessage(authError)}</p>
        )}

        <form action={signInWithGoogle}>
          <GoogleSignInButton inviteToken={inviteToken} />
        </form>

        {emailLoginEnabled && (
        <>
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[#E8E2D8]" />
          <span className="text-xs text-[#B0AAA0]">或暫時用 Gmail 登入</span>
          <div className="flex-1 h-px bg-[#E8E2D8]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#3A3A3A] mb-1.5">Gmail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@gmail.com"
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
            {loading ? '登入中...' : '登入 / 註冊'}
          </button>
        </form>
        </>
        )}

        <p className="text-xs text-[#B0AAA0] mt-4 text-center">
          首次登入會自動建立帳號 ✨
        </p>
      </div>

      <Link
        href="/"
        className="block text-center text-xs text-[#B0AAA0] mt-4 hover:text-[#C5A55A] transition-colors"
      >
        ← 回到首頁
      </Link>

      <p className="text-center text-xs text-[#B0AAA0] mt-3">
        &copy; {new Date().getFullYear()} MCS Pte. Ltd. &middot; Singapore
      </p>
    </div>
  );
}
