'use client';

import { cn } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

interface CCWorkbookEmptyProps {
  message?: string;
  className?: string;
}

export function CCWorkbookEmpty({
  message = '문제집을 선택하세요.',
  className,
}: CCWorkbookEmptyProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-full text-muted-foreground gap-4',
        className
      )}
    >
      <BookOpen className="h-16 w-16 text-pink-200" strokeWidth={1} />
      <p className="text-sm">{message}</p>
    </div>
  );
}
