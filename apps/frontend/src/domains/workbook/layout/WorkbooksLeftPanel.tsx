'use client';

import { cn } from '@/lib/utils';
import { CCWorkbookRow } from '../components';
import type { Workbook } from '../types';

interface WorkbooksLeftPanelProps {
  workbooks: Workbook[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  className?: string;
}

export function WorkbooksLeftPanel({
  workbooks,
  selectedId,
  onSelect,
  onToggleBookmark,
  className,
}: WorkbooksLeftPanelProps) {
  if (workbooks.length === 0) {
    return (
      <div className={cn('flex-1 border rounded-xl bg-card', className)}>
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          문제집이 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex-1 border rounded-xl bg-card overflow-hidden', className)}>
      {/* 헤더 */}
      <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
        <div className="shrink-0 w-8 text-center">#</div>
        <div className="flex-1">문제집</div>
        <div className="shrink-0 w-24 text-center">진행률</div>
        <div className="shrink-0 w-20 text-center">만든 사람</div>
        <div className="shrink-0 w-16 text-center">즐겨찾기</div>
        <div className="shrink-0 w-4" />
      </div>

      {/* 리스트 */}
      <div>
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
      </div>
    </div>
  );
}
