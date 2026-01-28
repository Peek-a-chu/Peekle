'use client';

import {
  useRoomStore,
  type ViewMode,
  type Participant,
  type TargetSubmission,
} from '@/domains/study/hooks/useRoomStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Eye, Archive, X } from 'lucide-react';

interface CCViewModeBannerProps {
  viewMode: ViewMode;
  viewingUser: Participant;
  targetSubmission?: TargetSubmission | null;
  className?: string;
}

export function CCViewModeBanner({
  viewMode,
  viewingUser,
  targetSubmission,
  className,
}: CCViewModeBannerProps) {
  const resetToOnlyMine = useRoomStore((state) => state.resetToOnlyMine);

  const isRealtime = viewMode === 'SPLIT_REALTIME';
  const isSaved = viewMode === 'SPLIT_SAVED';

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2',
        isRealtime && 'bg-amber-100 text-amber-800',
        isSaved && 'bg-blue-100 text-blue-800',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {isRealtime ? <Eye className="h-4 w-4" /> : <Archive className="h-4 w-4" />}

        <span className="text-sm font-medium">
          {isRealtime
            ? `${viewingUser?.nickname}의 코드 실시간 열람 중`
            : `${targetSubmission?.username}의 저장 된 코드 열람 중`}
        </span>

        {isSaved && targetSubmission && (
          <span className="text-xs opacity-75">({targetSubmission.problemTitle})</span>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={resetToOnlyMine}
        className={cn('h-7', isRealtime && 'hover:bg-amber-200', isSaved && 'hover:bg-blue-200')}
      >
        <X className="mr-1 h-4 w-4" />내 코드만 보기
      </Button>
    </div>
  );
}
