'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';
import { NAV_ITEMS } from './Sidebar';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/domains/settings/hooks/useSettingsStore';

const MOBILE_ITEMS = NAV_ITEMS.filter((item) =>
  ['/home', '/study', '/workbooks', '/ranking', '/league', '/search'].includes(item.href),
);

export default function MobileBottomNav() {
  const pathname = usePathname();
  const openModal = useSettingsStore((state) => state.openModal);

  const isItemActive = (href: string) => {
    if (href === '/home') return pathname === '/home';
    return pathname.startsWith(href);
  };

  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <nav className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-2 py-2 no-scrollbar">
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-14 flex-1 shrink-0 flex-col items-center justify-center rounded-lg py-1 text-[10px] font-medium transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="mb-0.5 h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => openModal()}
          className="flex min-w-14 flex-1 shrink-0 flex-col items-center justify-center rounded-lg py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          <Settings className="mb-0.5 h-4 w-4" />
          설정
        </button>
      </nav>
    </div>
  );
}
