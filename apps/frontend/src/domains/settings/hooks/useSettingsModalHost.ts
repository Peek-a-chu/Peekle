'use client';

import { usePathname } from 'next/navigation';

import { useSettingsStore } from '@/domains/settings/hooks/useSettingsStore';

interface UseSettingsModalHostOptions {
  isGlobal?: boolean;
}

export function useSettingsModalHost({ isGlobal = false }: UseSettingsModalHostOptions = {}) {
  const pathname = usePathname();
  const isOpen = useSettingsStore((state) => state.isOpen);
  const shouldSkipGlobalModal =
    isGlobal && (pathname?.startsWith('/study/') || pathname?.startsWith('/game/'));

  return {
    shouldRender: isOpen && !shouldSkipGlobalModal,
  };
}
