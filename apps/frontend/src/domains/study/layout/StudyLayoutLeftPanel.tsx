'use client';

import { cn } from '@/lib/utils';
import { ProblemListPanel } from '@/domains/study/components';
import { useStudyRoomLogic } from '@/domains/study/hooks/useStudyRoomLogic';
import { useStudyStore } from '@/domains/study/store/useStudyStore';

interface BaseProps {
  className?: string;
}

export function StudyLayoutLeftPanel({ className }: BaseProps) {
  const {
    mockProblems,
    handleAddProblem,
    handleSelectProblem,
  } = useStudyRoomLogic();

  const {
    isLeftPanelFolded,
    toggleLeftPanel,
    selectedDate,
    setSelectedDate,
  } = useStudyStore();

  return (
    <aside
      className={cn(
        'shrink-0 overflow-y-auto overflow-x-hidden border-r border-border bg-card transition-all duration-300 ease-in-out',
        isLeftPanelFolded ? 'w-0 border-r-0 overflow-hidden' : 'w-64',
        className,
      )}
    >
      <div className="w-64 h-full">
        <ProblemListPanel
          problems={mockProblems}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onAddProblem={handleAddProblem}
          onSelectProblem={handleSelectProblem}
          onToggleFold={toggleLeftPanel}
          isFolded={isLeftPanelFolded}
        />
      </div>
    </aside>
  );
}
