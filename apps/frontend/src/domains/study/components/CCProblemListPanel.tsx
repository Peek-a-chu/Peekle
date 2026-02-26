'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, FileText, Plus, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CCCalendarWidget, CCInlineCalendar } from './CCCalendarWidget';
import { CCProblemCard } from './CCProblemCard';
import { StudyProblem, Submission } from '@/domains/study/types';
import { CCSubmissionViewerModal } from './CCSubmissionViewerModal';
import { CCAddProblemModal } from './CCAddProblemModal';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { CCCustomProblemView } from './CCCustomProblemView';

// Re-export Problem type from types.ts to maintain potential compatibility if imported elsewhere
export type { StudyProblem as Problem } from '@/domains/study/types';

export interface CCProblemListPanelProps {
  problems?: StudyProblem[];
  selectedStudyProblemId?: number;
  onSelectProblem?: (problem: StudyProblem) => void;
  className?: string;
  onToggleFold: () => void;
  isFolded: boolean;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAddProblem?: (
    title: string,
    number: number | null,
    tags?: string[],
    problemId?: number,
    date?: string,
    customLink?: string,
  ) => Promise<void>;
  onRemoveProblem?: (problemId: number, studyProblemId?: number) => Promise<void>;
  submissions?: Submission[];
  onFetchSubmissions?: (problemId: number) => void;
  historyDates?: Date[];
  showFoldButton?: boolean;
}

