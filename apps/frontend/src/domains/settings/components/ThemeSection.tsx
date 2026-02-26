'use client';

import { Sun, Moon, Check, Palette } from 'lucide-react';
import { useThemeStore, ACCENT_COLOR_PRESETS } from '../hooks/useThemeStore';
import { cn } from '@/lib/utils';

const ThemeSection = () => {
  const { mode, accentColor, customColor, setMode, setAccentColor, setCustomColor } =
    useThemeStore();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* 테마 모드 카드 */}
      <section className="bg-background/50 rounded-2xl border border-border/60 p-5">
        <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          테마 모드
          <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">UI Style</span>
        </h4>
        <div className="flex gap-3">
          <button
            onClick={() => setMode('light')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all duration-200',
              mode === 'light'
                ? 'bg-background border-primary text-primary shadow-sm ring-2 ring-primary/10'
                : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <Sun size={18} className={cn(mode === 'light' ? 'fill-current' : 'opacity-70')} />
            <span className="font-bold text-sm">라이트</span>
          </button>
          <button
            onClick={() => setMode('dark')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 transition-all duration-200',
              mode === 'dark'
                ? 'bg-background border-primary text-primary shadow-sm ring-2 ring-primary/10'
                : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <Moon size={18} className={cn(mode === 'dark' ? 'fill-current' : 'opacity-70')} />
            <span className="font-bold text-sm">다크</span>
          </button>
        </div>
      </section>

      {/* 메인 컬러 카드 */}
      <section className="bg-background/50 rounded-2xl border border-border/60 p-5">
        <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          메인 컬러
          <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Accent</span>
        </h4>

        <div className="grid grid-cols-5 sm:grid-cols-6 gap-y-6 gap-x-2 justify-items-center">
          {ACCENT_COLOR_PRESETS.map((color) => (
            <div key={color.name} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => setAccentColor(color.name)}>
              <div
                className={cn(
                  'w-10 h-10 rounded-full shadow-sm transition-all duration-200 flex items-center justify-center relative',
                  accentColor === color.name
                    ? 'ring-2 ring-offset-2 ring-primary scale-105 ring-offset-card dark:ring-offset-[#1A1B1E]'
                    : 'group-hover:scale-110 opacity-90 hover:opacity-100 ring-1 ring-black/5 dark:ring-white/10'
                )}
                style={{ backgroundColor: `hsl(${color.hsl})` }}
              >
                {accentColor === color.name && (
                  <Check size={20} strokeWidth={3} className="text-white drop-shadow-sm" />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-bold transition-colors whitespace-nowrap',
                  accentColor === color.name ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              >
                {color.label}
              </span>
            </div>
          ))}

          {/* 커스텀 컬러 */}
          <div className="flex flex-col items-center gap-2 group cursor-pointer relative">
            <div className="relative w-10 h-10">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className={cn(
                  'w-full h-full rounded-full shadow-sm transition-all duration-200 flex items-center justify-center overflow-hidden',
                  accentColor === 'custom'
                    ? 'ring-2 ring-offset-2 ring-primary scale-105 ring-offset-card dark:ring-offset-[#1A1B1E]'
                    : 'group-hover:scale-110 ring-1 ring-black/5 dark:ring-white/10'
                )}
                style={{
                  background: 'conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)',
                }}
              >
                <div className="w-6 h-6 rounded-full bg-background/90 flex items-center justify-center backdrop-blur-[1px]">
                  {accentColor === 'custom' ? <Check size={14} className="text-foreground" strokeWidth={3} /> : <Palette size={14} className="text-foreground/50" />}
                </div>
              </div>
            </div>
            <span
              className={cn(
                'text-[10px] font-bold transition-colors whitespace-nowrap',
                accentColor === 'custom' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )}
            >
              커스텀
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ThemeSection;
