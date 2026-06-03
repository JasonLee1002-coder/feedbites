'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, Plus, LayoutDashboard, UtensilsCrossed, ClipboardList, Sparkles, Settings } from 'lucide-react';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
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
  { href: '/dashboard',          label: '總覽',    icon: LayoutDashboard },
  { href: '/dashboard/menu',     label: '菜單管理', icon: UtensilsCrossed },
  { href: '/dashboard/surveys',  label: '問卷管理', icon: ClipboardList },
  { href: '/dashboard/insights', label: 'AI 洞察', icon: Sparkles },
  { href: '/dashboard/settings', label: '店家設定', icon: Settings },
];

export default function Sidebar({ storeName, storeId, allStores, avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.refresh();
    window.location.href = '/feedbites/login';
  };

  const handleSwitchStore = (newStoreId: string, name: string) => {
    if (newStoreId === storeId) return;
    const overlay = document.createElement('div');
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#0f172a,#1e293b);animation:fbFadeIn 0.3s ease-out">
        <style>
          @keyframes fbFadeIn{from{opacity:0}to{opacity:1}}
          @keyframes fbBounce{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
          @keyframes fbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
          @keyframes fbDot{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        </style>
        <div style="font-size:4.5rem;animation:fbBounce 0.5s ease-out,fbFloat 2s ease-in-out 0.5s infinite">🏪</div>
        <p style="color:rgba(255,255,255,0.4);font-size:0.875rem;margin:1rem 0 0.5rem">正在切換到</p>
        <h1 style="color:#f97316;font-size:1.75rem;font-weight:bold;animation:fbBounce 0.6s ease-out 0.2s both">${name}</h1>
        <div style="display:flex;gap:0.5rem;margin-top:1rem">
          <div style="width:8px;height:8px;border-radius:50%;background:#f97316;animation:fbDot 1.2s ease-in-out 0s infinite"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:#f97316;animation:fbDot 1.2s ease-in-out 0.25s infinite"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:#f97316;animation:fbDot 1.2s ease-in-out 0.5s infinite"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => {
      window.location.href = `/feedbites/api/stores/select?id=${newStoreId}&returnTo=${encodeURIComponent(pathname)}`;
    }, 1500);
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col h-full" style={{ background: '#141926' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.07]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <span className="text-white font-black text-sm">F</span>
          </div>
          <div>
            <span className="text-white font-black text-lg tracking-tight">Feed<span className="text-orange-400">Bites</span></span>
            <p className="text-white/30 text-[9px] font-medium tracking-widest uppercase leading-none">智慧餐飲問卷</p>
          </div>
        </Link>
      </div>

      {/* Store Selector */}
      <div className="px-3 py-3 border-b border-white/[0.07]">
        <p className="text-white/30 text-[9px] font-semibold uppercase tracking-widest mb-2 px-2">店家</p>
        <div className="space-y-1">
          {allStores.map((s) => {
            const isCurrent = s.id === storeId;
            const isMember = s.role === 'member';
            return isCurrent ? (
              <div key={s.id} className="rounded-xl px-3 py-2.5" style={{ background: isMember ? 'rgba(59,130,246,0.2)' : 'rgba(249,115,22,0.15)', border: `1px solid ${isMember ? 'rgba(59,130,246,0.3)' : 'rgba(249,115,22,0.3)'}` }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-inner"
                    style={{ background: isMember ? 'rgba(59,130,246,0.3)' : 'rgba(249,115,22,0.25)', color: isMember ? '#60a5fa' : '#fb923c' }}>
                    {s.store_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: isMember ? '#93c5fd' : '#fed7aa' }}>{s.store_name}</p>
                    <p className="text-[9px] font-semibold" style={{ color: isMember ? 'rgba(147,197,253,0.6)' : 'rgba(253,215,170,0.6)' }}>
                      {isMember ? '🤝 協作中' : '✓ 目前使用'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <button key={s.id} onClick={() => handleSwitchStore(s.id, s.store_name)}
                className="w-full text-left rounded-xl px-3 py-2.5 transition-all active:scale-[0.98] hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center text-xs font-bold text-white/50">
                    {s.store_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/50 truncate">{s.store_name}</p>
                    <p className="text-[9px] text-white/25">{isMember ? '🤝 點擊切換' : '點擊切換'}</p>
                  </div>
                  <span className="text-white/25 text-xs">›</span>
                </div>
              </button>
            );
          })}
        </div>
        <a href="/dashboard/new-store"
          className="flex items-center gap-2 px-3 py-2 mt-1.5 text-xs font-semibold text-orange-400/70 hover:text-orange-400 hover:bg-orange-500/10 rounded-xl transition-all border border-dashed border-orange-500/20 hover:border-orange-500/40">
          <Plus className="w-3.5 h-3.5" />
          新增店家
        </a>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-white/30 text-[9px] font-semibold uppercase tracking-widest mb-2 px-2">主選單</p>
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all active:scale-[0.97] ${
                active
                  ? 'text-white shadow-lg'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
              }`}
              style={active ? { background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' } : {}}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-white/20' : 'bg-white/[0.06]'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[14px]">{item.label}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/[0.07]">
        <div className="flex items-center gap-2.5 px-2 mb-3">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 shadow-md">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="店長" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-orange-500/30 flex items-center justify-center">
                <span className="text-xs text-orange-300 font-bold">店</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white/80 truncate">店長</p>
            <p className="text-[9px] text-white/30">已登入</p>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-400/70 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all border border-red-500/20 hover:border-red-400/40">
            <LogOut className="w-3 h-3" />
            登出
          </button>
        </div>
        <div className="text-center">
          <a href="/dashboard/feedback" className="text-[9px] text-white/20 hover:text-white/40 transition-colors">
            意見回饋給 FeedBites
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-4 py-3 shadow-sm" style={{ background: '#141926', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-white/60 hover:text-white hover:bg-white/10 active:scale-95 rounded-lg transition-all">
          <Menu className="w-5 h-5" />
        </button>
        <div className="ml-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-xs">F</span>
          </div>
          <span className="text-white font-black text-lg">Feed<span className="text-orange-400">Bites</span></span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-200 shadow-2xl ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`} style={{ background: '#141926' }}>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 shadow-xl" style={{ background: '#141926' }}>
        {navContent}
      </aside>
    </>
  );
}
