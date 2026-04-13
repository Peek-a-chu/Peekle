import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Moon, Sun, Send, Eye, Archive, Minus, Plus, Play, TerminalSquare, Share2, Columns2, MoreHorizontal, CheckSquare, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsTouchMobile } from '@/hooks/useIsMobile';
import {
  type ViewMode,
  type Participant,
  type TargetSubmission,
} from '@/domains/study/hooks/useRoomStore';

const LANGUAGES = [
  { value: 'python', label: 'Python 3' },
  { value: 'java', label: 'Java 11' },
  { value: 'cpp', label: 'C++ 11' },
];

export interface CCIDEToolbarProps {
  language?: string;
  theme?: 'light' | 'vs-dark';
  fontSize?: number;
  showSubmit?: boolean;
  showExecute?: boolean;
  showConsoleToggle?: boolean;
  showFontSizeControl?: boolean;
  isExecuting?: boolean;
  showChatRef?: boolean;
  showThemeToggle?: boolean;
  currentProblemLabel?: string | null;
  onLanguageChange?: (lang: string) => void;
  onThemeToggle?: () => void;
  onFontSizeChange?: (size: number) => void;
  onCopy?: () => void;
  onRefChat?: () => void;
  onSubmit?: () => void;
  onExecute?: () => void;
  onToggleConsole?: () => void;
  onOpenProblemSplit?: () => void;
  onOpenTestcaseRunner?: () => void;
  disabled?: boolean;
  showProblemSplit?: boolean;
  showTestcaseRunner?: boolean;

  // View Mode Props
  viewingUser?: Participant | null;
  viewMode?: ViewMode;
  targetSubmission?: TargetSubmission | null;
  onResetView?: () => void;
  problemExternalId?: string | null;
}

