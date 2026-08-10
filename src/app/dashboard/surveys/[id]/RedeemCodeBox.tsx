'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Result =
  | { kind: 'ok'; alreadyUsed: boolean }
  | { kind: 'notfound' }
  | { kind: 'error'; requestId?: string };

/**
 * 店員手動核銷：客人出示 6 碼，店員輸入後標記。
 *
 * 刻意不做嚴格驗證 —— 優惠碼可被複製是已接受的行銷成本。
 * 這只是讓店長能記帳，使儀表板的「已核銷」數字有意義。
 * 若該碼先前已被標記過，仍會成功，但會提示店員，讓他自己判斷。
 */
export default function RedeemCodeBox() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const router = useRouter();

  async function submit() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(
        `/feedbites/api/discounts/${encodeURIComponent(trimmed)}/mark`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ used: true }),
        },
      );
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setResult({ kind: 'ok', alreadyUsed: !!data.was_already_used });
        setCode('');
        router.refresh();
      } else if (res.status === 404) {
        setResult({ kind: 'notfound' });
      } else {
        setResult({ kind: 'error', requestId: data.request_id });
      }
    } catch {
      setResult({ kind: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#E8E2D8]">
      <div className="text-[10px] text-[#8A8585] mb-1.5">核銷優惠碼</div>
      <div className="flex gap-1.5">
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="輸入客人出示的 6 碼"
          maxLength={12}
          className="flex-1 min-w-0 rounded-lg border border-[#E8E2D8] bg-white px-2.5 py-2 text-sm font-mono tracking-widest text-[#3A3A3A] placeholder:font-sans placeholder:tracking-normal placeholder:text-[#8A8585]/60 focus:outline-none focus:border-[#C5A55A]"
        />
        <button
          onClick={submit}
          disabled={busy || !code.trim()}
          className="shrink-0 rounded-lg bg-[#C5A55A] px-3 py-2 text-xs font-bold text-white transition-opacity disabled:opacity-40"
        >
          {busy ? '處理中' : '核銷'}
        </button>
      </div>

      {result?.kind === 'ok' && (
        <p className="mt-1.5 text-[10px] text-emerald-600">
          {result.alreadyUsed ? '✓ 已核銷（這張先前已標記過）' : '✓ 核銷成功'}
        </p>
      )}
      {result?.kind === 'notfound' && (
        <p className="mt-1.5 text-[10px] text-red-500">找不到這個優惠碼，請確認是否輸入正確</p>
      )}
      {result?.kind === 'error' && (
        <p className="mt-1.5 text-[10px] text-red-500">
          系統錯誤，請稍後再試{result.requestId ? `（代碼 ${result.requestId.slice(0, 8)}）` : ''}
        </p>
      )}
    </div>
  );
}
