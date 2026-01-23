'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CCCalendarWidget, CCInlineCalendar } from './CCCalendarWidget';
import { CCProblemCard } from './CCProblemCard';
import { Problem, Submission } from '@/domains/study/types';
import { CCSubmissionViewerModal } from './CCSubmissionViewerModal';
import { CCAddProblemModal } from './CCAddProblemModal';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';

// Re-export Problem type from types.ts to maintain potential compatibility if imported elsewhere
export type { Problem } from '@/domains/study/types';

export interface CCProblemListPanelProps {
  problems?: Problem[];
  selectedProblemId?: number;
  onSelectProblem?: (problemId: number) => void;
  className?: string;
  onToggleFold: () => void;
  isFolded: boolean;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAddProblem?: (title: string, number: number, tags?: string[]) => Promise<void>;
  onRemoveProblem?: (problemId: number) => Promise<void>;
  submissions?: Submission[];
  onFetchSubmissions?: (problemId: number) => void;
  historyDates?: Date[];
}

export function CCProblemListPanel({
  problems = [],
  selectedProblemId,
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
    const submission = submissions.find((s) => s.id === submissionId);
    if (!submission) return;

    // Use selectedProblem from outer scope logic or find it here
    const currentProblem = problems.find(p => p.id === selectedSubmissionProblemId);
    
    setTargetSubmission({
      id: submission.id,
      problemTitle: currentProblem ? `${currentProblem.number}. ${currentProblem.title}` : 'Unknown Problem',
      username: submission.username,
      language: submission.language,
      memory: submission.memory,
      executionTime: submission.time,
      code: submission.code || '// No code available',
    });
    setViewMode('SPLIT_SAVED');
    setSubmissionModalOpen(false);
  };

  const handleAddProblem = async (title: string, number: number, tags?: string[]) => {
    if (onAddProblem) {
      await onAddProblem(title, number, tags);
    }
  };

  const handleRemoveProblem = async (problemId: number) => {
    if (onRemoveProblem) {
      await onRemoveProblem(problemId);
    }
  };

  const selectedProblem = problems.find((p) => p.id === selectedSubmissionProblemId);

  return (
    <div className={cn('flex h-full flex-col relative bg-card', className)}>
      {/* Top Row: Fold Button */}
      <div className="flex items-center px-4 py-2 shrink-0 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground p-0 h-8 gap-1"
          onClick={onToggleFold}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm font-medium">접기</span>
        </Button>
      </div>

      {/* Second Row: Date & Add Button */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-border">
        <CCCalendarWidget
          selectedDate={selectedDate}
          isOpen={isCalendarOpen}
          onToggle={() => setIsCalendarOpen(!isCalendarOpen)}
        />
        <Button
          onClick={() => setAddProblemModalOpen(true)}
          className="bg-pink-500 hover:bg-pink-600 text-white h-8 text-xs px-3 shadow-sm"
        >
          <Plus className="mr-1 h-3 w-3" />
          문제 추가
        </Button>
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
        {problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="mb-2 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">아직 추가된 문제가 없습니다</p>
            <p className="text-xs text-muted-foreground">
              상단의 &quot;문제 추가&quot; 버튼을 눌러주세요
            </p>
          </div>
        ) : (
          <ul className="space-y-3 p-4">
            {problems.map((problem) => (
              <li key={problem.id}>
                <CCProblemCard
                  problem={{
                    ...problem,
                    url: `https://www.acmicpc.net/problem/${problem.number}`,
                  }}
                  isSelected={selectedProblemId === problem.id}
                  onSelect={() => onSelectProblem?.(problem.id)}
                  onOpenSubmission={handleOpenSubmission}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <CCSubmissionViewerModal
        isOpen={submissionModalOpen}
        onClose={() => setSubmissionModalOpen(false)}
        problemTitle={selectedProblem ? selectedProblem.title : ''}
        problemNumber={selectedProblem ? selectedProblem.number : undefined}
        submissions={submissions}
        onViewCode={handleViewCode}
      />

      <CCAddProblemModal
        isOpen={addProblemModalOpen}
        onClose={() => setAddProblemModalOpen(false)}
        onAdd={handleAddProblem}
        onRemove={handleRemoveProblem}
      />
    </div>
  );
}
