'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CCCalendarWidget, CCInlineCalendar } from './CCCalendarWidget';
import { CCProblemCard } from './CCProblemCard';
import { DailyProblem, Submission } from '@/domains/study/types';
import { CCSubmissionViewerModal } from './CCSubmissionViewerModal';
import { CCAddProblemModal } from './CCAddProblemModal';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';

// Re-export Problem type from types.ts to maintain potential compatibility if imported elsewhere
export type { DailyProblem as Problem } from '@/domains/study/types';

export interface CCProblemListPanelProps {
  problems?: DailyProblem[];
  selectedStudyProblemId?: number;
  onSelectProblem?: (problem: DailyProblem) => void;
  className?: string;
  onToggleFold: () => void;
  isFolded: boolean;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAddProblem?: (
    title: string,
    number: number,
    tags?: string[],
    problemId?: number,
  ) => Promise<void>;
  onRemoveProblem?: (problemId: number) => Promise<void>;
  submissions?: Submission[];
  onFetchSubmissions?: (problemId: number) => void;
  historyDates?: Date[];
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
}: CCProblemListPanelProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [addProblemModalOpen, setAddProblemModalOpen] = useState(false);
  const [selectedSubmissionProblemId, setSelectedSubmissionProblemId] = useState<number | null>(
    null,
  );

  const setViewMode = useRoomStore((state) => state.setViewMode);
  const setTargetSubmission = useRoomStore((state) => state.setTargetSubmission);

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
    number: number,
    tags?: string[],
    problemId?: number,
  ) => {
    if (onAddProblem) {
      await onAddProblem(title, number, tags, problemId);
    }
  };

  const handleRemoveProblem = async (problemId: number) => {
    if (onRemoveProblem) {
      await onRemoveProblem(problemId);
    }
  };

  const selectedProblem = problems.find((p) => p.problemId === selectedSubmissionProblemId);

  return (
    <div className={cn('flex h-full flex-col relative bg-card', className)} data-tour="problem-list">
      {/* Top Row: Date, Add Button & Fold Button */}
      <div className="flex items-center justify-between px-3 h-14 shrink-0 border-b border-border">
        <CCCalendarWidget
          selectedDate={selectedDate}
          isOpen={isCalendarOpen}
          onToggle={() => setIsCalendarOpen(!isCalendarOpen)}
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAddProblemModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white h-8 text-xs px-3 shadow-sm"
          >
            <Plus className="mr-1 h-3 w-3" />
            문제 추가
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground p-0 h-8 gap-4"
            onClick={onToggleFold}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
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
              // Some API responses may include duplicate/missing problemId; ensure a stable unique key.
              const key =
                typeof problem.problemId === 'number' && Number.isFinite(problem.problemId)
                  ? `problem-${problem.problemId}`
                  : `problem-${problem.title || 'unknown'}-${idx}`;
              return (
                <li key={key}>
                  <CCProblemCard
                    problem={problem}
                    isSelected={selectedStudyProblemId === problem.problemId}
                    onSelect={() => onSelectProblem?.(problem)}
                    onOpenSubmission={handleOpenSubmission}
                    onRemove={
                      onRemoveProblem ? () => handleRemoveProblem(problem.problemId) : undefined
                    }
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