export function CCIDEToolbar({
  language = 'python',
  theme = 'light',
  fontSize = 14,
  showSubmit = true,
  showExecute = false,
  showConsoleToggle = true,
  showFontSizeControl = true,
  isExecuting = false,
  showChatRef = true,
  showThemeToggle = true,
  currentProblemLabel,
  onLanguageChange,
  onThemeToggle,
  onFontSizeChange,
  onCopy,
  onRefChat,
  onSubmit,
  onExecute,
  onToggleConsole,
  onOpenProblemSplit,
  onOpenTestcaseRunner,
  viewingUser,
  viewMode,
  targetSubmission,
  onResetView,
  disabled = false,
  showProblemSplit = false,
  showTestcaseRunner = false,
  problemExternalId,
}: CCIDEToolbarProps) {
  const isMobile = useIsTouchMobile();
  const isRealtime = viewMode === 'SPLIT_REALTIME';
  const isSaved = viewMode === 'SPLIT_SAVED';
  const isViewingOther = viewMode !== 'ONLY_MINE';
  const shouldShowLanguageSelect = !isViewingOther;
  const [isSplitSizedWindow, setIsSplitSizedWindow] = useState(false);
  const [isTestToolsOpen, setIsTestToolsOpen] = useState(false);

  // Use local state for the input field to allow users to clear it while typing
  const [inputValue, setInputValue] = useState<string>(fontSize.toString());

  // Sync internal state if prop changes from outside (e.g. shortcuts)
  useEffect(() => {
    setInputValue(fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateWindowSplitState = () => {
      const currentInnerWidth = window.innerWidth;
      const availWidth = window.screen?.availWidth || currentInnerWidth;
      const currentWidth = window.outerWidth || currentInnerWidth;
      const widthRatio = currentWidth / Math.max(availWidth, 1);

      // Some environments report screen/outer sizes inconsistently, so we also use innerWidth.
      setIsSplitSizedWindow(widthRatio <= 0.8 || currentInnerWidth <= 1360);
    };

    updateWindowSplitState();
    window.addEventListener('resize', updateWindowSplitState);
    return () => window.removeEventListener('resize', updateWindowSplitState);
  }, []);

  const problemSplitButtonLabel = isSplitSizedWindow ? '좌측 문제 열기' : '분할해서 열기';
  const problemSplitTooltipLabel = isSplitSizedWindow
    ? '좌측 창에 현재 문제 열기'
    : '현재 문제를 분할 화면으로 열기';
  const isCompactToolbar = isSplitSizedWindow && !isMobile;
  const compactProblemSplitButtonLabel = isCompactToolbar ? '문제 열기' : problemSplitButtonLabel;
  const showConsoleTool = showExecute && showConsoleToggle;
  const showTestTools = showConsoleTool || showTestcaseRunner;

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
      if (num >= 5 && num <= 40) {
        onFontSizeChange(num);
      }
    }
  };

  const handleBlur = () => {
    let num = parseInt(inputValue, 10);
    if (isNaN(num)) {
      num = 14;
    }
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
        <div className="flex items-center gap-3 min-w-0">
          {/* Language Select - Show on desktop and mobile(my code only) */}
          {shouldShowLanguageSelect && (
            <select
              value={language}
              onChange={(e) => onLanguageChange?.(e.target.value)}
              disabled={disabled}
              className={cn(
                'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring text-strong font-medium',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          )}

          {/* View Mode Banner - Conditional (Next to Select) */}
          {isViewingOther && !isMobile && (
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold animate-in fade-in slide-in-from-left-2 duration-300 shadow-sm border',
                // Realtime: Pink Badge
                isRealtime && 'bg-pink-100/80 text-pink-700 border-pink-200',
                // Saved: Indigo Badge
                isSaved && 'bg-indigo-100/80 text-indigo-700 border-indigo-200',
              )}
            >
              {isRealtime ? (
                <Eye className="h-4 w-4 stroke-[2.5px]" />
              ) : (
                <Archive className="h-4 w-4 stroke-[2.5px]" />
              )}
              <span>
                {isRealtime
                  ? `${viewingUser?.nickname}의 코드 실시간 열람 중`
                  : `${targetSubmission?.username}${targetSubmission?.username === 'PS러버' ||
                    targetSubmission?.username === 'CodeNinja'
                    ? ' (Bot)'
                    : ''
                  }의 저장된 코드 열람 중`}
              </span>
              {isSaved && targetSubmission && (
                <span className="text-xs opacity-75 font-normal">
                  ({problemExternalId ? `${problemExternalId}. ` : ''}
                  {targetSubmission.problemTitle})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Font Size Control */}
          {!isCompactToolbar && showFontSizeControl && (
            <>
              <div className="flex items-center gap-1 mr-2 bg-muted/50 rounded-md p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDecreaseFont}
                      disabled={disabled || fontSize <= 5}
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
                  disabled={disabled}
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
                      disabled={disabled || fontSize >= 40}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-background/80"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>폰트 크게</TooltipContent>
                </Tooltip>
              </div>

              <div className="w-px h-4 bg-border mx-1" />
            </>
          )}

          {!isCompactToolbar && (
            <>
              {showThemeToggle && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onThemeToggle}
                      disabled={disabled}
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
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCopy}
                    disabled={disabled}
                    className="h-10 w-10 text-foreground hover:bg-accent border border-transparent hover:border-border transition-all"
                  >
                    <Copy className="h-[22px] w-[22px] stroke-[2px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  코드 복사 <span className="ml-1 opacity-60 text-xs">Ctrl+C</span>
                </TooltipContent>
              </Tooltip>

              {showChatRef && (
                <Tooltip>
                  <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRefChat}
                    disabled={disabled}
                    title="Share code to chat"
                    aria-label="Share code to chat"
                    data-testid="ide-share-code-button"
                    className="h-10 w-10 text-foreground hover:bg-accent border border-transparent hover:border-border transition-all"
                  >
                    <Share2 className="h-[20px] w-[20px] stroke-[2.5px]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>내 풀이 채팅에 공유</TooltipContent>
                </Tooltip>
              )}
            </>
          )}

          {isCompactToolbar && (
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={disabled}
                      className="h-10 w-10 text-foreground hover:bg-accent border border-transparent hover:border-border transition-all"
                    >
                      <MoreHorizontal className="h-[20px] w-[20px] stroke-[2.2px]" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>추가 도구</TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-56 p-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">폰트</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDecreaseFont}
                        disabled={disabled || fontSize <= 5}
                        className="h-7 w-7"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-xs font-mono text-muted-foreground">
                        {fontSize}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleIncreaseFont}
                        disabled={disabled || fontSize >= 40}
                        className="h-7 w-7"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {showThemeToggle && (
                    <Button
                      variant="ghost"
                      onClick={onThemeToggle}
                      disabled={disabled}
                      className="h-9 justify-start gap-2"
                    >
                      {theme === 'light' ? (
                        <Moon className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4" />
                      )}
                      <span className="text-sm">테마 변경</span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    onClick={onCopy}
                    disabled={disabled}
                    className="h-9 justify-start gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="text-sm">코드 복사</span>
                  </Button>

                  {showChatRef && (
                    <Button
                      variant="ghost"
                      onClick={onRefChat}
                      disabled={disabled}
                      title="Share code to chat"
                      aria-label="Share code to chat"
                      data-testid="ide-share-code-button"
                      className="h-9 justify-start gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="text-sm">채팅에 공유</span>
                    </Button>
                  )}

                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Standard Tools (Hidden when Viewing Other) */}
          {!isViewingOther && (
            <>
              {/* Desktop-only Split Open */}
              {showProblemSplit && !isMobile && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onOpenProblemSplit}
                      disabled={disabled}
                      className={cn(
                        'ml-1 gap-1.5 focus:ring-0 transition-all active:scale-95 px-3 h-10',
                        isCompactToolbar
                          ? 'text-muted-foreground border border-border/70 hover:text-foreground hover:bg-accent'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Columns2 className="h-[18px] w-[18px]" />
                      <span className="font-semibold text-sm whitespace-nowrap">
                        {compactProblemSplitButtonLabel}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{problemSplitTooltipLabel}</TooltipContent>
                </Tooltip>
              )}

              {/* Test Tools */}
              {showTestTools && (
                <Popover open={isTestToolsOpen} onOpenChange={setIsTestToolsOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={disabled}
                          className={cn(
                            'ml-1 gap-1.5 focus:ring-0 transition-all active:scale-95 h-10 px-3',
                            isCompactToolbar
                              ? 'text-muted-foreground border border-border/70 hover:text-foreground hover:bg-accent'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <TerminalSquare className="h-[18px] w-[18px]" />
                          <span className="font-medium text-sm whitespace-nowrap">테스트</span>
                          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>테스트 도구 열기</TooltipContent>
                  </Tooltip>
                  <PopoverContent align="end" className="w-72 p-2">
                    <div className="flex flex-col gap-1">
                      {showConsoleTool && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            onToggleConsole?.();
                            setIsTestToolsOpen(false);
                          }}
                          disabled={disabled}
                          className="h-auto items-start justify-start gap-2 px-3 py-2"
                        >
                          <TerminalSquare className="mt-0.5 h-4 w-4 shrink-0" />
                          <div className="flex flex-col items-start text-left">
                            <span className="text-sm font-semibold leading-5">테스트 케이스 편집</span>
                            <span className="text-[11px] text-muted-foreground leading-4">
                              입력값을 수정하고 빠르게 실행합니다.
                            </span>
                          </div>
                        </Button>
                      )}
                      {showTestcaseRunner && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            onOpenTestcaseRunner?.();
                            setIsTestToolsOpen(false);
                          }}
                          disabled={disabled}
                          className="h-auto items-start justify-start gap-2 px-3 py-2"
                        >
                          <CheckSquare className="mt-0.5 h-4 w-4 shrink-0" />
                          <div className="flex flex-col items-start text-left">
                            <span className="text-sm font-semibold leading-5">전체 케이스 검증</span>
                            <span className="text-[11px] text-muted-foreground leading-4">
                              여러 케이스를 저장하고 일괄 비교 실행합니다.
                            </span>
                          </div>
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* Execute */}
              {showExecute && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={onExecute}
                      disabled={disabled || isExecuting}
                      className={cn(
                        'ml-1 gap-1.5 focus:ring-0 shadow-sm transition-all active:scale-95 h-10 border border-border',
                        isCompactToolbar ? 'px-3' : 'px-4',
                      )}
                    >
                      <Play className={cn("h-4 w-4 stroke-[2.5px]", isExecuting && "animate-pulse")} />
                      <span className="font-bold text-sm">{isExecuting ? '실행중' : '실행'}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>테스트 케이스 실행 <span className="ml-1 opacity-60 text-xs">Ctrl+Enter</span></TooltipContent>
                </Tooltip>
              )}

              {/* Submit */}
              {showSubmit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={onSubmit}
                      disabled={disabled || isExecuting}
                      className={cn(
                        'ml-1 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-95 h-10 border border-primary-foreground/10',
                        isCompactToolbar ? 'px-3' : 'px-4',
                      )}
                    >
                      <Send className="h-4 w-4 stroke-[2.5px]" />
                      <span className="font-bold text-sm">제출</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>문제 제출하기</TooltipContent>
                </Tooltip>
              )}
            </>
          )}

          {/* View Only Mine Button (Visible only when Viewing Other) */}
          {isViewingOther && !isMobile && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onResetView}
              className="ml-2 px-4 h-10 font-bold border border-border shadow-sm hover:scale-105 active:scale-95 transition-all"
            >
              내 코드만 보기
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
