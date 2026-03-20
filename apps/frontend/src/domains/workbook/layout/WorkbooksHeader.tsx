'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CCMainPageHeader } from '@/components/common/CCMainPageHeader';

interface WorkbooksHeaderProps {
  onCreateClick?: () => void;
  className?: string;
  showCreate?: boolean;
}

export function WorkbooksHeader({
  onCreateClick,
  className,
  showCreate = true,
}: WorkbooksHeaderProps) {
  return (
    <CCMainPageHeader
      title="문제집"
      className={cn('mb-0', className)}
      actions={
        showCreate ? (
          <Button onClick={onCreateClick} className="bg-primary hover:bg-primary-dark text-white gap-1">
            <Plus className="h-4 w-4" />
            새로 만들기
          </Button>
        ) : undefined
      }
    />
  );
}
