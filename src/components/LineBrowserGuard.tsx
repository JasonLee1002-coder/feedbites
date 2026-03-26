'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';

/**
 * Detects LINE in-app browser and prompts the user to open in an external browser.
 * LINE IAB has cookie/JS limitations that break auth and complex SPAs.
 */
export default function LineBrowserGuard() {
  const [isLine, setIsLine] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    if (/Line\//i.test(ua)) {
      setIsLine(true);
    }
  }, []);

  if (!isLine || dismissed) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  function handleOpenExternal() {
    // On iOS, use openExternalBrowser query; on Android, use intent
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIos) {
      // LINE iOS supports this special URL scheme
      window.location.href = `${currentUrl}${currentUrl.includes('?') ? '&' : '?'}openExternalBrowser=1`;
    } else {
      // Android: open via intent
      window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-[#06C755]/95 to-[#06C755]/90 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center relative">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </button>

        {/* LINE icon */}
        <div className="w-16 h-16 bg-[#06C755] rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-white text-3xl font-bold">L</span>
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-2">
          請使用外部瀏覽器開啟
        </h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          LINE 內建瀏覽器可能無法正常顯示此頁面。
          請點擊下方按鈕，用 Safari 或 Chrome 開啟。
        </p>

        <button
          onClick={handleOpenExternal}
          className="w-full py-3.5 px-6 bg-[#FF8C00] hover:bg-[#E07000] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          用外部瀏覽器開啟
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="mt-3 text-xs text-gray-400 hover:text-gray-600"
        >
          繼續在 LINE 內瀏覽（部分功能可能異常）
        </button>
      </div>
    </div>
  );
}
