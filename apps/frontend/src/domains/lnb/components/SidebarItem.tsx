'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, href, isActive, onClick }: SidebarItemProps) => {
  const content = (
    <>
      <Icon
        size={20}
        className={cn(
          'transition-colors',
          isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground',
        )}
      />
      <span className={cn(
        'transition-colors',
        isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
      )}>
        {label}
      </span>
    </>
  );

  const className = cn(
    'flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 group text-sm font-medium w-[calc(100%-1rem)]',
    isActive
      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href || '#'} className={className}>
      {content}
    </Link>
  );
};

export default SidebarItem;
