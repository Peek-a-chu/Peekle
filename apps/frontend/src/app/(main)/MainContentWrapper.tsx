'use client';

import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isCsAddMode = pathname === '/cs' && searchParams.get('mode') === 'add';
  const isCsReviewRoute =
    pathname.startsWith('/cs/wrong-notes/review') ||
    pathname.startsWith('/cs/wrong-problems/review');
  const isHiddenRoute = pathname.startsWith('/cs/stage/') || isCsAddMode || isCsReviewRoute;

  return (
    <div className={`flex min-w-0 flex-1 flex-col ${isHiddenRoute ? '' : 'lg:ml-[240px]'}`}>
      {children}
    </div>
  );
}
