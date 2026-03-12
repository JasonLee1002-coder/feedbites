'use client';

import { useState } from 'react';
import { qrFrames, type QrFrame } from '@/lib/qr-frames';
import { Printer, Check, Sparkles } from 'lucide-react';

interface Props {
  surveyId: string;
  surveyTitle: string;
  storeName: string;
  publicUrl: string;
}

/* ── SVG Corner Ornaments ── */
function CornerOrnament({ position, color }: { position: 'tl' | 'tr' | 'bl' | 'br'; color: string }) {
  const rotate =
    position === 'tl' ? 0
    : position === 'tr' ? 90
    : position === 'bl' ? 270
    : 180;

  return (
    <svg
      className="absolute w-12 h-12"
      style={{
        top: position.includes('t') ? 8 : 'auto',
        bottom: position.includes('b') ? 8 : 'auto',
        left: position.includes('l') ? 8 : 'auto',
        right: position.includes('r') ? 8 : 'auto',
        transform: `rotate(${rotate}deg)`,
        color,
      }}
      viewBox="0 0 60 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 2 C2 2 2 30 2 30 C2 30 4 20 12 12 C20 4 30 2 30 2 L2 2Z" fill="currentColor" opacity="0.1" />
      <path d="M2 2 L30 2" />
      <path d="M2 2 L2 30" />
      <circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.3" />
      <path d="M2 2 Q16 6 14 14 Q6 16 2 2" fill="currentColor" opacity="0.08" />
    </svg>
  );
}

/* ── Decorative Divider ── */
function Divider({ color }: { color: string }) {
  return (
    <svg className="w-32 h-4 mx-auto my-2" viewBox="0 0 120 16" fill="none">
      <line x1="0" y1="8" x2="45" y2="8" stroke={color} strokeWidth="0.5" opacity="0.4" />
      <circle cx="50" cy="8" r="1.5" fill={color} opacity="0.3" />
      <path d="M53 8 L60 4 L67 8 L60 12 Z" fill={color} opacity="0.2" />
      <circle cx="70" cy="8" r="1.5" fill={color} opacity="0.3" />
      <line x1="75" y1="8" x2="120" y2="8" stroke={color} strokeWidth="0.5" opacity="0.4" />
    </svg>
  );
}

/* ── Top/Bottom border ornament ── */
function EdgeOrnament({ position, color }: { position: 'top' | 'bottom'; color: string }) {
  return (
    <svg
      className={`absolute left-1/2 -translate-x-1/2 w-20 h-5 ${position === 'top' ? 'top-1' : 'bottom-1'}`}
      viewBox="0 0 80 20"
      fill="none"
    >
      {position === 'top' ? (
        <>
          <path d="M10 18 Q20 2 40 2 Q60 2 70 18" stroke={color} strokeWidth="1" opacity="0.3" fill="none" />
          <circle cx="40" cy="2" r="2.5" fill={color} opacity="0.2" />
          <circle cx="25" cy="10" r="1.2" fill={color} opacity="0.15" />
          <circle cx="55" cy="10" r="1.2" fill={color} opacity="0.15" />
        </>
      ) : (
        <>
          <path d="M10 2 Q20 18 40 18 Q60 18 70 2" stroke={color} strokeWidth="1" opacity="0.3" fill="none" />
          <circle cx="40" cy="18" r="2.5" fill={color} opacity="0.2" />
          <circle cx="25" cy="10" r="1.2" fill={color} opacity="0.15" />
          <circle cx="55" cy="10" r="1.2" fill={color} opacity="0.15" />
        </>
      )}
    </svg>
  );
}

