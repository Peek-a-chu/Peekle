'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Moon, Sun, Send, Minus, Plus } from 'lucide-react';
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
  fontSize?: number;
  onLanguageChange?: (lang: string) => void;
  onThemeToggle?: () => void;
  onFontSizeChange?: (size: number) => void;
  onCopy?: () => void;
  onSubmit?: () => void;
}

export function GameIDEToolbar({
  language = 'python',
  theme = 'light',
  fontSize = 14,
  onLanguageChange,
  onThemeToggle,
  onFontSizeChange,
  onCopy,
  onSubmit,
}: GameIDEToolbarProps) {
  // Use local state for the input field to allow users to clear it while typing
  const [inputValue, setInputValue] = useState<string>(fontSize.toString());

  // Sync internal state if prop changes from outside (e.g. shortcuts)
  useEffect(() => {
    setInputValue(fontSize.toString());
  }, [fontSize]);

  const handleDecreaseFont = () => {
    if (onFontSizeChange && fontSize > 5) {
      onFontSizeChange(fontSize - 1);
    }
  };

  const handleIncreaseFont = () => {
    if (onFontSizeChange && fontSize < 40) {
      onFontSizeChange(fontSize + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const num = parseInt(val, 10);
    if (!isNaN(num) && onFontSizeChange) {
      // We still update parent for immediate preview if it's within a reasonable range
      // but we don't clamp it here.
      if (num >= 5 && num <= 40) {
        onFontSizeChange(num);
      }
    }
  };

  const handleBlur = () => {
    let num = parseInt(inputValue, 10);
    if (isNaN(num)) {
      num = 14; // Default on invalid
    }

    // Clamp to range
    const clamped = Math.max(5, Math.min(40, num));
    setInputValue(clamped.toString());
    if (onFontSizeChange) {
      onFontSizeChange(clamped);
    }
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

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
          {/* Font Size Control */}
          <div className="flex items-center gap-1 mr-2 bg-muted/50 rounded-md p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDecreaseFont}
                  disabled={fontSize <= 5}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-background/80"
                >
                  <Minus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>폰트 작게</TooltipContent>
            </Tooltip>

            <input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDownInput}
              className="w-10 text-center text-xs font-mono text-muted-foreground bg-transparent border-none focus:outline-none focus:text-foreground appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={5}
              max={40}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleIncreaseFont}
                  disabled={fontSize >= 40}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-background/80"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>폰트 크게</TooltipContent>
            </Tooltip>
          </div>

          <div className="w-px h-4 bg-border mx-1" />

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
