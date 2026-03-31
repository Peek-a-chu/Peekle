'use client';

import { useEffect, useState } from 'react';

function useMediaQuery(query: string): boolean {
  const getMatches = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const update = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [query]);

  return matches;
}

const getMaxWidthQuery = (breakpoint: number) => `(max-width: ${Math.max(0, breakpoint - 0.02)}px)`;

export function useIsMobile(breakpoint = 768): boolean {
  return useMediaQuery(getMaxWidthQuery(breakpoint));
}

export function useIsTouchMobile(breakpoint = 768): boolean {
  const query = `${getMaxWidthQuery(breakpoint)} and (hover: none) and (pointer: coarse)`;
  return useMediaQuery(query);
}