export default function QrPrintClient({ surveyId, surveyTitle, storeName, publicUrl }: Props) {
  const [selectedFrame, setSelectedFrame] = useState<QrFrame>(qrFrames[0]);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}&margin=0`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* ── Frame Picker ── */}
      <div className="print:hidden mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-[#3A3A3A] font-serif flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C5A55A]" />
            選擇花框樣式
          </h1>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C5A55A] text-white text-sm font-medium rounded-xl hover:bg-[#A08735] transition-colors shadow-md"
          >
            <Printer className="w-4 h-4" />
            列印 QR Code
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {qrFrames.map((frame) => {
            const isSelected = selectedFrame.id === frame.id;
            return (
              <button
                key={frame.id}
                onClick={() => setSelectedFrame(frame)}
                className={`group relative rounded-xl p-1 transition-all ${
                  isSelected
                    ? 'ring-2 ring-[#C5A55A] ring-offset-2 shadow-lg scale-[1.02]'
                    : 'hover:shadow-md hover:scale-[1.01] border border-[#E8E2D8]'
                }`}
              >
                {/* Preview card */}
                <div
                  className="aspect-[3/4] rounded-lg flex flex-col items-center justify-center gap-1.5 p-2 relative overflow-hidden"
                  style={{ background: frame.previewGradient }}
                >
                  {/* Mini frame simulation */}
                  <div className={`w-full h-full absolute inset-0 ${frame.innerClass} rounded-lg pointer-events-none`} style={{ margin: 4 }} />

                  {/* Mini QR placeholder */}
                  <div className="w-8 h-8 rounded border border-current opacity-20 grid grid-cols-3 gap-px p-0.5 relative z-10"
                    style={{ color: frame.accentColor }}
                  >
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className={`rounded-[1px] ${[0, 2, 6].includes(i) ? 'bg-current' : i % 2 === 0 ? 'bg-current opacity-40' : ''}`} />
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div className="text-center mt-1.5 mb-1">
                  <div className="text-[11px] font-medium text-[#3A3A3A] leading-tight">{frame.name}</div>
                </div>

                {/* Selected badge */}
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#C5A55A] rounded-full flex items-center justify-center shadow">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Print Preview / Actual Print ── */}
      <div className="flex justify-center">
        <div
          id="qr-print-card"
          className={`relative w-[360px] min-h-[500px] rounded-2xl overflow-hidden print:rounded-none print:w-full print:max-w-[360px] print:mx-auto ${selectedFrame.wrapperClass}`}
          style={selectedFrame.bgStyle}
        >
          {/* Corner ornaments */}
          <CornerOrnament position="tl" color={selectedFrame.accentColor} />
          <CornerOrnament position="tr" color={selectedFrame.accentColor} />
          <CornerOrnament position="bl" color={selectedFrame.accentColor} />
          <CornerOrnament position="br" color={selectedFrame.accentColor} />

          {/* Top edge ornament */}
          <EdgeOrnament position="top" color={selectedFrame.accentColor} />
          <EdgeOrnament position="bottom" color={selectedFrame.accentColor} />

          {/* Inner frame */}
          <div className={`mx-5 my-5 p-6 rounded-xl relative ${selectedFrame.innerClass}`}>
            {/* Store name */}
            <div className="text-center mb-4">
              <h2
                className="text-xl font-bold font-serif tracking-wide"
                style={{ color: selectedFrame.textColor }}
              >
                {storeName}
              </h2>
              <Divider color={selectedFrame.accentColor} />
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <div
                className="p-3 rounded-xl bg-white shadow-sm"
                style={{ border: `2px solid ${selectedFrame.accentColor}20` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="QR Code"
                  width={200}
                  height={200}
                  className="block"
                />
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mb-3">
              <p
                className="text-base font-bold mb-1"
                style={{ color: selectedFrame.textColor }}
              >
                掃碼填問卷
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: selectedFrame.accentColor }}
              >
                即可獲得專屬折扣
              </p>
            </div>

            <Divider color={selectedFrame.accentColor} />

            {/* Survey title */}
            <p
              className="text-center text-xs mt-2 opacity-60"
              style={{ color: selectedFrame.textColor }}
            >
              {surveyTitle}
            </p>

            {/* Powered by */}
            <p
              className="text-center text-[9px] mt-3 opacity-30"
              style={{ color: selectedFrame.textColor }}
            >
              Powered by FeedBites
            </p>
          </div>
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #qr-print-card, #qr-print-card * { visibility: visible; }
          #qr-print-card {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            box-shadow: none !important;
          }
          @page {
            size: A5 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
