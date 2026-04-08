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
  { href: '/dashboard', label: '總覽', icon: LayoutDashboard, emoji: '🏠' },
  { href: '/dashboard/menu', label: '菜單管理', icon: UtensilsCrossed, emoji: '🍽️' },
  { href: '/dashboard/surveys', label: '問卷管理', icon: ClipboardList, emoji: '📋' },
  { href: '/dashboard/insights', label: 'AI 洞察', icon: Brain, emoji: '🧠' },
  { href: '/dashboard/settings', label: '店家設定', icon: Settings, emoji: '⚙️' },
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

  const handleSwitchStore = (newStoreId: string) => {
    if (newStoreId === storeId || switching) return;
    const targetStore = allStores.find(s => s.id === newStoreId);
    const name = targetStore?.store_name || '';

    // Create transition overlay via DOM — works reliably on all devices
    const overlay = document.createElement('div');
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e,#16213e);animation:fbFadeIn 0.3s ease-out">
        <style>
          @keyframes fbFadeIn{from{opacity:0}to{opacity:1}}
          @keyframes fbBounce{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
          @keyframes fbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
          @keyframes fbDot{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        </style>
        <div style="font-size:4.5rem;animation:fbBounce 0.5s ease-out,fbFloat 2s ease-in-out 0.5s infinite">🏪</div>
        <p style="color:rgba(255,255,255,0.5);font-size:0.875rem;margin:1rem 0 0.5rem">正在切換到</p>
        <h1 style="color:#C5A55A;font-size:1.75rem;font-weight:bold;animation:fbBounce 0.6s ease-out 0.2s both">${name}</h1>
        <div style="display:flex;gap:0.5rem;margin-top:1rem">
          <div style="width:10px;height:10px;border-radius:50%;background:#C5A55A;animation:fbDot 1.2s ease-in-out 0s infinite"></div>
          <div style="width:10px;height:10px;border-radius:50%;background:#C5A55A;animation:fbDot 1.2s ease-in-out 0.25s infinite"></div>
          <div style="width:10px;height:10px;border-radius:50%;background:#C5A55A;animation:fbDot 1.2s ease-in-out 0.5s infinite"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Navigate after transition
    setTimeout(() => {
      window.location.href = `/api/stores/select?id=${newStoreId}`;
    }, 1500);
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const hasMultipleStores = allStores.length > 1;

  const currentStoreRole = allStores.find(s => s.id === storeId)?.role;
  const isCurrentCollab = currentStoreRole === 'member';

  const storeSelector = (
    <div className="px-3 py-3 border-b border-[#E8E2D8]">
      {/* All stores — always visible, no dropdown needed */}
      <div className="space-y-1.5">
        {allStores.map((s) => {
          const isCurrent = s.id === storeId;
          const isMember = s.role === 'member';
          return isCurrent ? (
            <div
              key={s.id}
              className={`rounded-xl p-2.5 ${
                isMember
                  ? 'bg-blue-50 border-2 border-blue-200'
                  : 'bg-[#C5A55A]/5 border-2 border-[#C5A55A]/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                  isMember ? 'bg-blue-100 text-blue-600' : 'bg-[#C5A55A]/15 text-[#C5A55A]'
                }`}>
                  {s.store_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#3A3A3A] truncate">{s.store_name}</p>
                  <p className={`text-[9px] font-medium ${isMember ? 'text-blue-500' : 'text-[#C5A55A]'}`}>
                    {isMember ? '🤝 協作中' : '👑 目前'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <a
              key={s.id}
              href={`/api/stores/select?id=${s.id}&returnTo=${encodeURIComponent(pathname)}`}
              className={`block rounded-xl p-2.5 transition-all hover:translate-x-0.5 ${
                isMember
                  ? 'hover:bg-blue-50/50 border border-transparent hover:border-blue-200/50'
                  : 'hover:bg-[#FAF7F2] border border-transparent hover:border-[#E8E2D8]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                  isMember ? 'bg-blue-50 text-blue-400' : 'bg-gray-100 text-gray-400'
                }`}>
                  {s.store_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#8A8585] truncate">{s.store_name}</p>
                  <p className={`text-[9px] ${isMember ? 'text-blue-400' : 'text-[#8A8585]'}`}>
                    {isMember ? '🤝 點擊切換' : '點擊切換'}
                  </p>
                </div>
                <span className="text-[10px] text-[#8A8585]">→</span>
              </div>
            </a>
          );
        })}
      </div>

      {/* New store link */}
      <a
        href="/dashboard/new-store"
        className="flex items-center gap-2 px-2.5 py-2 mt-2 text-xs text-[#8A8585] hover:text-[#C5A55A] hover:bg-[#FAF7F2] rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        新增店家
      </a>
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
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-gradient-to-r from-[#C5A55A]/15 to-[#C5A55A]/5 text-[#A08735] shadow-sm border border-[#C5A55A]/20'
                  : 'text-[#8A8585] hover:bg-[#FAF7F2] hover:text-[#3A3A3A] hover:translate-x-0.5'
              }`}
            >
              <span className="text-lg">{item.emoji}</span>
              {item.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C5A55A]" />}
            </Link>
          );
        })}
      </nav>

      {/* Feedback — at bottom */}
      <div className="px-3 pb-2">
        <Link
          href="/dashboard/feedback"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
            isActive('/dashboard/feedback')
              ? 'bg-gradient-to-r from-[#C5A55A]/15 to-[#C5A55A]/5 text-[#A08735] shadow-sm border border-[#C5A55A]/20'
              : 'text-[#8A8585] hover:bg-[#FAF7F2] hover:text-[#3A3A3A] hover:translate-x-0.5'
          }`}
        >
          <span className="text-lg">📮</span>
          問題回報
          {isActive('/dashboard/feedback') && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C5A55A]" />}
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
