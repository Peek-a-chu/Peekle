'use client';

import { Button } from '@/components/ui/button';
import { Copy, Moon, Sun, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const LANGUAGES = [
    { value: 'python', label: 'Python 3' },
    { value: 'java', label: 'Java 11' },
    { value: 'cpp', label: 'C++ 11' },
];

export interface GameIDEToolbarProps {
    language?: string;
    theme?: 'light' | 'vs-dark';
    onLanguageChange?: (lang: string) => void;
    onThemeToggle?: () => void;
    onCopy?: () => void;
    onSubmit?: () => void;
}

export function GameIDEToolbar({
    language = 'python',
    theme = 'light',
    onLanguageChange,
    onThemeToggle,
    onCopy,
    onSubmit,
}: GameIDEToolbarProps) {
    return (
        <div className="flex bg-card items-center justify-between border-b border-border px-4 h-14 shrink-0 w-full">
            <div className="flex items-center gap-3">
                {/* Language Select */}
                <select
                    value={language}
                    onChange={(e) => onLanguageChange?.(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                    {LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                            {lang.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-2">
                {/* Theme Toggle */}
                <Button variant="ghost" size="icon" onClick={onThemeToggle} title="테마 변경">
                    {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>

                {/* Copy */}
                <Button variant="ghost" size="icon" onClick={onCopy} title="코드 복사">
                    <Copy className="h-4 w-4" />
                </Button>

                {/* Submit - 항상 표시 */}
                <Button
                    size="sm"
                    onClick={onSubmit}
                    className="gap-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50"
                    title="제출하기"
                >
                    <Send className="h-3 w-3" />
                    <span className="text-xs">제출</span>
                </Button>
            </div>
        </div>
    );
}
