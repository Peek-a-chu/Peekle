import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { hexToHsl } from '@/lib/utils';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'blue' | 'skyblue' | 'orange' | 'pink' | 'green' | 'lime' | 'custom';

interface ThemeState {
  mode: ThemeMode;
  accentColor: AccentColor;
  customColor: string; // HEX 색상 코드
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  setCustomColor: (hex: string) => void;
}

const disableTransitions = () => {
  const css = document.createElement('style');
  css.appendChild(
    document.createTextNode(
      `* {
       -webkit-transition: none !important;
       -moz-transition: none !important;
       -ms-transition: none !important;
       -o-transition: none !important;
       transition: none !important;
    }`,
    ),
  );
  document.head.appendChild(css);

  return () => {
    // Force reflow
    (() => window.getComputedStyle(document.body).opacity)();
    // Remove the style tag
    document.head.removeChild(css);
  };
};

export interface AccentColorPreset {
  name: Exclude<AccentColor, 'custom'>;
  label: string;
  hsl: string;
}

export const ACCENT_COLOR_PRESETS: AccentColorPreset[] = [
  { name: 'blue', label: '블루', hsl: '221 83% 53%' },
  { name: 'skyblue', label: '스카이블루', hsl: '180 100% 35%' },
  { name: 'orange', label: '오렌지', hsl: '32 95% 50%' },
  { name: 'pink', label: '핑크', hsl: '327 73% 60%' },
  { name: 'green', label: '그린', hsl: '132 36% 31%' },
  { name: 'lime', label: '라임', hsl: '132 65% 58%' },
];

export const ACCENT_COLORS: Record<
  Exclude<AccentColor, 'custom'>,
  string
> = ACCENT_COLOR_PRESETS.reduce(
  (acc, preset) => ({ ...acc, [preset.name]: preset.hsl }),
  {} as Record<Exclude<AccentColor, 'custom'>, string>,
);

export const ACCENT_SECONDARY: Record<
  Exclude<AccentColor, 'custom'>,
  string
> = ACCENT_COLOR_PRESETS.reduce(
  (acc, preset) => {
    const [h, s] = preset.hsl.split(' ');
    // 핑크 등 특정 컬러의 세컨더리 최적화 (기존 로직 유지)
    const l = preset.name === 'pink' ? '96%' : '95%';
    return { ...acc, [preset.name]: `${h} ${s} ${l}` };
  },
  {} as Record<Exclude<AccentColor, 'custom'>, string>,
);

export const ACCENT_SECONDARY_FOREGROUND: Record<
  Exclude<AccentColor, 'custom'>,
  string
> = ACCENT_COLOR_PRESETS.reduce(
  (acc, preset) => {
    const [h, s] = preset.hsl.split(' ');
    return { ...acc, [preset.name]: `${h} ${s} 25%` };
  },
  {} as Record<Exclude<AccentColor, 'custom'>, string>,
);

const applyThemeVariables = (
  root: HTMLElement,
  variables: { primary: string; secondary: string; foreground: string },
) => {
  root.style.setProperty('--primary', variables.primary);
  root.style.setProperty('--secondary', variables.secondary);
  root.style.setProperty('--secondary-foreground', variables.foreground);
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      accentColor: 'pink',
      customColor: '#E24EA0',

      setMode: (mode) => {
        const cleanup = typeof window !== 'undefined' ? disableTransitions() : null;
        set({ mode });
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;
          if (mode === 'dark') {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
          cleanup?.();
        }
      },

      setAccentColor: (accentColor) => {
        const cleanup = typeof window !== 'undefined' ? disableTransitions() : null;
        set({ accentColor });
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;
          if (accentColor === 'custom') {
            const hsl = hexToHsl(get().customColor);
            const [h, s] = hsl.split(' ');
            applyThemeVariables(root, {
              primary: hsl,
              secondary: `${h} ${s} 95%`,
              foreground: `${h} ${s} 25%`,
            });
          } else {
            applyThemeVariables(root, {
              primary: ACCENT_COLORS[accentColor],
              secondary: ACCENT_SECONDARY[accentColor],
              foreground: ACCENT_SECONDARY_FOREGROUND[accentColor],
            });
          }
          cleanup?.();
        }
      },

      setCustomColor: (customColor) => {
        const cleanup = typeof window !== 'undefined' ? disableTransitions() : null;
        set({ customColor, accentColor: 'custom' });
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;
          const hsl = hexToHsl(customColor);
          const [h, s] = hsl.split(' ');
          applyThemeVariables(root, {
            primary: hsl,
            secondary: `${h} ${s} 95%`,
            foreground: `${h} ${s} 25%`,
          });
          cleanup?.();
        }
      },
    }),
    {
      name: 'theme-storage',
    },
  ),
);
