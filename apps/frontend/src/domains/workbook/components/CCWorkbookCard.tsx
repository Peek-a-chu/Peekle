'use client';

import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import type { Workbook } from '../types';

interface CCWorkbookCardProps {
  workbook: Workbook;
  isSelected?: boolean;
  onSelect?: () => void;
  onToggleBookmark?: (id: string) => void;
  className?: string;
}

export function CCWorkbookCard({
  workbook,
  isSelected,
  onSelect,
  onToggleBookmark,
  className,
}: CCWorkbookCardProps) {
  // 0/0일 때 NaN 방지
  const successPercent =
    workbook.problemCount > 0
      ? (workbook.solvedCount / workbook.problemCount) * 100
      : 0;
  const failPercent =
    workbook.problemCount > 0
      ? (workbook.failedCount / workbook.problemCount) * 100
      : 0;

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
        'relative rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md cursor-pointer',
        isSelected
          ? 'border ring-1 ring-primary bg-primary/10'
          : 'border-border hover:border-pink-200',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* 왼쪽: 번호 + 콘텐츠 */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* 번호 뱃지 */}
          <div className="shrink-0 w-8 h-8 rounded-lg bg-pink-100 text-primary flex items-center justify-center text-sm font-bold">
            {workbook.number}
          </div>

          {/* 콘텐츠 */}
          <div className="flex-1 min-w-0">
            {/* 제목 */}
            <h3 className="font-semibold text-foreground text-sm line-clamp-1">{workbook.title}</h3>

            {/* 설명 */}
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {workbook.description}
            </p>

            {/* 프로그래스바 */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] mb-1 leading-none">
                <span className="text-muted-foreground">진행률</span>
                <span className="font-medium">
                  <span className="text-green-500">{workbook.solvedCount}</span>
                  {workbook.failedCount > 0 && (
                    <span className="text-red-500">+{workbook.failedCount}</span>
                  )}
                  <span className="text-muted-foreground">/{workbook.problemCount}</span>
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${successPercent}%` }}
                />
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${failPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 즐겨찾기 */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark?.(workbook.id);
            }}
            className="p-1 rounded-md hover:bg-accent transition-colors"
            aria-label={workbook.isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <Star
              className={cn(
                'h-5 w-5 transition-colors',
                workbook.isBookmarked
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground hover:text-yellow-400',
              )}
            />
          </button>
          <span className="text-xs text-muted-foreground">{workbook.bookmarkCount}</span>
        </div>
      </div>
    </div>
  );
}
