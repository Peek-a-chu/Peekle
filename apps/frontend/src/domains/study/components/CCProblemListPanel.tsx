'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  FileText,
  CheckCircle2,
  Plus,
  ExternalLink,
  Users,
  Lightbulb,
  Box,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CCCalendarWidget, CCInlineCalendar } from './CCCalendarWidget';

export interface Problem {
  id: number;
  title: string;
  source: string;
  status: 'not_started' | 'in_progress' | 'completed';
  tags?: string[];
  participantCount?: number;
  totalParticipants?: number;
  url?: string;
}

export interface CCProblemListPanelProps {
  problems?: Problem[];
  selectedProblemId?: number;
  onSelectProblem?: (problemId: number) => void;
  className?: string;
  onToggleFold: () => void;
  isFolded: boolean;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAddProblem?: () => void;
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
}: CCProblemListPanelProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDateSelect = (date: Date) => {
    onDateChange(date);
    setIsCalendarOpen(false);
  };

  return (
    <div className={cn('flex h-full flex-col relative', className)}>
      {/* Panel Header */}
      <div className="flex bg-card items-center justify-between border-b border-border px-4 h-14 shrink-0">
        <CCCalendarWidget
          selectedDate={selectedDate}
          isOpen={isCalendarOpen}
          onToggle={() => setIsCalendarOpen(!isCalendarOpen)}
        />

        <div className="flex items-center gap-2">
          <Button
            onClick={onAddProblem}
            className="bg-pink-500 hover:bg-pink-600 text-white h-8 text-sm px-3"
          >
            <Plus className="mr-1 h-3 w-3" />
            문제 추가
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onToggleFold}
            title="접기"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Inline Calendar */}
      {isCalendarOpen && (
        <CCInlineCalendar selectedDate={selectedDate} onSelectDate={handleDateSelect} />
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
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectProblem?.(problem.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelectProblem?.(problem.id);
                    }
                  }}
                  className={cn(
                    'relative rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md cursor-pointer group',
                    selectedProblemId === problem.id
                      ? 'border-pink-500 ring-1 ring-pink-500 bg-pink-50/10'
                      : 'border-border hover:border-pink-200',
                  )}
                >
                  {/* Top Row: Title & Icons */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{problem.title}</span>
                      {problem.url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(problem.url, '_blank', 'noreferrer');
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-transparent border-none p-0 cursor-pointer"
                          title="문제 풀러 가기"
                        >
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      )}
                    </div>
                    <Lightbulb
                      className={cn(
                        'h-4 w-4',
                        selectedProblemId === problem.id
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-muted-foreground',
                      )}
                    />
                  </div>

                  {/* Tags */}
                  {problem.tags && problem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {problem.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bottom Row: Status & Participants */}
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <Box className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="flex items-center gap-3">
                      {problem.status === 'completed' ? (
                        <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>풀이 완료</span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">진행 중</div>
                      )}

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>
                          {problem.participantCount}/{problem.totalParticipants || 4}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
