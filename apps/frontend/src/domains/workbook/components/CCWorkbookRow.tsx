'use client';

import { cn } from '@/lib/utils';
import { Star, ChevronRight } from 'lucide-react';
import type { Workbook } from '../types';

interface CCWorkbookRowProps {
  workbook: Workbook;
  isSelected?: boolean;
  onSelect?: () => void;
  onToggleBookmark?: (id: string) => void;
  className?: string;
}

export function CCWorkbookRow({
  workbook,
  isSelected,
  onSelect,
  onToggleBookmark,
  className,
}: CCWorkbookRowProps) {
  const progress = Math.round((workbook.solvedCount / workbook.problemCount) * 100);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect?.();
        }
      }}
      className={cn(
        'group flex items-center gap-4 px-4 py-3 transition-all cursor-pointer',
        isSelected
          ? 'bg-pink-50 dark:bg-pink-950/20'
          : 'hover:bg-muted/50',
        className
      )}
    >
      {/* 번호 - w-8 */}
      <div
        className={cn(
          'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors',
          isSelected
            ? 'bg-pink-500 text-white'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {workbook.number}
      </div>

      {/* 제목 + 설명 - flex-1 */}
      <div className="flex-1 min-w-0">
        <h3
          className={cn(
            'font-medium text-sm line-clamp-1 transition-colors',
            isSelected ? 'text-pink-600 dark:text-pink-400' : 'text-foreground'
          )}
        >
          {workbook.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
          {workbook.description}
        </p>
      </div>

      {/* 진행률 - w-24 */}
      <div className="shrink-0 w-24">
        <div className="flex items-center justify-end mb-1">
          <span className="text-xs font-medium">
            <span className="text-green-500">{workbook.solvedCount}</span>
            <span className="text-muted-foreground">/{workbook.problemCount}</span>
          </span>
        </div>
        <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 만든 사람 - w-20 */}
      <div className="shrink-0 w-20 text-center">
        <span className="text-xs text-muted-foreground truncate block">{workbook.creator.nickname}</span>
      </div>

      {/* 즐겨찾기 - w-16 */}
      <div className="shrink-0 w-16 flex justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark?.(workbook.id);
          }}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md transition-colors',
            isSelected
              ? 'hover:bg-pink-100 dark:hover:bg-pink-900/30'
              : 'hover:bg-accent'
          )}
          aria-label={workbook.isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        >
          <Star
            className={cn(
              'h-4 w-4 transition-colors',
              workbook.isBookmarked
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground group-hover:text-yellow-400'
            )}
          />
          <span className="text-xs text-muted-foreground">{workbook.bookmarkCount}</span>
        </button>
      </div>

      {/* 화살표 - w-4 */}
      <ChevronRight
        className={cn(
          'shrink-0 w-4 h-4 transition-all',
          isSelected
            ? 'text-pink-500 translate-x-0.5'
            : 'text-muted-foreground/50 group-hover:text-muted-foreground'
        )}
      />
    </div>
  );
}
