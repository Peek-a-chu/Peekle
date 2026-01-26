'use client';

import { Sun, Moon, Check } from 'lucide-react';
import { useThemeStore, AccentColor } from '../hooks/useThemeStore';
import { cn } from '@/lib/utils';

const ThemeSection = () => {
    const { mode, accentColor, customColor, setMode, setAccentColor, setCustomColor } =
        useThemeStore();

    const colors: { name: AccentColor; label: string; class: string }[] = [
        { name: 'blue', label: '블루', class: 'bg-[hsl(221,83%,53%)]' },
        { name: 'skyblue', label: '스카이블루', class: 'bg-[hsl(180,100%,35%)]' },
        { name: 'orange', label: '앰버', class: 'bg-[hsl(32,95%,50%)]' },
        { name: 'pink', label: '핑크', class: 'bg-[hsl(327,73%,60%)]' },
        { name: 'green', label: '그린', class: 'bg-[hsl(132,36%,31%)]' },
        { name: 'lime', label: '라임', class: 'bg-[hsl(132,93%,58%)]' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 테마 모드 */}
            <section>
                <h4 className="text-sm font-bold text-foreground mb-4">테마 모드</h4>
                <div className="flex gap-3">
                    <button
                        onClick={() => setMode('light')}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all',
                            mode === 'light'
                                ? 'bg-primary/15 text-primary border-primary/50 shadow-sm'
                                : 'bg-muted text-muted-foreground border-border hover:border-primary/30',
                        )}
                    >
                        <Sun size={18} className={cn(mode === 'light' ? 'opacity-100' : 'opacity-50')} />
                        <span className="font-bold text-sm">라이트</span>
                    </button>
                    <button
                        onClick={() => setMode('dark')}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all',
                            mode === 'dark'
                                ? 'bg-primary/15 text-primary border-primary/50 shadow-sm'
                                : 'bg-muted text-muted-foreground border-border hover:border-primary/30',
                        )}
                    >
                        <Moon size={18} className={cn(mode === 'dark' ? 'opacity-100' : 'opacity-50')} />
                        <span className="font-bold text-sm">다크</span>
                    </button>
                </div>
            </section>

            {/* 메인 컬러 */}
            <section>
                <h4 className="text-sm font-bold text-foreground mb-6">메인 컬러</h4>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-y-8 gap-x-4 p-1.5">
                    {colors.map((color) => (
                        <div key={color.name} className="flex flex-col items-center gap-3">
                            <button
                                onClick={() => setAccentColor(color.name)}
                                className={cn(
                                    'w-12 h-12 rounded-full relative transition-all hover:scale-110 active:scale-95',
                                    color.class,
                                    accentColor === color.name &&
                                    'ring-2 ring-offset-2 ring-primary scale-110 shadow-md dark:ring-offset-zinc-950',
                                )}
                            >
                                {accentColor === color.name && (
                                    <Check size={24} className="text-white absolute inset-0 m-auto" />
                                )}
                            </button>
                            <span
                                className={cn(
                                    'text-[11px] font-bold transition-colors whitespace-nowrap',
                                    accentColor === color.name
                                        ? 'text-foreground'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {color.label}
                            </span>
                        </div>
                    ))}

                    {/* 커스텀 컬러 */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            <input
                                type="color"
                                value={customColor}
                                onChange={(e) => setCustomColor(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <button
                                className={cn(
                                    'w-12 h-12 rounded-full relative transition-all hover:scale-110 active:scale-95 flex items-center justify-center',
                                    accentColor === 'custom' &&
                                    'ring-2 ring-offset-2 ring-primary scale-110 shadow-md dark:ring-offset-zinc-950',
                                )}
                                style={{
                                    background:
                                        'conic-gradient(from 0deg, #ff000066, #ffff0066, #00ff0066, #00ffff66, #0000ff66, #ff00ff66, #ff000066)',
                                }}
                            >
                                <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                                    {accentColor === 'custom' && (
                                        <Check size={18} className="text-zinc-800" />
                                    )}
                                </div>
                            </button>
                        </div>
                        <span
                            className={cn(
                                'text-[11px] font-bold transition-colors whitespace-nowrap',
                                accentColor === 'custom' ? 'text-foreground' : 'text-muted-foreground',
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
