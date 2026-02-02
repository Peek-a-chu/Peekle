'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface WorkbooksHeaderProps {
  onCreateClick?: () => void;
  className?: string;
}

export function WorkbooksHeader({ onCreateClick, className }: WorkbooksHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <h1 className="text-2xl font-bold text-foreground">문제집</h1>
      <Button onClick={onCreateClick} className="bg-primary hover:bg-primary-dark text-white gap-1">
        <Plus className="h-4 w-4" />
        새로 만들기
      </Button>
    </div>
  );
}
