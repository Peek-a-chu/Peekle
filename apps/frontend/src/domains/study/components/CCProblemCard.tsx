'use client';

import { useState } from 'react';
import { cn, getBojTierName, getBojTierColorClass } from '@/lib/utils';
import { ExternalLink, Trash2, Lightbulb, FileText, Users } from 'lucide-react';
import { StudyProblem as Problem } from '@/domains/study/types';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { Button } from '@/components/ui/button';
import { ActionModal } from '@/components/common/Modal';
import { Separator } from '@/components/ui/separator';
import { CCTestcaseRunnerModal } from './CCTestcaseRunnerModal';
import { CheckSquare } from 'lucide-react';

interface CCProblemCardProps {
  problem: Problem;
  isSelected?: boolean;
  onSelect?: () => void;
  onOpenSubmission?: (problemId: number) => void;
  onRemove?: () => void;
  onOpenDescription?: () => void;
  className?: string;
  isCompact?: boolean;
}

export function CCProblemCard({
  problem,
  isSelected,
  onSelect,
  onOpenSubmission,
  onRemove,
  onOpenDescription,
  className,
  isCompact = false,
}: CCProblemCardProps) {
  const [showHint, setShowHint] = useState(false);
  const [isTestcaseModalOpen, setIsTestcaseModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const setIsLeftPanelFolded = useRoomStore((state) => state.setIsLeftPanelFolded);
  const setIsRightPanelFolded = useRoomStore((state) => state.setIsRightPanelFolded);
  const myRole = useRoomStore((state) => state.myRole);

  const isCustom = problem.type === 'CUSTOM' || (!problem.problemId && !problem.externalId);
  const problemUrl =
    problem.customLink ||
    (problem.type === 'CUSTOM' || isCustom
      ? problem.customLink
      : `https://www.acmicpc.net/problem/${problem.externalId || problem.problemId}`);

  const displayTitle = problem.customTitle || problem.title;
  const displayTags = problem.tags?.slice(0, 2) || [];
  const remainingTagsCount = (problem.tags?.length || 0) - 2;

  const handleOpenExternal = () => {
    if (!problemUrl) return;

    const screenAvailWidth = window.screen.availWidth;
    const screenAvailHeight = window.screen.availHeight;
    const halfWidth = Math.floor(screenAvailWidth / 2);
    const screenLeft = (window.screen as any).availLeft || 0;
    const screenTop = (window.screen as any).availTop || 0;

    setIsLeftPanelFolded(true);
    setIsRightPanelFolded(true);

    window.postMessage({
      type: 'PEEKLE_WINDOW_SPLIT',
      payload: {
        url: problemUrl,
        leftWindow: { left: screenLeft, top: screenTop, width: halfWidth, height: screenAvailHeight },
        rightWindow: { left: screenLeft + halfWidth, top: screenTop, width: halfWidth, height: screenAvailHeight }
      }
    }, '*');
  };

  const getBadgeText = () => {
    if (problem.type === 'BOJ') return '[BOJ]';
    if (problem.type === 'PGS') return '[PGS]';
    if (problem.type === 'CUSTOM') return '[Custom]';
    return '[BOJ]'; // fallback
  };

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
        'group relative rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md cursor-pointer',
        isSelected
          ? 'border-primary ring-1 ring-primary bg-primary/5'
          : 'border-border hover:border-primary/30',
        className,
      )}
    >
      {/* Line 1: Badge + Title + External Link (hover) + Delete (owner) */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
          <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
            {getBadgeText()}
          </span>
          <span className="text-sm font-medium truncate">{displayTitle}</span>
          {problemUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenExternal();
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              title="바로가기 새 탭"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Delete Button (Owner Only) */}
        {myRole === 'OWNER' && onRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteModalOpen(true);
            }}
            title="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Hint Expansion (if shown) */}
      {showHint && (
        <>
          <Separator className="my-2" />
          <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
            <span className="shrink-0">{problem.tier || 'Unrated'}</span>
            {displayTags.length > 0 && (
              <>
                <span>·</span>
                {displayTags.map((tag, i) => (
                  <span key={tag} className="shrink-0">
                    #{tag}
                    {i < displayTags.length - 1 && ' '}
                  </span>
                ))}
                {remainingTagsCount > 0 && (
                  <span className="shrink-0">+{remainingTagsCount}</span>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Action Buttons + Solved Count */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0",
              isSelected ? "hover:bg-background" : "hover:bg-accent"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setShowHint(!showHint);
            }}
            title="힌트"
          >
            <Lightbulb className={cn('h-4 w-4', showHint && 'text-yellow-500 fill-yellow-500')} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0",
              isSelected ? "hover:bg-background" : "hover:bg-accent"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setIsTestcaseModalOpen(true);
            }}
            title="테스트 케이스 검증"
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0",
              isSelected ? "hover:bg-background" : "hover:bg-accent"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onOpenDescription?.();
            }}
            title="메모"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0",
              isSelected ? "hover:bg-background" : "hover:bg-accent"
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (!isCustom) {
                onOpenSubmission?.(problem.problemId!);
              }
            }}
            disabled={isCustom}
            title="문제보관함"
          >
            <Users className="h-4 w-4" />
          </Button>
        </div>

        {/* Solved Count */}
        <span className="text-xs text-muted-foreground shrink-0">
          해결 {problem.solvedMemberCount ?? 0}/{problem.totalMemberCount ?? 0}
        </span>
      </div>

      {/* Delete Confirmation Modal */}
      <ActionModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          onRemove?.();
          setIsDeleteModalOpen(false);
        }}
        title="문제 삭제"
        description={`"${displayTitle}" 문제를 커리큘럼에서 삭제하시겠습니까?\n\n삭제 시 해당 문제의 제출 기록은 유지되지만, 오늘의 커리큘럼에서 제거됩니다.`}
        confirmText="삭제"
        cancelText="취소"
        variant="destructive"
      />

      {/* Testcase Runner Modal */}
      <CCTestcaseRunnerModal
        roomId={useRoomStore.getState().roomId}
        studyProblemId={(problem as any).studyProblemId || (problem as any).id || null}
        problemTitle={displayTitle}
        isOpen={isTestcaseModalOpen}
        onClose={() => setIsTestcaseModalOpen(false)}
      />
    </div>
  );
}
