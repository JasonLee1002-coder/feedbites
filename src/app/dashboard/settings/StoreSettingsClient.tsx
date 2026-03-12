'use client';

import { useState, useRef } from 'react';
import { qrFrames, type QrFrame } from '@/lib/qr-frames';
import { Upload, Check, Save, Loader2, ImageIcon, Palette, Store } from 'lucide-react';

interface Props {
  storeId: string;
  storeName: string;
  logoUrl: string | null;
  frameId: string;
}

export default function StoreSettingsClient({ storeId, storeName, logoUrl: initialLogo, frameId: initialFrameId }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogo);
  const [selectedFrameId, setSelectedFrameId] = useState(initialFrameId);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFrame = qrFrames.find(f => f.id === selectedFrameId) || qrFrames[0];

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('檔案太大，最大 2MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const res = await fetch('/api/stores/upload-logo', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '上傳失敗');
      }

      const data = await res.json();
      setLogoUrl(data.logo_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上傳失敗');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/stores/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame_id: selectedFrameId }),
      });

      if (!res.ok) throw new Error('儲存失敗');

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#3A3A3A] font-serif mb-6 flex items-center gap-2">
        <Store className="w-6 h-6 text-[#C5A55A]" />
        店家設定
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {/* ═══ Logo Upload ═══ */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6 mb-6">
        <h2 className="font-bold text-[#3A3A3A] mb-4 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#C5A55A]" />
          店家 Logo
        </h2>
        <p className="text-xs text-[#8A8585] mb-4">
          上傳您的 Logo，會顯示在問卷頁面頂部讓客人看到
        </p>

        <div className="flex items-center gap-6">
          {/* Preview */}
          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#E8E2D8] flex items-center justify-center overflow-hidden bg-[#FAF7F2] shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={storeName} className="w-full h-full object-contain p-2" />
            ) : (
              <div className="text-center">
                <ImageIcon className="w-6 h-6 text-[#8A8585] mx-auto mb-1" />
                <span className="text-[10px] text-[#8A8585]">尚未上傳</span>
              </div>
            )}
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C5A55A] text-white text-sm font-medium rounded-xl hover:bg-[#A08735] transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />上傳中...</>
              ) : (
                <><Upload className="w-4 h-4" />{logoUrl ? '更換 Logo' : '上傳 Logo'}</>
              )}
            </button>
            <p className="text-[10px] text-[#8A8585] mt-2">支援 PNG / JPG / WebP / SVG，最大 2MB</p>
          </div>
        </div>
      </div>

      {/* ═══ Frame Selection ═══ */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6 mb-6">
        <h2 className="font-bold text-[#3A3A3A] mb-4 flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#C5A55A]" />
          問卷底圖風格
        </h2>
        <p className="text-xs text-[#8A8585] mb-4">
          選擇一個底圖風格，會套用在客人填問卷的頁面和 QR Code 列印卡片上
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {qrFrames.map((frame) => {
            const isSelected = selectedFrameId === frame.id;
            return (
              <button
                key={frame.id}
                onClick={() => setSelectedFrameId(frame.id)}
                className={`group relative rounded-xl overflow-hidden transition-all ${
                  isSelected
                    ? 'ring-2 ring-[#C5A55A] ring-offset-2 shadow-lg scale-[1.03]'
                    : 'border border-[#E8E2D8] hover:shadow-md hover:scale-[1.01]'
                }`}
              >
                <div
                  className="aspect-[3/4] flex flex-col items-center justify-center p-2 relative"
                  style={{ background: frame.previewGradient }}
                >
                  {/* Mini inner frame */}
                  <div
                    className="absolute inset-2 rounded-lg border pointer-events-none"
                    style={{ borderColor: frame.accentColor + '40' }}
                  />
                  {/* Mini QR */}
                  <div
                    className="w-8 h-8 rounded border grid grid-cols-3 gap-px p-0.5 relative z-10"
                    style={{ borderColor: frame.accentColor + '30' }}
                  >
                    {[...Array(9)].map((_, i) => (
                      <div
                        key={i}
                        className="rounded-[1px]"
                        style={{
                          background: [0, 2, 6].includes(i)
                            ? frame.accentColor
                            : i % 2 === 0
                            ? frame.accentColor + '60'
                            : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="text-center py-1.5 bg-white">
                  <div className="text-[11px] font-medium text-[#3A3A3A]">{frame.name}</div>
                  <div className="text-[9px] text-[#8A8585]">{frame.description}</div>
                </div>

                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C5A55A] rounded-full flex items-center justify-center shadow z-20">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Preview ═══ */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6 mb-6">
        <h2 className="font-bold text-[#3A3A3A] mb-4">預覽效果</h2>
        <p className="text-xs text-[#8A8585] mb-4">客人掃碼後看到的問卷頂部區域</p>

        <div className="flex justify-center">
          <div
            className="w-[340px] rounded-2xl overflow-hidden shadow-lg"
            style={{ background: selectedFrame.previewGradient }}
          >
            {/* Simulated header area */}
            <div
              className="p-6 text-center relative"
              style={{
                borderBottom: `2px solid ${selectedFrame.accentColor}20`,
              }}
            >
              {/* Corner ornaments */}
              <div className="absolute top-2 left-2 w-6 h-6" style={{ borderTop: `2px solid ${selectedFrame.accentColor}40`, borderLeft: `2px solid ${selectedFrame.accentColor}40` }} />
              <div className="absolute top-2 right-2 w-6 h-6" style={{ borderTop: `2px solid ${selectedFrame.accentColor}40`, borderRight: `2px solid ${selectedFrame.accentColor}40` }} />
              <div className="absolute bottom-2 left-2 w-6 h-6" style={{ borderBottom: `2px solid ${selectedFrame.accentColor}40`, borderLeft: `2px solid ${selectedFrame.accentColor}40` }} />
              <div className="absolute bottom-2 right-2 w-6 h-6" style={{ borderBottom: `2px solid ${selectedFrame.accentColor}40`, borderRight: `2px solid ${selectedFrame.accentColor}40` }} />

              <div className="flex items-center justify-center gap-3 mb-2">
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={storeName} className="h-10 object-contain" />
                )}
                <div>
                  <div className="text-lg font-bold font-serif" style={{ color: selectedFrame.textColor }}>
                    {storeName}
                  </div>
                  <div className="text-xs" style={{ color: selectedFrame.textColor + '80' }}>
                    體驗回饋問卷
                  </div>
                </div>
              </div>

              {/* Decorative divider */}
              <svg className="w-24 h-3 mx-auto mt-2" viewBox="0 0 100 12" fill="none">
                <line x1="0" y1="6" x2="40" y2="6" stroke={selectedFrame.accentColor} strokeWidth="0.5" opacity="0.4" />
                <path d="M43 6 L50 2 L57 6 L50 10 Z" fill={selectedFrame.accentColor} opacity="0.2" />
                <line x1="60" y1="6" x2="100" y2="6" stroke={selectedFrame.accentColor} strokeWidth="0.5" opacity="0.4" />
              </svg>

              {/* Fake discount badge */}
              <div
                className="mt-3 inline-block px-4 py-1.5 rounded-full text-xs font-medium"
                style={{ background: selectedFrame.accentColor + '15', color: selectedFrame.accentColor }}
              >
                完成問卷即可獲得優惠折扣
              </div>
            </div>

            {/* Fake question area */}
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl p-3" style={{ background: selectedFrame.textColor + '05' }}>
                  <div className="h-2 rounded-full mb-2" style={{ background: selectedFrame.textColor + '10', width: `${60 + i * 10}%` }} />
                  <div className="flex gap-2">
                    {['😫', '😕', '😐', '😊', '🤩'].map((e, j) => (
                      <div
                        key={j}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                        style={{ background: j === 4 ? selectedFrame.accentColor + '20' : selectedFrame.textColor + '05' }}
                      >
                        {e}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Save Button ═══ */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-6 py-3 text-white text-sm font-bold rounded-xl transition-all shadow-md ${
            saved
              ? 'bg-emerald-500'
              : 'bg-[#C5A55A] hover:bg-[#A08735]'
          } disabled:opacity-50`}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />儲存中...</>
          ) : saved ? (
            <><Check className="w-4 h-4" />已儲存</>
          ) : (
            <><Save className="w-4 h-4" />儲存設定</>
          )}
        </button>
      </div>
    </div>
  );
}
