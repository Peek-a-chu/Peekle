'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { CCWorkbookRow } from '../components';
import type { Workbook } from '../types';

interface WorkbooksLeftPanelProps {
  workbooks: Workbook[];
  totalCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  className?: string;
}

export function WorkbooksLeftPanel({
  workbooks,
  totalCount,
  selectedId,
  onSelect,
  onToggleBookmark,
  hasMore,
  isLoading,
  onLoadMore,
  className,
}: WorkbooksLeftPanelProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer로 무한 스크롤 구현
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  if (workbooks.length === 0 && !isLoading) {
    return (
      <div className={cn('flex-1 border rounded-xl bg-card', className)}>
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          문제집이 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex-1 border rounded-xl bg-card overflow-hidden flex flex-col', className)}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/50 text-xs font-medium text-muted-foreground shrink-0">
        <div className="shrink-0 w-8 text-center">#</div>
        <div className="flex-1">
          문제집
          <span className="ml-2 text-muted-foreground/70">({totalCount})</span>
        </div>
        <div className="shrink-0 w-24 text-center">진행률</div>
        <div className="shrink-0 w-20 text-center">만든 사람</div>
        <div className="shrink-0 w-14 text-center">즐겨찾기</div>
        <div className="shrink-0 w-4" />
      </div>

      {/* 리스트 - 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto">
        {workbooks.map((workbook, index) => (
          <CCWorkbookRow
            key={workbook.id}
            workbook={workbook}
            isSelected={selectedId === workbook.id}
            onSelect={() => onSelect(workbook.id)}
            onToggleBookmark={onToggleBookmark}
            className={index !== workbooks.length - 1 ? 'border-b border-border/50' : ''}
          />
        ))}

        {/* 로딩 인디케이터 & Observer 타겟 */}
        <div ref={observerRef} className="py-4 flex justify-center">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>불러오는 중...</span>
            </div>
          )}
          {!hasMore && workbooks.length > 0 && (
            <span className="text-xs text-muted-foreground">모든 문제집을 불러왔습니다</span>
          )}
        </div>
      </div>
    </div>
  );
}
