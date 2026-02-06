'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  X,
  ExternalLink,
  CheckCircle2,
  Circle,
  User,
  Calendar,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Workbook, WorkbookProblem } from '../types';

interface WorkbooksRightPanelProps {
  workbook: Workbook | null;
  problems: WorkbookProblem[];
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function WorkbooksRightPanel({
  workbook,
  problems,
  onClose,
  onEdit,
  onDelete,
  className,
}: WorkbooksRightPanelProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!workbook) return null;

  const handleDelete = () => {
    onDelete?.();
    setDeleteDialogOpen(false);
  };

  return (
    <div
      className={cn(
        'w-[460px] flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200',
        'border-l bg-card shadow-lg',
        className,
      )}
    >
      {/* 헤더 */}
      <div className="px-5 py-5 border-b">
        {/* 상단: workbook #번호 | X */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-primary">workbook</span>
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
        <div className="flex items-center gap-1 mb-3">
          <h2 className="font-bold text-xl text-foreground leading-tight">{workbook.title}</h2>
          {workbook.isOwner && (
            <>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="문제집 수정"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => setDeleteDialogOpen(true)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="문제집 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* 메타 정보: 만든 사람 • Last Updated 날짜 • 문제 수 */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            <span>{workbook.creator.nickname}</span>
          </div>
          <span className="text-muted-foreground/50">•</span>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>
              Last Updated{' '}
              {(() => {
                const d = new Date(workbook.updatedAt);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}.${mm}.${dd}`;
              })()}
            </span>
          </div>
          <span className="text-muted-foreground/50">•</span>
          <span>{workbook.problemCount} Problems</span>
        </div>

        {/* 설명 */}
        {workbook.description && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50">
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
              {workbook.description}
            </pre>
          </div>
        )}

        {/* 진행률 바 */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Progress
            </span>
            <span className="font-bold flex items-center gap-1">
              <span className="text-green-500">{workbook.solvedCount}</span>
              <span className="text-muted-foreground">/ {workbook.problemCount}</span>
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden flex shadow-inner">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{
                width: `${workbook.problemCount > 0 ? (workbook.solvedCount / workbook.problemCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 문제 목록 */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {problems.map((problem) => (
          <div
            key={problem.id}
            className="flex items-center gap-3 px-5 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors"
          >
            {/* 풀이 상태 */}
            <div className="shrink-0">
              {problem.status === 'SUCCESS' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : problem.status === 'FAIL' ? (
                <X className="h-5 w-5 text-red-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/30" />
              )}
            </div>

            {/* 문제 정보 */}
            <div className="flex-1 min-w-0">
              <span className="text-sm text-foreground">
                <span className="font-medium text-primary mr-1.5">{problem.number}</span>
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

      {/* 삭제 확인 모달 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[360px]">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2 text-center">
              <AlertDialogTitle>{workbook.title}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>문제집을 삭제하시겠습니까?</p>
                  <p>삭제된 문제집은 복구할 수 없습니다.</p>
                </div>
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2 mt-2">
            <AlertDialogCancel className="flex-1 sm:flex-none">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="flex-1 sm:flex-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
