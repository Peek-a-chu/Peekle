'use client';

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/domains/settings/hooks/useThemeStore';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const { mode, accentColor } = useThemeStore();
    const [mounted, setMounted] = useState(false);

    // 하이드레이션 불일치 방지를 위해 마운트 시 테마 재적용
    useEffect(() => {
        const root = window.document.documentElement;

        // 테마 모드 적용 (라이트/다크)
        if (mode === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // HEX를 HSL로 변환하는 헬퍼 함수
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
            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            } else { h = s = 0; }
            return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
        };

        // 액센트 컬러 적용
        if (accentColor === 'custom') {
            const customHex = (useThemeStore.getState() as any).customColor || '#326b3d';
            const hsl = hexToHsl(customHex);
            const [h, s] = hsl.split(' ');
            root.style.setProperty('--primary', hsl);
            root.style.setProperty('--secondary', `${h} ${s} 95%`);
            root.style.setProperty('--secondary-foreground', `${h} ${s} 25%`);
        } else {
            const ACCENT_COLORS = {
                blue: '221 83% 53%',
                skyblue: '180 100% 35%',
                orange: '32 95% 50%',
                pink: '327 73% 60%',
                green: '132 36% 31%',
                lime: '132 65% 58%',
            };
            const ACCENT_SECONDARY = {
                blue: '221 83% 95%',
                skyblue: '180 100% 95%',
                orange: '32 95% 95%',
                pink: '327 73% 96%',
                green: '132 36% 95%',
                lime: '132 65% 95%',
            };
            const ACCENT_SECONDARY_FOREGROUND = {
                blue: '221 83% 25%',
                skyblue: '180 100% 25%',
                orange: '32 95% 25%',
                pink: '327 73% 25%',
                green: '132 36% 25%',
                lime: '132 65% 25%',
            };

            const colorKey = accentColor as keyof typeof ACCENT_COLORS;
            root.style.setProperty('--primary', ACCENT_COLORS[colorKey]);
            root.style.setProperty('--secondary', ACCENT_SECONDARY[colorKey]);
            root.style.setProperty('--secondary-foreground', ACCENT_SECONDARY_FOREGROUND[colorKey]);
        }

        setMounted(true);
    }, [mode, accentColor]);

    // 스타일이 적용되지 않은 콘텐츠의 깜빡임 방지
    if (!mounted) {
        return <div style={{ visibility: 'hidden' }}>{children}</div>;
    }

    return <>{children}</>;
};
