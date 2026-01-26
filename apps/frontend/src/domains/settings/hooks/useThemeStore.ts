import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

const hexToHsl = (hex: string): string => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }

    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const ACCENT_COLORS: Record<Exclude<AccentColor, 'custom'>, string> = {
    blue: '221 83% 53%',
    skyblue: '180 100% 35%',
    orange: '32 95% 50%',
    pink: '327 73% 60%',
    green: '132 36% 31%',
    lime: '132 65% 58%', // 부드러운 연두색
};

const ACCENT_SECONDARY: Record<Exclude<AccentColor, 'custom'>, string> = {
    blue: '221 83% 95%',
    skyblue: '180 100% 95%',
    orange: '32 95% 95%',
    pink: '327 73% 96%',
    green: '132 36% 95%',
    lime: '132 65% 95%',
};

const ACCENT_SECONDARY_FOREGROUND: Record<Exclude<AccentColor, 'custom'>, string> = {
    blue: '221 83% 25%',
    skyblue: '180 100% 25%',
    orange: '32 95% 25%',
    pink: '327 73% 25%',
    green: '132 36% 25%',
    lime: '132 65% 25%',
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            mode: 'light',
            accentColor: 'pink',
            customColor: '#326b3d', // 기본 초록색 HEX

            setMode: (mode) => {
                set({ mode });
                if (typeof window !== 'undefined') {
                    const root = window.document.documentElement;
                    if (mode === 'dark') {
                        root.classList.add('dark');
                    } else {
                        root.classList.remove('dark');
                    }
                }
            },

            setAccentColor: (accentColor) => {
                set({ accentColor });
                if (typeof window !== 'undefined') {
                    const root = window.document.documentElement;
                    if (accentColor === 'custom') {
                        const hsl = hexToHsl(get().customColor);
                        const [h, s, l] = hsl.split(' ');
                        root.style.setProperty('--primary', hsl);
                        root.style.setProperty('--secondary', `${h} ${s} 95%`);
                        root.style.setProperty('--secondary-foreground', `${h} ${s} 25%`);
                    } else {
                        root.style.setProperty('--primary', ACCENT_COLORS[accentColor]);
                        root.style.setProperty('--secondary', ACCENT_SECONDARY[accentColor]);
                        root.style.setProperty('--secondary-foreground', ACCENT_SECONDARY_FOREGROUND[accentColor]);
                    }
                }
            },

            setCustomColor: (customColor) => {
                set({ customColor, accentColor: 'custom' });
                if (typeof window !== 'undefined') {
                    const root = window.document.documentElement;
                    const hsl = hexToHsl(customColor);
                    const [h, s, l] = hsl.split(' ');
                    root.style.setProperty('--primary', hsl);
                    root.style.setProperty('--secondary', `${h} ${s} 95%`);
                    root.style.setProperty('--secondary-foreground', `${h} ${s} 25%`);
                }
            },
        }),
        {
            name: 'theme-storage',
        },
    ),
);
