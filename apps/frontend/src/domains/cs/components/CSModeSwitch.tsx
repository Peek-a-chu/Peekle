'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BookOpen, FileCheck } from 'lucide-react';

export default function CSModeSwitch() {
  const pathname = usePathname();
  const router = useRouter();

  // If we are currently in /cs/past-exams, mode is 'past-exams'. 
  // Normally /cs/wrong-problems is sort of separate, but we can preserve the switch or hide it.
  const isPastExams = pathname?.includes('/cs/past-exams');

  const handleModeChange = (mode: 'curriculum' | 'past-exams') => {
    if (mode === 'curriculum') {
      router.push('/cs');
    } else {
      router.push('/cs/past-exams');
    }
  };

  return (
    <div className="flex w-full max-w-sm mx-auto mb-6 p-1 bg-muted rounded-xl shadow-inner">
      <button
        onClick={() => handleModeChange('curriculum')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold transition-all duration-300',
          !isPastExams
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <BookOpen className="w-4 h-4" />
        커리큘럼 학습
      </button>
      <button
        onClick={() => handleModeChange('past-exams')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold transition-all duration-300',
          isPastExams
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <FileCheck className="w-4 h-4" />
        정보처리기사 기출
      </button>
    </div>
  );
}
