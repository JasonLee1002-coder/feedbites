'use client';

import { useState, useRef, useEffect } from 'react';
import { qrFrames, type QrFrame } from '@/lib/qr-frames';
import { Upload, Check, Save, Loader2, ImageIcon, Palette, Store, Users, UserPlus, X, Mail, Clock, LogOut, Crown, Trash2, AlertTriangle, Sparkles, MapPin, BarChart3 } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  email: string;
  joined_at: string;
}

interface Invite {
  id: string;
  email: string;
  created_at: string;
}

interface MembersData {
  owner: { user_id: string; email: string };
  members: Member[];
  invites: Invite[];
}

interface StoreMetadata {
  cuisine_type: string;
  city: string;
  district: string;
  price_range: string;
  seating_capacity: number | null;
  opening_year: number | null;
  target_audience: string;
  service_type: string;
}

interface Props {
  storeId: string;
  storeName: string;
  logoUrl: string | null;
  avatarUrl: string | null;
  frameId: string;
  isOwner: boolean;
  metadata?: StoreMetadata;
}

const CUISINE_TYPES = ['日料', '中餐', '西餐', '韓式', '泰式', '咖啡廳', '餐酒館', '酒吧', '甜點', '海鮮', '夜市小吃', '早午餐', '火鍋', '燒烤', '素食', '其他'];
const PRICE_RANGES = ['100 以下', '100-300', '300-600', '600-1000', '1000 以上'];
const TARGET_AUDIENCES = ['上班族', '白領族', '學生', '家庭', '觀光客', '外國人', '商務', '約會情侶', '銀髮族', '親子'];
const SERVICE_TYPES = ['內用', '外帶', '外送', '內用+外帶', '複合式'];