export function CCProblemListPanel({
  problems = [],
  selectedStudyProblemId,
  onSelectProblem,
  className,
  onToggleFold,
  selectedDate,
  onDateChange,
  onAddProblem,
  onRemoveProblem,
  submissions = [],
  onFetchSubmissions,
  historyDates,
  showFoldButton = true,
}: CCProblemListPanelProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [addProblemModalOpen, setAddProblemModalOpen] = useState(false);
  const [selectedSubmissionProblemId, setSelectedSubmissionProblemId] = useState<number | null>(
    null,
  );
  // State for Flip/Custom View
  const [isFlipped, setIsFlipped] = useState(false);
  const [panelWidth, setPanelWidth] = useState(300);
  const containerRef = useRef<HTMLDivElement>(null);

  const setViewMode = useRoomStore((state) => state.setViewMode);
  const setTargetSubmission = useRoomStore((state) => state.setTargetSubmission);

  // Get roomId from store
  const roomId = useRoomStore((state) => state.roomId);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPanelWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isCompact = panelWidth < 260;


  const handleDateSelect = (date: Date) => {
    onDateChange(date);
    setIsCalendarOpen(false);
  };

  const handleOpenSubmission = (problemId: number) => {
    setSelectedSubmissionProblemId(problemId);
    setSubmissionModalOpen(true);
    onFetchSubmissions?.(problemId);
  };

  const handleViewCode = (submissionId: number) => {
    const submission = submissions.find((s) => s.submissionId === submissionId);
    if (!submission) return;

    // Use selectedProblem from outer scope logic or find it here
    const currentProblem = problems.find((p) => p.problemId === selectedSubmissionProblemId);

    setTargetSubmission({
      id: submission.submissionId!,
      problemId: currentProblem?.problemId,
      problemTitle: currentProblem ? currentProblem.title : 'Unknown Problem',
      username: submission.nickname || 'Unknown',
      language: submission.language || 'plaintext',
      memory: submission.memory || 0,
      executionTime: submission.executionTime || 0,
      code: submission.code || '// No code available',
    });
    setViewMode('SPLIT_SAVED');
    setSubmissionModalOpen(false);
  };

  const handleAddProblem = async (
    title: string,
    number: number | null,
    tags?: string[],
    problemId?: number,
    date?: string,
    customLink?: string,
  ) => {
    if (onAddProblem) {
      await onAddProblem(title, number, tags, problemId, date, customLink);
    }
  };

  const handleRemoveProblem = async (problemId: number, studyProblemId?: number) => {
    if (onRemoveProblem) {
      // Pass studyProblemId if your remove handler supports it.
      // Ideally the parent onRemoveProblem should take (problemId, studyProblemId)
      // For now we just call it with problemId, but we might need to update props interface if we want to support strict removal.
      // But looking at useProblems/useSocket, we updated them to take studyProblemId.
      // We should update the interface of onRemoveProblem here too.
      await onRemoveProblem(problemId, studyProblemId);
    }
  };

  // Logic to find current selected problem object
  const currentSelectedProblem = problems.find((p) => {
    const pId = (p as any).studyProblemId ?? (p as any).id;
    return pId === selectedStudyProblemId;
  });

  const selectedProblem = problems.find((p) => p.problemId === selectedSubmissionProblemId);

  const handleOpenDescription = (problem: StudyProblem) => {
    onSelectProblem?.(problem);
    setIsFlipped(true);
  };

  // If flipped and we have a selected problem, show the custom view
  if (isFlipped && selectedStudyProblemId && currentSelectedProblem && roomId) {
    return (
      <CCCustomProblemView
        studyId={roomId}
        problemId={selectedStudyProblemId}
        problemTitle={currentSelectedProblem.title}
        externalLink={
          currentSelectedProblem.type === 'CUSTOM'
            ? (currentSelectedProblem as any).customLink
            : `https://www.acmicpc.net/problem/${currentSelectedProblem.externalId}`
        }
        onBack={() => setIsFlipped(false)}
        className={className}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('flex h-full flex-col relative bg-card', className)}
      data-tour="problem-list"
    >
      {/* Top Row: Date, Add Button & Fold Button */}
      <div className="flex items-center justify-between px-3 h-14 shrink-0 border-b border-border">
        <CCCalendarWidget
          selectedDate={selectedDate}
          isOpen={isCalendarOpen}
          onToggle={() => setIsCalendarOpen(!isCalendarOpen)}
          compact={isCompact}
        />
        <div className="flex items-center gap-2">


          <Button
            onClick={() => setAddProblemModalOpen(true)}
            className={cn(
              "bg-primary hover:bg-primary/90 text-white h-8 text-xs shadow-sm",
              isCompact ? "px-2" : "px-3"
            )}
            title={isCompact ? "문제 추가" : undefined}
          >
            <Plus className={cn("h-3 w-3", !isCompact && "mr-1")} />
            {!isCompact && "문제 추가"}
          </Button>
          {showFoldButton && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground p-0 h-8 gap-4"
              onClick={onToggleFold}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Inline Calendar */}
      {isCalendarOpen && (
        <CCInlineCalendar
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
          historyDates={historyDates}
        />
      )}

      {/* Problem List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!problems || problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="mb-2 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">아직 추가된 문제가 없습니다</p>
            <p className="text-xs text-muted-foreground">
              상단의 &quot;문제 추가&quot; 버튼을 눌러주세요
            </p>
          </div>
        ) : (
          <ul className="space-y-3 p-4">
            {(problems || []).map((problem, idx) => {
              const studyProblemId = Number((problem as any).studyProblemId ?? (problem as any).id);
              // Some API responses may include duplicate/missing problemId; ensure a stable unique key.
              const key =
                Number.isFinite(studyProblemId) && studyProblemId > 0
                  ? `problem-${studyProblemId}`
                  : typeof problem.problemId === 'number' && Number.isFinite(problem.problemId)
                    ? `problem-${problem.problemId}`
                    : `problem-${problem.title || 'unknown'}-${idx}`;
              return (
                <li key={key}>
                  <CCProblemCard
                    problem={problem}
                    isSelected={selectedStudyProblemId === studyProblemId}
                    onSelect={() => onSelectProblem?.(problem)}
                    onOpenSubmission={handleOpenSubmission}
                    onRemove={
                      onRemoveProblem ? () => handleRemoveProblem(problem.problemId, studyProblemId) : undefined
                    }
                    onOpenDescription={() => handleOpenDescription(problem)}
                    isCompact={isCompact}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CCSubmissionViewerModal
        isOpen={submissionModalOpen}
        onClose={() => setSubmissionModalOpen(false)}
        problemTitle={selectedProblem ? selectedProblem.title : ''}
        problemExternalId={selectedProblem ? selectedProblem.externalId : undefined}
        submissions={submissions}
        onViewCode={handleViewCode}
      />

      <CCAddProblemModal
        isOpen={addProblemModalOpen}
        onClose={() => setAddProblemModalOpen(false)}
        onAdd={handleAddProblem}
        onRemove={handleRemoveProblem}
        currentProblems={problems}
      />
    </div>
  );
}
