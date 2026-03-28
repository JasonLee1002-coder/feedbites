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
      // Delay to show the transition screen
      setTimeout(() => {
        window.location.href = '/dashboard';
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

  const storeSelector = (
    <div className="px-4 py-3 border-b border-[#E8E2D8]" ref={dropdownRef}>
      <button
        onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF7F2] transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-[#C5A55A]/10 flex items-center justify-center flex-shrink-0">
          <Store className="w-4 h-4 text-[#C5A55A]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#3A3A3A] truncate">{storeName}</p>
          {hasMultipleStores && (
            <p className="text-[10px] text-[#8A8585]">
              {allStores.find(s => s.id === storeId)?.role === 'member' ? '協作中 · ' : ''}
              {allStores.length} 間店家
            </p>
          )}
        </div>
        {(hasMultipleStores) && (
          <ChevronDown className={`w-4 h-4 text-[#8A8585] transition-transform ${storeDropdownOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {storeDropdownOpen && (
        <div className="mt-1 bg-white rounded-xl border border-[#E8E2D8] shadow-lg overflow-hidden">
          {allStores.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSwitchStore(s.id)}
              disabled={switching}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                s.id === storeId
                  ? 'bg-[#C5A55A]/10 text-[#A08735] font-medium'
                  : 'text-[#3A3A3A] hover:bg-[#FAF7F2]'
              }`}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                s.role === 'member' ? 'bg-blue-50 text-blue-500' : 'bg-[#C5A55A]/10 text-[#C5A55A]'
              }`}>
                {s.store_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="truncate block">{s.store_name}</span>
                {s.role === 'member' && (
                  <span className="text-[9px] text-blue-500">協作中</span>
                )}
              </div>
              {s.id === storeId && (
                <span className="ml-auto text-xs text-[#C5A55A]">✓</span>
              )}
            </button>
          ))}
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
          <MessageSquareWarning className="w-5 h-5" />
          有問題？跟顧問說
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
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e] yuzu-pop-in">
          <div className="text-6xl mb-5" style={{ animation: 'yuzu-float 2s ease-in-out infinite' }}>🏪</div>
          <p className="text-white/60 text-sm mb-2">正在切換到</p>
          <h1 className="text-2xl font-bold text-[#C5A55A] font-serif mb-3">{switchingName}</h1>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-[#C5A55A]"
                style={{
                  animation: 'yuzu-float 1s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
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
