'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { useStudyStore } from '@/domains/study/store/useStudyStore';

interface BaseProps {
  className?: string;
}

export function StudyLayoutCenter({
  children,
  className,
}: { children: ReactNode } & BaseProps) {
  const {
    isLeftPanelFolded,
    isRightPanelFolded,
    unfoldLeftPanel,
    unfoldRightPanel,
  } = useStudyStore();

  return (
    <main
      className={cn(
        'relative flex min-w-0 flex-1 flex-col transition-all duration-300',
        isLeftPanelFolded && 'pl-12',
        isRightPanelFolded && 'pr-12',
        className,
      )}
    >
      {isLeftPanelFolded && (
        <div className="absolute left-2 top-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={unfoldLeftPanel}
            className="h-8 w-8 bg-background/80 shadow-sm backdrop-blur hover:bg-background"
            title="문제 목록 펼치기"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isRightPanelFolded && (
        <div className="absolute right-2 top-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={unfoldRightPanel}
            className="h-8 w-8 bg-background/80 shadow-sm backdrop-blur hover:bg-background"
            title="채팅/참여자 펼치기"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      )}

      {children}
    </main>
  );
}
