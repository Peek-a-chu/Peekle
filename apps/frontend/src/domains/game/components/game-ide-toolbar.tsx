'use client';

import { Button } from '@/components/ui/button';
import { Copy, Moon, Sun, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    <TooltipProvider>
      <div className="flex bg-card items-center justify-between border-b border-border px-4 h-14 shrink-0 w-full">
        <div className="flex items-center gap-3">
          {/* Language Select */}
          <select
            value={language}
            onChange={(e) => onLanguageChange?.(e.target.value)}
            className={cn(
              'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring text-foreground font-medium',
            )}
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onThemeToggle}
                className="h-10 w-10 text-foreground hover:bg-accent border border-transparent hover:border-border transition-all"
              >
                {theme === 'light' ? (
                  <Moon className="h-[22px] w-[22px] stroke-[2px]" />
                ) : (
                  <Sun className="h-[22px] w-[22px] stroke-[2px]" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>테마 변경</TooltipContent>
          </Tooltip>

          {/* Copy */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCopy}
                className="h-10 w-10 text-foreground hover:bg-accent border border-transparent hover:border-border transition-all"
              >
                <Copy className="h-[22px] w-[22px] stroke-[2px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              코드 복사 <span className="ml-1 opacity-60 text-xs">Ctrl+C</span>
            </TooltipContent>
          </Tooltip>

          {/* Submit */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={onSubmit}
                className="ml-1 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95 px-4 h-10 border border-primary-foreground/10"
              >
                <Send className="h-4 w-4 stroke-[2.5px]" />
                <span className="font-bold text-sm">제출</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>문제 제출하기</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
