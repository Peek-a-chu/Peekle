'use client';

import { cn } from '@/lib/utils';
import { RightPanel } from '@/domains/study/components';
import { useStudyStore } from '@/domains/study/store/useStudyStore';

interface BaseProps {
  className?: string;
}

export function StudyLayoutRightPanel({ className }: BaseProps) {
  const { foldRightPanel, isRightPanelFolded } = useStudyStore();

  return (
    <aside
      className={cn(
        'shrink-0 overflow-y-auto overflow-x-hidden border-l border-border bg-card transition-all duration-300 ease-in-out',
        isRightPanelFolded ? 'w-0 border-l-0 overflow-hidden' : 'w-80',
        className,
      )}
    >
      <div className="w-80 h-full">
        <RightPanel onFold={foldRightPanel} />
      </div>
    </aside>
  );
}
