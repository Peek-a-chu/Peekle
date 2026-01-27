'use client';

import { cn } from '@/lib/utils';
import { X, ExternalLink, CheckCircle2, Circle, User, Calendar } from 'lucide-react';
import type { Workbook, WorkbookProblem } from '../types';

interface WorkbooksRightPanelProps {
  workbook: Workbook | null;
  problems: WorkbookProblem[];
  onClose: () => void;
  className?: string;
}

export function WorkbooksRightPanel({
  workbook,
  problems,
  onClose,
  className,
}: WorkbooksRightPanelProps) {
  if (!workbook) return null;

  return (
    <div
      className={cn(
        'w-[460px] flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200',
        'border-l bg-card shadow-lg',
        className
      )}
    >
      {/* 헤더 */}
      <div className="px-5 py-5 border-b">
        {/* 상단: workbook #번호 | X */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-pink-500">workbook</span>
            <span className="text-sm font-medium text-muted-foreground">#{workbook.number}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 문제집 이름 */}
        <h2 className="font-bold text-xl text-foreground leading-tight mb-3">
          {workbook.title}
        </h2>

        {/* 메타 정보: 만든 사람 • Last Updated 날짜 • 문제 수 */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            <span>{workbook.creator.nickname}</span>
          </div>
          <span className="text-muted-foreground/50">•</span>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>Last Updated {(() => {
              const d = new Date(workbook.createdAt);
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              return `${yyyy}.${mm}.${dd}`;
            })()}</span>
          </div>
          <span className="text-muted-foreground/50">•</span>
          <span>{workbook.problemCount} Problems</span>
        </div>

        {/* 설명 */}
        {workbook.description && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              {workbook.description}
            </p>
          </div>
        )}
      </div>

      {/* 문제 목록 */}
      <div className="flex-1 overflow-y-auto">
        {problems.map((problem) => (
          <div
            key={problem.id}
            className="flex items-center gap-3 px-5 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors"
          >
            {/* 풀이 상태 */}
            <div className="shrink-0">
              {problem.isSolved ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/30" />
              )}
            </div>

            {/* 문제 정보 */}
            <div className="flex-1 min-w-0">
              <span className="text-sm text-foreground">
                <span className="font-medium text-pink-500 mr-1.5">{problem.number}</span>
                <span className="truncate">{problem.title}</span>
              </span>
            </div>

            {/* 이동 버튼 */}
            <a
              href={problem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="백준으로 이동"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
