'use client';

import { usePathname } from 'next/navigation';
import { Home, Users, Gamepad2, BookOpen, Trophy, Medal, Search, Settings, Terminal } from 'lucide-react';

import UserProfileSection from './UserProfileSection';
import SidebarItem from './SidebarItem';
import { useSettingsStore } from '@/domains/settings/hooks/useSettingsStore';
import { UserProfile } from '@/domains/profile/types';

interface SidebarProps {
  user: UserProfile;
}

export const NAV_ITEMS = [
  { icon: Home, label: '메인', href: '/home' },
  { icon: Users, label: '스터디 방', href: '/study' },
  { icon: Gamepad2, label: '게임 방', href: '/game' },
  { icon: BookOpen, label: '문제집', href: '/workbooks' },
  { icon: Terminal, label: 'CS 학습', href: '/cs' },
  { icon: Trophy, label: '랭킹', href: '/ranking' },
  { icon: Medal, label: '리그', href: '/league' },
  { icon: Search, label: '검색', href: '/search' },
] as const;

const Sidebar = ({ user }: SidebarProps) => {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === '/home' && pathname === '/home') return true;
    if (href !== '/home' && pathname.startsWith(href)) return true;
    return false;
  };

  const { openModal, isOpen } = useSettingsStore();

  const isHiddenRoute = pathname.startsWith('/cs/stage/');

  if (isHiddenRoute) {
    return null;
  }

  return (
    <aside className="hidden lg:flex w-[240px] h-screen bg-card border-r border-border flex-col fixed left-0 top-0 z-50 overflow-y-auto font-sans transition-colors duration-300">
      {/* User Logic Section */}
      <div className="mt-6">
        <UserProfileSection initialUser={user} />
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 px-2 space-y-1 mt-2">
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            isActive={isItemActive(item.href)}
          />
        ))}
      </nav>

      {/* Footer Section */}
      <div className="px-2 py-4 mt-auto">
        <SidebarItem icon={Settings} label="설정" onClick={() => openModal()} isActive={isOpen} />
      </div>
    </aside>
  );
};

export default Sidebar;
