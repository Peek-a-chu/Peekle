'use client';

import { useEffect } from 'react';
import {
  useThemeStore,
  ACCENT_COLORS,
  ACCENT_SECONDARY,
  ACCENT_SECONDARY_FOREGROUND,
} from '@/domains/settings/hooks/useThemeStore';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { mode, accentColor } = useThemeStore();

  // 하이드레이션 불일치 방지 및 테마 재적용
  useEffect(() => {
    const root = window.document.documentElement;

    // 테마 모드 적용 (라이트/다크)
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 액센트 컬러 적용
    if (accentColor === 'custom') {
      // 커스텀 컬러는 store에서 직접 가져와 처리 (이미 store set 함수에서 처리함)
    } else {
      const colorKey = accentColor;
      if (ACCENT_COLORS[colorKey]) {
        root.style.setProperty('--primary', ACCENT_COLORS[colorKey]);
        root.style.setProperty('--secondary', ACCENT_SECONDARY[colorKey]);
        root.style.setProperty('--secondary-foreground', ACCENT_SECONDARY_FOREGROUND[colorKey]);
      }
    }
  }, [mode, accentColor]);

  return <>{children}</>;
};
