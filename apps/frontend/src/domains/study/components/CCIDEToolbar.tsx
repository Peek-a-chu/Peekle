'use client';

import { Button } from '@/components/ui/button';
import { Copy, Moon, Sun, MessageSquare, Send, Eye, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  showSubmit?: boolean;
  showChatRef?: boolean;
  onLanguageChange?: (lang: string) => void;
  onThemeToggle?: () => void;
  onCopy?: () => void;
  onRefChat?: () => void;
  onSubmit?: () => void;

  // View Mode Props
  viewingUser?: Participant | null;
  viewMode?: ViewMode;
  targetSubmission?: TargetSubmission | null;
  onResetView?: () => void;
}

export function CCIDEToolbar({
  language = 'python',
  theme = 'light',
  showSubmit = true,
  showChatRef = true,
  onLanguageChange,
  onThemeToggle,
  onCopy,
  onRefChat,
  onSubmit,
  viewingUser,
  viewMode,
  targetSubmission,
  onResetView,
}: CCIDEToolbarProps) {
  const isRealtime = viewMode === 'SPLIT_REALTIME';
  const isSaved = viewMode === 'SPLIT_SAVED';
  const isViewingOther = viewMode !== 'ONLY_MINE';

  return (
    <div className="flex bg-card items-center justify-between border-b border-border px-4 h-14 shrink-0 w-full">
      <div className="flex items-center gap-3">
        {/* Language Select - Always Visible */}
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

        {/* View Mode Banner - Conditional (Next to Select) */}
        {isViewingOther && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300',
              // Realtime: Pink Badge
              isRealtime && 'bg-pink-100 text-pink-700',
              // Saved: Blue/Indigo Badge (Green is usually for success, saved file feels more like Blue/Gray, but sticking to design request or standard)
              isSaved && 'bg-indigo-100 text-indigo-700',
            )}
          >
            {isRealtime ? <Eye className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            <span>
              {isRealtime
                ? `${viewingUser?.nickname}의 코드 실시간 열람 중`
                : `${targetSubmission?.username}${
                    targetSubmission?.username === 'PS러버' ||
                    targetSubmission?.username === 'CodeNinja'
                      ? ' (Bot)'
                      : ''
                  }의 저장된 코드 열람 중`}
            </span>
            {isSaved && targetSubmission && (
              <span className="text-xs opacity-75">({targetSubmission.problemTitle})</span>
            )}
          </div>
        )}
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

        {/* Code Reference - Always available if enabled */}
        {showChatRef && (
          <Button variant="ghost" size="icon" onClick={onRefChat} title="코드 참조 (채팅)">
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}

        {/* Standard Tools (Hidden when Viewing Other) */}
        {!isViewingOther && (
          <>
            {/* Submit */}
            {showSubmit && (
              <Button
                size="sm"
                onClick={onSubmit}
                className="gap-1 bg-[#EDF2F8] text-foreground hover:bg-[#DFE7F0]"
                title="제출하기"
              >
                <Send className="h-3 w-3" />
                <span className="text-xs">제출</span>
              </Button>
            )}
          </>
        )}

        {/* View Only Mine Button (Visible only when Viewing Other) */}
        {isViewingOther && (
          <Button size="sm" variant="secondary" onClick={onResetView} className="ml-2 font-medium">
            내 코드만 보기
          </Button>
        )}
      </div>
    </div>
  );
}
