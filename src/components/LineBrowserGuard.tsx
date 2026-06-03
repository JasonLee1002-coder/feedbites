'use client';

import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Detects LINE / Facebook in-app browser and BLOCKS the page.
 * These IABs have cookie/JS limitations that break auth and complex SPAs.
 * The overlay is NOT dismissable — user must open in external browser.
 */
export default function LineBrowserGuard() {
  const [isBadBrowser, setIsBadBrowser] = useState(false);
  const [browserType, setBrowserType] = useState<'line' | 'fb' | 'other'>('other');

  useEffect(() => {
    const ua = navigator.userAgent || '';
    if (/Line\//i.test(ua)) {
      setIsBadBrowser(true);
      setBrowserType('line');
    } else if (/FBAN|FBAV|FB_IAB|Facebook/i.test(ua)) {
      setIsBadBrowser(true);
      setBrowserType('fb');
    }
  }, []);

  if (!isBadBrowser) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const isIos = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  function handleOpenExternal() {
    if (browserType === 'line') {
      if (isIos) {
        // LINE iOS: openExternalBrowser query param opens Safari
        const sep = currentUrl.includes('?') ? '&' : '?';
        window.location.href = `${currentUrl}${sep}openExternalBrowser=1`;
      } else {
        // Android: Chrome intent
        window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      }
    } else {
      // FB WebView: copy URL approach — just open in system browser
      if (isIos) {
        // iOS FB: use _blank trick (limited but best available)
        window.open(currentUrl, '_blank');
      } else {
        window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      }
    }
  }

  const isLineBrowser = browserType === 'line';
  const accentColor = isLineBrowser ? '#06C755' : '#1877F2';
  const appName = isLineBrowser ? 'LINE' : 'Facebook';
  const appLetter = isLineBrowser ? 'L' : 'f';

  return (
    /* Full-screen blocking overlay — intentionally NOT dismissable */
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6"
      style={{ background: `linear-gradient(160deg, ${accentColor}F0 0%, ${accentColor}D0 100%)` }}>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
        {/* App icon */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg"
          style={{ backgroundColor: accentColor }}
        >
          <span className="text-white text-4xl font-black">{appLetter}</span>
        </div>

        <h2 className="text-xl font-black text-gray-800 mb-3 leading-tight">
          無法在 {appName}<br />內建瀏覽器使用
        </h2>
        <p className="text-sm text-gray-500 mb-7 leading-relaxed">
          {appName} 內建瀏覽器限制了部分功能，<br />
          導致問卷無法正常顯示。<br />
          <span className="font-semibold text-gray-700">請用 Safari 或 Chrome 開啟。</span>
        </p>

        {/* Primary CTA */}
        <button
          onClick={handleOpenExternal}
          className="w-full py-4 px-6 text-white font-black rounded-2xl transition-all active:scale-[0.97] flex items-center justify-center gap-2.5 text-base shadow-lg"
          style={{ backgroundColor: '#FF8C00' }}
        >
          <ExternalLink className="w-5 h-5" />
          用外部瀏覽器開啟
        </button>

        {/* How-to hint */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 leading-relaxed">
            {isLineBrowser
              ? '點右上角「⋯」選單 → 選「以瀏覽器開啟」'
              : '點右上角「⋯」選單 → 選「在瀏覽器中開啟」'}
          </p>
          {/* Step icons */}
          <div className="flex items-center justify-center gap-2 mt-2 text-gray-400">
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full font-medium">⋯</span>
            <span className="text-gray-300">→</span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full font-medium">在瀏覽器中開啟</span>
          </div>
        </div>
      </div>

      {/* Bottom watermark */}
      <p className="mt-4 text-xs text-white/60">FeedBites — 確保最佳填寫體驗</p>
    </div>
  );
}
