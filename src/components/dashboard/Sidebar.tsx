'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, LogOut, Menu, Settings, ChevronDown, Plus, Store, UtensilsCrossed, MessageSquareWarning, Brain } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface StoreInfo {
  id: string;
  store_name: string;
  logo_url?: string | null;
  role?: 'owner' | 'member';
}

interface SidebarProps {
  storeName: string;
  storeId: string;
  allStores: StoreInfo[];
  avatarUrl?: string | null;
}

const navItems = [
  { href: '/dashboard', label: '總覽', icon: LayoutDashboard },
  { href: '/dashboard/menu', label: '菜單管理', icon: UtensilsCrossed },
  { href: '/dashboard/surveys', label: '問卷管理', icon: ClipboardList },
  { href: '/dashboard/insights', label: 'AI 洞察分析', icon: Brain },
  { href: '/dashboard/settings', label: '店家設定', icon: Settings },
];

export default function Sidebar({ storeName, storeId, allStores, avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchingName, setSwitchingName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStoreDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    window.location.href = '/login';
  };

  const handleSwitchStore = async (newStoreId: string) => {
    if (newStoreId === storeId || switching) return;
    const targetStore = allStores.find(s => s.id === newStoreId);
    setSwitching(true);
    setSwitchingName(targetStore?.store_name || '');
    setStoreDropdownOpen(false);
    setMobileOpen(false);
    try {
      await fetch('/api/stores/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: newStoreId }),
      });
      // Delay to show the transition screen, then force reload with cache bust
      setTimeout(() => {
        window.location.href = '/dashboard?t=' + Date.now();
      }, 1200);
    } catch {
      setSwitching(false);
      setSwitchingName('');
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const hasMultipleStores = allStores.length > 1;

  const currentStoreRole = allStores.find(s => s.id === storeId)?.role;
  const isCurrentCollab = currentStoreRole === 'member';

  const storeSelector = (
    <div className="px-3 py-3 border-b border-[#E8E2D8]" ref={dropdownRef}>
      {/* Current store — prominent display */}
      <button
        onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
        className={`w-full rounded-xl p-3 text-left transition-all ${
          isCurrentCollab
            ? 'bg-blue-50 border-2 border-blue-200 hover:border-blue-300'
            : 'bg-[#C5A55A]/5 border-2 border-[#C5A55A]/20 hover:border-[#C5A55A]/40'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
            isCurrentCollab
              ? 'bg-blue-100 text-blue-600'
              : 'bg-[#C5A55A]/15 text-[#C5A55A]'
          }`}>
            {storeName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#3A3A3A] truncate">{storeName}</p>
            <p className={`text-[10px] font-medium ${isCurrentCollab ? 'text-blue-500' : 'text-[#C5A55A]'}`}>
              {isCurrentCollab ? '🤝 協作中' : '👑 我的店'}
            </p>
          </div>
          {hasMultipleStores && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-5 h-5 rounded-full bg-[#C5A55A] text-white text-[10px] font-bold flex items-center justify-center">
                {allStores.length}
              </span>
              <ChevronDown className={`w-4 h-4 text-[#8A8585] transition-transform ${storeDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          )}
        </div>
      </button>

      {/* Dropdown — store list */}
      {storeDropdownOpen && (
        <div className="mt-2 bg-white rounded-xl border border-[#E8E2D8] shadow-xl overflow-hidden">
          <div className="px-3 py-2 bg-[#FAF7F2] border-b border-[#E8E2D8]">
            <p className="text-[10px] font-bold text-[#8A8585]">🔄 切換店家</p>
          </div>
          {allStores.map((s) => {
            const isCurrent = s.id === storeId;
            const isMember = s.role === 'member';
            return (
              <button
                key={s.id}
                onClick={() => handleSwitchStore(s.id)}
                disabled={switching || isCurrent}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left text-sm transition-all ${
                  isCurrent
                    ? 'bg-[#C5A55A]/10 cursor-default'
                    : 'hover:bg-[#FAF7F2] hover:pl-4'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                  isMember ? 'bg-blue-50 text-blue-500 border border-blue-200' : 'bg-[#C5A55A]/10 text-[#C5A55A] border border-[#C5A55A]/20'
                }`}>
                  {s.store_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block text-[#3A3A3A]">{s.store_name}</span>
                  <span className={`text-[9px] font-medium ${isMember ? 'text-blue-500' : 'text-[#8A8585]'}`}>
                    {isMember ? '🤝 受邀協作' : '👑 我的店'}
                  </span>
                </div>
                {isCurrent && (
                  <span className="text-xs text-[#C5A55A] font-bold">目前 ✓</span>
                )}
                {!isCurrent && (
                  <span className="text-[10px] text-[#8A8585] opacity-0 group-hover:opacity-100">切換 →</span>
                )}
              </button>
            );
          })}
          <Link
            href="/dashboard/new-store"
            onClick={() => { setStoreDropdownOpen(false); setMobileOpen(false); }}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#8A8585] hover:bg-[#FAF7F2] border-t border-[#E8E2D8] transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增店家
          </Link>
        </div>
      )}
    </div>
  );

  const navContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-6">
        <Link href="/dashboard" className="text-xl font-bold text-[#3A3A3A] font-serif">
          Feed<span className="text-[#C5A55A]">Bites</span>
        </Link>
      </div>

      {/* Store Selector */}
      {storeSelector}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#C5A55A]/10 text-[#A08735]'
                  : 'text-[#8A8585] hover:bg-[#FAF7F2] hover:text-[#3A3A3A]'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Feedback — prominent, at bottom */}
      <div className="px-3 pb-2">
        <Link
          href="/dashboard/feedback"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${
            isActive('/dashboard/feedback')
              ? 'bg-[#C5A55A] text-white shadow-md shadow-[#C5A55A]/20'
              : 'bg-[#C5A55A]/10 text-[#A08735] hover:bg-[#C5A55A]/20'
          }`}
        >
          <span className="text-lg">💬</span>
          聊聊，我們幫你想辦法
        </Link>
      </div>

      {/* User section */}
      <div className="px-4 py-4 border-t border-[#E8E2D8]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#C5A55A]/10 flex items-center justify-center shrink-0 overflow-hidden border-2 border-[#C5A55A]/20">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="店長" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-[#C5A55A]">👤</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#3A3A3A] truncate">店長</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-[#8A8585] hover:text-[#A08735] hover:bg-[#C5A55A]/10 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            登出
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ═══ Store Switch Transition Screen ═══ */}
      {switching && switchingName && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes bounceIn { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
            @keyframes floatUp { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
            @keyframes dotPulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
          `}</style>
          <div className="text-7xl mb-6" style={{ animation: 'bounceIn 0.5s ease-out, floatUp 2s ease-in-out 0.5s infinite' }}>🏪</div>
          <p className="text-white/50 text-sm mb-2">正在切換到</p>
          <h1 className="text-3xl font-bold font-serif mb-4" style={{ color: '#C5A55A', animation: 'bounceIn 0.6s ease-out 0.2s both' }}>{switchingName}</h1>
          <div className="flex gap-2 mt-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: '#C5A55A',
                  animation: `dotPulse 1.2s ease-in-out ${i * 0.25}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-4 py-3 bg-white border-b border-[#E8E2D8]">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-[#3A3A3A] hover:bg-[#FAF7F2] rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="ml-3 text-lg font-bold text-[#3A3A3A] font-serif">
          Feed<span className="text-[#C5A55A]">Bites</span>
        </span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/20"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E8E2D8] flex flex-col transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-[#E8E2D8]">
        {navContent}
      </aside>
    </>
  );
}
