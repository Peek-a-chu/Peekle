'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHiddenRoute = pathname.startsWith('/cs/stage/');

  return (
    <div className={`flex min-w-0 flex-1 flex-col ${isHiddenRoute ? '' : 'lg:ml-[240px]'}`}>
      {children}
    </div>
  );
}