export default function StoreSettingsClient({ storeId, storeName, logoUrl: initialLogo, avatarUrl: initialAvatar, frameId: initialFrameId, isOwner, metadata: initialMetadata }: Props) {
  const [editStoreName, setEditStoreName] = useState(storeName);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogo);
  const [selectedFrameId, setSelectedFrameId] = useState(initialFrameId);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store metadata
  const [meta, setMeta] = useState<StoreMetadata>(initialMetadata || {
    cuisine_type: '', city: '', district: '', price_range: '',
    seating_capacity: null, opening_year: null, target_audience: '', service_type: '',
  });
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaSaved, setMetaSaved] = useState(false);
  const [storeAddress, setStoreAddress] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [areaInsight, setAreaInsight] = useState('');

  const metaFilled = [meta.cuisine_type, meta.city, meta.price_range, meta.service_type].filter(Boolean).length;
  const metaTotal = 4;

  async function handleAnalyzeLocation() {
    if (!storeAddress.trim()) return;
    setAnalyzing(true);
    setAreaInsight('');
    try {
      const res = await fetch('/api/ai/analyze-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: storeAddress.trim(), storeName }),
      });
      if (!res.ok) throw new Error('分析失敗');
      const data = await res.json();
      setMeta(m => ({
        ...m,
        city: data.city || m.city,
        district: data.district || m.district,
        target_audience: data.suggested_audience || m.target_audience,
        price_range: data.suggested_price_range || m.price_range,
        cuisine_type: data.suggested_cuisine || m.cuisine_type,
      }));
      if (data.area_insight) setAreaInsight(data.area_insight);
    } catch { /* ignore */ } finally {
      setAnalyzing(false);
    }
  }

  async function handleMetaSave() {
    setMetaSaving(true);
    try {
      const res = await fetch('/api/stores/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
      });
      if (res.ok) {
        setMetaSaved(true);
        setTimeout(() => setMetaSaved(false), 3000);
      }
    } catch { /* ignore */ } finally {
      setMetaSaving(false);
    }
  }

  // Member management state
  const [membersData, setMembersData] = useState<MembersData | null>(null);
  const [membersLoading, setMembersLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [memberMsg, setMemberMsg] = useState('');
  const [memberError, setMemberError] = useState('');

  const selectedFrame = qrFrames.find(f => f.id === selectedFrameId) || qrFrames[0];

  // Load members
  useEffect(() => {
    fetchMembers();
  }, [storeId]);

  async function fetchMembers() {
    setMembersLoading(true);
    try {
      const res = await fetch('/api/stores/members');
      if (res.ok) {
        const data = await res.json();
        setMembersData(data);
      }
    } catch {
      // silently fail — members section just won't show data
    } finally {
      setMembersLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setMemberError('');
    setMemberMsg('');

    try {
      const res = await fetch('/api/stores/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.status === 'added') {
        setMemberMsg(`已將 ${data.email} 加入為成員`);
      } else {
        setMemberMsg(`已邀請 ${data.email}（對方註冊後會自動加入）`);
      }
      setInviteEmail('');
      fetchMembers();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : '邀請失敗');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(memberId: string, email: string) {
    if (!confirm(`確定要移除 ${email}？`)) return;
    setMemberError('');
    try {
      const res = await fetch('/api/stores/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchMembers();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : '移除失敗');
    }
  }

  async function handleCancelInvite(inviteId: string) {
    setMemberError('');
    try {
      const res = await fetch('/api/stores/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchMembers();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : '取消失敗');
    }
  }

  async function handleLeaveStore() {
    if (!confirm('確定要退出這家店？退出後將無法管理此店家。')) return;
    setMemberError('');
    try {
      const res = await fetch('/api/stores/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfLeave: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      window.location.href = '/dashboard';
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : '退出失敗');
    }
  }

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

  async function handleSaveAll() {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      // Save frame + store name + metadata all at once
      const res = await fetch('/api/stores/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frame_id: selectedFrameId,
          store_name: editStoreName.trim() || storeName,
          ...meta,
        }),
      });

      if (!res.ok) throw new Error('儲存失敗');

      setSaved(true);
      setMetaSaved(true);
      setTimeout(() => { setSaved(false); setMetaSaved(false); }, 3000);

      // Reload if store name changed
      if (editStoreName.trim() && editStoreName.trim() !== storeName) {
        setTimeout(() => window.location.reload(), 500);
      }
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

      {/* ═══ Store Name ═══ */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6 mb-6">
        <h2 className="font-bold text-[#3A3A3A] mb-3 flex items-center gap-2">
          <Store className="w-4 h-4 text-[#C5A55A]" />
          餐廳名稱
        </h2>
        <input
          type="text"
          value={editStoreName}
          onChange={e => setEditStoreName(e.target.value)}
          placeholder="輸入你的餐廳名稱"
          className="w-full px-4 py-2.5 rounded-xl border border-[#E8E2D8] text-base font-bold outline-none focus:border-[#C5A55A] focus:ring-2 focus:ring-[#C5A55A]/20 bg-[#FAF7F2] font-serif text-[#3A3A3A]"
        />
      </div>

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

      {/* ═══ Store Profile (Big Data) ═══ */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#C5A55A]" />
            <h2 className="font-bold text-[#3A3A3A]">店家資料</h2>
          </div>
          <span className="text-[10px] px-2 py-1 bg-[#FF8C00]/10 text-[#FF8C00] rounded-full">
            {metaFilled}/{metaTotal} 已填寫
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Address + auto-analyze */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">
              <MapPin className="w-3 h-3 inline mr-1" />
              店家地址或名稱
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={storeAddress}
                onChange={e => setStoreAddress(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyzeLocation()}
                placeholder="輸入地址或店名，副店長幫你自動填寫以下欄位"
                className="flex-1 px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] bg-[#FAF7F2]"
              />
              <button
                onClick={handleAnalyzeLocation}
                disabled={analyzing || !storeAddress.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#C5A55A] text-white text-xs font-medium rounded-lg hover:bg-[#A08735] transition-colors disabled:opacity-50 shrink-0"
              >
                {analyzing ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />分析中</>
                ) : (
                  '自動填寫'
                )}
              </button>
            </div>
            {areaInsight && (
              <p className="text-[11px] text-[#8A8585] mt-1.5 flex items-center gap-1">
                🍽️ {areaInsight}
              </p>
            )}
          </div>

          {/* Cuisine Type */}
          <div>
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">料理類型 *</label>
            <div className="flex flex-wrap gap-1.5">
              {CUISINE_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setMeta(m => ({ ...m, cuisine_type: m.cuisine_type === t ? '' : t }))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                    meta.cuisine_type === t
                      ? 'bg-[#C5A55A] text-white'
                      : 'bg-[#FAF7F2] text-[#8A8585] border border-[#E8E2D8] hover:border-[#C5A55A]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">平均客單價 (NT$) *</label>
            <div className="flex flex-wrap gap-1.5">
              {PRICE_RANGES.map(p => (
                <button
                  key={p}
                  onClick={() => setMeta(m => ({ ...m, price_range: m.price_range === p ? '' : p }))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                    meta.price_range === p
                      ? 'bg-[#C5A55A] text-white'
                      : 'bg-[#FAF7F2] text-[#8A8585] border border-[#E8E2D8] hover:border-[#C5A55A]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">
              <MapPin className="w-3 h-3 inline mr-1" />
              城市 *
            </label>
            <input
              type="text"
              value={meta.city}
              onChange={e => setMeta(m => ({ ...m, city: e.target.value }))}
              placeholder="例如：高雄市"
              className="w-full px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] bg-[#FAF7F2]"
            />
          </div>

          {/* District */}
          <div>
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">區域 / 商圈</label>
            <input
              type="text"
              value={meta.district}
              onChange={e => setMeta(m => ({ ...m, district: e.target.value }))}
              placeholder="例如：駁二特區、信義區"
              className="w-full px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] bg-[#FAF7F2]"
            />
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">服務類型 *</label>
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_TYPES.map(s => (
                <button
                  key={s}
                  onClick={() => setMeta(m => ({ ...m, service_type: m.service_type === s ? '' : s }))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                    meta.service_type === s
                      ? 'bg-[#C5A55A] text-white'
                      : 'bg-[#FAF7F2] text-[#8A8585] border border-[#E8E2D8] hover:border-[#C5A55A]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">主要客群</label>
            <div className="flex flex-wrap gap-1.5">
              {TARGET_AUDIENCES.map(a => (
                <button
                  key={a}
                  onClick={() => setMeta(m => ({ ...m, target_audience: m.target_audience === a ? '' : a }))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors ${
                    meta.target_audience === a
                      ? 'bg-[#C5A55A] text-white'
                      : 'bg-[#FAF7F2] text-[#8A8585] border border-[#E8E2D8] hover:border-[#C5A55A]'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Seating */}
          <div>
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">座位數</label>
            <input
              type="number"
              value={meta.seating_capacity ?? ''}
              onChange={e => setMeta(m => ({ ...m, seating_capacity: e.target.value ? Number(e.target.value) : null }))}
              placeholder="例如：40"
              className="w-full px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] bg-[#FAF7F2]"
            />
          </div>

          {/* Opening Year */}
          <div>
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">開業年份</label>
            <input
              type="number"
              value={meta.opening_year ?? ''}
              onChange={e => setMeta(m => ({ ...m, opening_year: e.target.value ? Number(e.target.value) : null }))}
              placeholder="例如：2020"
              className="w-full px-3 py-2 rounded-lg border border-[#E8E2D8] text-sm outline-none focus:border-[#C5A55A] bg-[#FAF7F2]"
            />
          </div>
        </div>

      </div>

      {/* ═══ Save All ═══ */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-8 py-3 text-white text-sm font-bold rounded-xl transition-all shadow-md ${
            saved
              ? 'bg-emerald-500'
              : 'bg-[#C5A55A] hover:bg-[#A08735]'
          } disabled:opacity-50`}
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" />儲存中...</>
          ) : saved ? (
            <><Check className="w-4 h-4" />已儲存！</>
          ) : (
            <><Save className="w-4 h-4" />儲存所有設定</>
          )}
        </button>
      </div>

      {/* ═══ Member Management ═══ */}
      <div className="bg-white rounded-2xl border border-[#E8E2D8] p-6 mb-6">
        <h2 className="font-bold text-[#3A3A3A] mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#C5A55A]" />
          成員管理
        </h2>
        <p className="text-xs text-[#8A8585] mb-4">
          邀請夥伴或店員一起管理這家店，所有成員擁有相同權限
        </p>

        {memberError && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
            {memberError}
          </div>
        )}
        {memberMsg && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-100">
            {memberMsg}
          </div>
        )}

        {/* Invite form */}
        <form onSubmit={handleInvite} className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8585]" />
            <input
              type="email"
              placeholder="輸入對方的 Email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-[#E8E2D8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A55A]/30 focus:border-[#C5A55A]"
            />
          </div>
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C5A55A] text-white text-sm font-medium rounded-xl hover:bg-[#A08735] transition-colors disabled:opacity-50 shrink-0"
          >
            {inviting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            邀請
          </button>
        </form>

        {/* Members list */}
        {membersLoading ? (
          <div className="flex items-center justify-center py-8 text-[#8A8585]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            載入中...
          </div>
        ) : membersData ? (
          <div className="space-y-2">
            {/* Owner */}
            <div className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C5A55A]/10 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-[#C5A55A]" />
                </div>
                <div>
                  <div className="text-sm font-medium text-[#3A3A3A]">{membersData.owner.email}</div>
                  <div className="text-[10px] text-[#8A8585]">建立者</div>
                </div>
              </div>
            </div>

            {/* Members */}
            {membersData.members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#3A3A3A]">{member.email}</div>
                    <div className="text-[10px] text-[#8A8585]">
                      加入於 {new Date(member.joined_at).toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.id, member.email)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="移除成員"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Pending invites */}
            {membersData.invites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-dashed border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#3A3A3A]">{invite.email}</div>
                    <div className="text-[10px] text-amber-600">等待註冊中</div>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelInvite(invite.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="取消邀請"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {membersData.members.length === 0 && membersData.invites.length === 0 && (
              <p className="text-sm text-[#8A8585] text-center py-4">
                目前沒有其他成員，邀請夥伴一起管理吧
              </p>
            )}
          </div>
        ) : null}

        {/* Leave store button (for non-owners) */}
        {!isOwner && (
          <div className="mt-6 pt-4 border-t border-[#E8E2D8]">
            <button
              onClick={handleLeaveStore}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-red-600 text-sm font-medium rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出此店家
            </button>
          </div>
        )}
      </div>

      {/* ═══ Danger Zone ═══ */}
      <div className="bg-white rounded-2xl border border-red-200 p-6 mb-6">
        <h2 className="font-bold text-red-600 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          危險區域
        </h2>

        {/* Delete Store */}
        {isOwner && (
          <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-xl mb-3">
            <div>
              <div className="text-sm font-medium text-[#3A3A3A]">刪除此店家</div>
              <div className="text-[10px] text-[#8A8585]">刪除店家及其所有問卷、回覆、折扣碼、菜單資料，無法復原</div>
            </div>
            <button
              onClick={async () => {
                const input = prompt(`確定要刪除「${storeName}」？\n\n請輸入店名「${storeName}」確認刪除：`);
                if (input !== storeName) return;
                try {
                  const res = await fetch('/api/stores/delete', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ storeId }),
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    alert(data.error || '刪除失敗');
                    return;
                  }
                  window.location.href = '/dashboard';
                } catch {
                  alert('刪除失敗');
                }
              }}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-red-600 text-sm font-medium rounded-xl border border-red-300 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              刪除店家
            </button>
          </div>
        )}

        {/* Delete Account */}
        <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-xl">
          <div>
            <div className="text-sm font-medium text-[#3A3A3A]">刪除帳號</div>
            <div className="text-[10px] text-[#8A8585]">刪除帳號及所有擁有的店家資料，無法復原</div>
          </div>
          <button
            onClick={async () => {
              if (!confirm('確定要刪除帳號嗎？所有你擁有的店家和資料都會被永久刪除，此操作無法復原。')) return;
              if (!confirm('最後確認：真的要刪除帳號嗎？')) return;
              try {
                const res = await fetch('/api/auth/delete-account', {
                  method: 'DELETE',
                });
                if (!res.ok) {
                  const data = await res.json();
                  alert(data.error || '刪除失敗');
                  return;
                }
                window.location.href = '/';
              } catch {
                alert('刪除失敗');
              }
            }}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-red-600 text-sm font-medium rounded-xl border border-red-300 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            刪除帳號
          </button>
        </div>
      </div>
    </div>
  );
}
