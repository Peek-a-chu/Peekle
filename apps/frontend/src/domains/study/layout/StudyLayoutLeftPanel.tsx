'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ProblemListPanel } from '@/domains/study/components';
import { useStudyRoomLogic } from '@/domains/study/hooks/useStudyRoomLogic';
import { useStudyStore } from '@/domains/study/store/useStudyStore';

const LEFT_PANEL_MIN_WIDTH = 220;
const LEFT_PANEL_MAX_WIDTH = 420;

export function StudyLayoutLeftPanel() {
  const {
    problems,
    onAddProblemHandler,
    handleSelectProblem,
    selectedStudyProblemId,
    historyDates,
    submissions,
    fetchSubmissions,
  } = useStudyRoomLogic();

  const {
    isLeftPanelFolded,
    toggleLeftPanel,
    selectedDate,
    setSelectedDate,
    leftPanelWidth,
    setLeftPanelWidth,
  } = useStudyStore();

  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const clampWidth = useCallback((width: number) => {
    return Math.max(LEFT_PANEL_MIN_WIDTH, Math.min(LEFT_PANEL_MAX_WIDTH, width));
  }, []);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isLeftPanelFolded) return;
    dragStateRef.current = { startX: event.clientX, startWidth: leftPanelWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    const nextWidth = clampWidth(
      dragStateRef.current.startWidth + (event.clientX - dragStateRef.current.startX),
    );
    setLeftPanelWidth(nextWidth);
  };

  const handleResizeEnd = () => {
    dragStateRef.current = null;
  };

  return (
    <aside
      className={cn(
        'relative shrink-0 overflow-y-auto overflow-x-visible border-r border-border bg-card transition-all duration-300 ease-in-out',
        isLeftPanelFolded ? 'w-0 border-r-0 overflow-hidden' : '',
        // Removed fixed height class causing visual issues
      )}
      style={!isLeftPanelFolded ? { width: leftPanelWidth } : undefined}
    >
      <div className="h-full" style={!isLeftPanelFolded ? { width: leftPanelWidth } : undefined}>
        <ProblemListPanel
          problems={problems}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onAddProblem={onAddProblemHandler}
          onSelectProblem={handleSelectProblem}
          selectedStudyProblemId={selectedStudyProblemId}
          onToggleFold={toggleLeftPanel}
          isFolded={isLeftPanelFolded}
          submissions={submissions}
          onFetchSubmissions={(problemId) => void fetchSubmissions(problemId)}
          historyDates={historyDates}
        />
      </div>
      {!isLeftPanelFolded && (
        <div
          role="separator"
          aria-orientation="vertical"
          className="absolute -right-1 top-0 z-30 h-full w-5 cursor-col-resize bg-border/20 hover:bg-border/70 active:bg-border select-none touch-none"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
          onDoubleClick={() => setLeftPanelWidth(256)}
        />
      )}
    </aside>
  );
}
