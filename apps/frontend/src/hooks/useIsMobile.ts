'use client';

import { useEffect, useState } from 'react';

export function useIsMobile(breakpoint = 768): boolean {
  const getCurrentIsMobile = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  };

  const [isMobile, setIsMobile] = useState(getCurrentIsMobile);

  useEffect(() => {
    const update = () => setIsMobile(getCurrentIsMobile());

    update();
    window.addEventListener('resize', update);

    return () => window.removeEventListener('resize', update);
  }, [breakpoint]);

  return isMobile;
}
