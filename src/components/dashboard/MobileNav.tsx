'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/dashboard',          label: '首頁',   icon: '/icons/home.png' },
  { href: '/dashboard/menu',     label: '菜單',   icon: '/icons/menu.png' },
  { href: '/dashboard/surveys',  label: '問卷',   icon: '/icons/survey.png' },
  { href: '/dashboard/insights', label: 'AI洞察', icon: '/icons/insights.png' },
  { href: '/dashboard/settings', label: '設定',   icon: '/icons/settings.png' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/95 backdrop-blur-md border-t border-[#E8E2D8]">
      <div className="flex items-center justify-around px-2 py-1.5 pb-safe">
        {navItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard' || pathname === '/dashboard/'
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[52px]">
              <motion.div
                animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`relative w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-[#FF8C00]/10' : ''}`}
              >
                <Image src={item.icon} alt={item.label} width={28} height={28} className="object-contain" />
                {isActive && (
                  <motion.div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF8C00] rounded-full"
                  />
                )}
              </motion.div>
              <span className={`text-[9px] font-medium ${isActive ? 'text-[#FF8C00]' : 'text-[#8A8585]'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
