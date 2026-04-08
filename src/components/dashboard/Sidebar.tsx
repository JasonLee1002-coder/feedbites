'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, LogOut, Menu, Settings, Plus, UtensilsCrossed, MessageSquareWarning, Brain } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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
  { href: '/dashboard',          label: '總覽',    icon: LayoutDashboard,      emoji: '🏠' },
  { href: '/dashboard/menu',     label: '菜單管理', icon: UtensilsCrossed,      emoji: '🍽️' },
  { href: '/dashboard/surveys',  label: '問卷管理', icon: ClipboardList,        emoji: '📋' },
  { href: '/dashboard/insights', label: 'AI 洞察', icon: Brain,                emoji: '🧠' },
  { href: '/dashboard/settings', label: '店家設定', icon: Settings,             emoji: '⚙️' },
];

export default function Sidebar({ storeName, storeId, allStores, avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        // nothing needed
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

  const handleSwitchStore = (newStoreId: string, name: string) => {
    if (newStoreId === storeId) return;
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
    setTimeout(() => {
      window.location.href = `/api/stores/select?id=${newStoreId}&returnTo=${encodeURIComponent(pathname)}`;
    }, 1500);
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const storeSelector = (
    <div className="px-3 py-3 border-b border-[#E8E2D8]">
      <div className="space-y-1.5">
        {allStores.map((s) => {
          const isCurrent = s.id === storeId;
          const isMember = s.role === 'member';
          return isCurrent ? (
            <div
              key={s.id}
              className={`rounded-xl p-2.5 ${
                isMember
                  ? 'bg-blue-100 border-2 border-blue-300'
                  : 'bg-[#C5A55A] border-2 border-[#A08735]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm ${
                  isMember ? 'bg-blue-200 text-blue-700' : 'bg-white/30 text-white'
                }`}>
                  {s.store_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isMember ? 'text-blue-800' : 'text-white'}`}>
                    {s.store_name}
                  </p>
                  <p className={`text-[9px] font-semibold ${isMember ? 'text-blue-500' : 'text-white/80'}`}>
                    {isMember ? '🤝 協作中' : '👑 目前使用'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <button
              key={s.id}
              onClick={() => handleSwitchStore(s.id, s.store_name)}
              className={`w-full text-left rounded-xl p-2.5 transition-all active:scale-[0.98] border ${
                isMember
                  ? 'border-blue-200 hover:bg-blue-50 hover:border-blue-300'
                  : 'border-[#E8E2D8] hover:bg-[#F5EFE6] hover:border-[#C5A55A]/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                  isMember ? 'bg-blue-50 text-blue-400' : 'bg-gray-100 text-gray-500'
                }`}>
                  {s.store_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#5A5050] truncate">{s.store_name}</p>
                  <p className={`text-[9px] font-medium ${isMember ? 'text-blue-400' : 'text-[#A09090]'}`}>
                    {isMember ? '🤝 點擊切換' : '點擊切換'}
                  </p>
                </div>
                <span className="text-[#C5A55A] font-bold text-sm">›</span>
              </div>
            </button>
          );
        })}
      </div>

      <a
        href="/dashboard/new-store"
        className="flex items-center gap-2 px-2.5 py-2 mt-2 text-xs font-semibold text-[#C5A55A] hover:text-white hover:bg-[#C5A55A] rounded-lg transition-all active:scale-[0.97] border border-dashed border-[#C5A55A]/40 hover:border-[#C5A55A]"
      >
        <Plus className="w-3.5 h-3.5" />
        新增店家
      </a>
    </div>
  );

  const navContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#E8E2D8]">
        <Link href="/dashboard" className="text-xl font-black text-[#3A3A3A] font-serif tracking-tight">
          Feed<span className="text-[#C5A55A]">Bites</span>
        </Link>
        <p className="text-[9px] text-[#B0A898] mt-0.5 font-medium tracking-wider uppercase">智慧餐飲問卷</p>
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
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${
                active
                  ? 'bg-[#C5A55A] text-white shadow-md shadow-[#C5A55A]/30 translate-x-0.5'
                  : 'text-[#5A5050] hover:bg-[#F5EFE6] hover:text-[#3A3A3A] hover:translate-x-1'
              }`}
            >
              <span className="text-lg leading-none">{item.emoji}</span>
              <span className="flex-1">{item.label}</span>
              {active && (
                <span className="w-2 h-2 rounded-full bg-white/70 shadow-inner" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Feedback */}
      <div className="px-3 pb-2">
        <Link
          href="/dashboard/feedback"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${
            isActive('/dashboard/feedback')
              ? 'bg-[#C5A55A] text-white shadow-md shadow-[#C5A55A]/30'
              : 'text-[#5A5050] hover:bg-[#F5EFE6] hover:text-[#3A3A3A] hover:translate-x-1'
          }`}
        >
          <span className="text-lg leading-none">📮</span>
          <span className="flex-1">問題回報</span>
          {isActive('/dashboard/feedback') && (
            <span className="w-2 h-2 rounded-full bg-white/70 shadow-inner" />
          )}
        </Link>
      </div>

      {/* User section */}
      <div className="px-4 py-4 border-t border-[#E8E2D8]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#C5A55A] flex items-center justify-center shrink-0 overflow-hidden border-2 border-[#A08735] shadow-sm">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="店長" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-white font-bold">👤</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#3A3A3A] truncate">店長</p>
              <p className="text-[9px] text-[#A09090]">已登入</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all active:scale-95 border border-red-200 hover:border-red-500"
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-4 py-3 bg-white border-b border-[#E8E2D8] shadow-sm">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-[#3A3A3A] hover:bg-[#F5EFE6] active:scale-95 rounded-lg transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="ml-3 text-lg font-black text-[#3A3A3A] font-serif">
          Feed<span className="text-[#C5A55A]">Bites</span>
        </span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E8E2D8] flex flex-col transform transition-transform duration-200 shadow-xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-[#E8E2D8] shadow-sm">
        {navContent}
      </aside>
    </>
  );
}
