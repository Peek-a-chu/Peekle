'use client';

import { cn } from '@/lib/utils';
import { StudyHeader } from '@/domains/study/components';
import { useStudyRoomLogic } from '@/domains/study/hooks/useStudyRoomLogic';
import { useStudyStore } from '@/domains/study/store/useStudyStore';

interface BaseProps {
  className?: string;
}

export function StudyLayoutHeader({ className }: BaseProps) {
  const { handleBack, handleAddProblem, handleInvite, handleSettings } = useStudyRoomLogic();
  const { selectedDate, setSelectedDate } = useStudyStore();

  return (
    <header className={cn('shrink-0 border-b border-border', className)}>
      <StudyHeader
        onBack={handleBack}
        onAddProblem={handleAddProblem}
        onInvite={handleInvite}
        onSettings={handleSettings}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />
    </header>
  );
}
