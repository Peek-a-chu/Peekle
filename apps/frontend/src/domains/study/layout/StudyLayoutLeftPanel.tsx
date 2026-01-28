'use client';

import { cn } from '@/lib/utils';
import { ProblemListPanel } from '@/domains/study/components';
import { useStudyRoomLogic } from '@/domains/study/hooks/useStudyRoomLogic';
import { useStudyStore } from '@/domains/study/store/useStudyStore';

export function StudyLayoutLeftPanel() {
  const {
    problems,
    handleAddProblem,
    handleSelectProblem,
    selectedProblemId,
    historyDates,
    submissions,
    fetchSubmissions,
  } = useStudyRoomLogic();

  const { isLeftPanelFolded, toggleLeftPanel, selectedDate, setSelectedDate } = useStudyStore();

  return (
    <aside
      className={cn(
        'shrink-0 overflow-y-auto overflow-x-hidden border-r border-border bg-card transition-all duration-300 ease-in-out',
        isLeftPanelFolded ? 'w-0 border-r-0 overflow-hidden' : 'w-64',
        // Removed fixed height class causing visual issues
      )}
    >
      <div className="w-64 h-full">
        <ProblemListPanel
          problems={problems}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onAddProblem={handleAddProblem}
          onSelectProblem={handleSelectProblem}
          selectedProblemId={selectedProblemId}
          onToggleFold={toggleLeftPanel}
          isFolded={isLeftPanelFolded}
          submissions={submissions}
          onFetchSubmissions={(problemId) => void fetchSubmissions(problemId)}
          historyDates={historyDates}
        />
      </div>
    </aside>
  );
}
