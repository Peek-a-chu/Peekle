'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';

export interface StudyLayoutContentProps {
  header: ReactNode | null;
  leftPanel: ReactNode | null;
  centerPanel: ReactNode | null;
  rightPanel: ReactNode | null;
  isLeftPanelFolded: boolean;
  onUnfoldLeftPanel: () => void;
  isRightPanelFolded: boolean;
  onUnfoldRightPanel: () => void;
  className?: string;
}

export function StudyLayoutContent({
  header,
  leftPanel,
  centerPanel,
  rightPanel,
  isLeftPanelFolded,
  onUnfoldLeftPanel,
  isRightPanelFolded,
  onUnfoldRightPanel,
  className,
}: StudyLayoutContentProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      {header && <header className="shrink-0 border-b border-border">{header}</header>}

      {/* Main Content */}
      <div className="relative flex min-h-0 flex-1">
        {/* Left Panel - Animation handled by width */}
        <aside
          className={cn(
            'shrink-0 overflow-y-auto overflow-x-hidden border-r border-border bg-card transition-all duration-300 ease-in-out',
            isLeftPanelFolded ? 'w-0 border-r-0 overflow-hidden' : 'w-64',
          )}
        >
          <div className="w-64 h-full">
            {/* Inner container to maintain width during transition */}
            {leftPanel}
          </div>
        </aside>

        {/* Center Panel */}
        <main
          className={cn(
            'relative flex min-w-0 flex-1 flex-col transition-all duration-300',
            isLeftPanelFolded && 'pl-12',
            isRightPanelFolded && 'pr-12',
          )}
        >
          {/* Unfold Left Panel Button - Visible only when left folded */}
          {isLeftPanelFolded && (
            <div className="absolute left-2 top-2 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={onUnfoldLeftPanel}
                className="h-8 w-8 bg-background/80 shadow-sm backdrop-blur hover:bg-background"
                title="문제 목록 펼치기"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Unfold Right Panel Button - Visible only when right folded */}
          {isRightPanelFolded && (
            <div className="absolute right-2 top-2 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={onUnfoldRightPanel}
                className="h-8 w-8 bg-background/80 shadow-sm backdrop-blur hover:bg-background"
                title="채팅/참여자 펼치기"
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </div>
          )}

          {centerPanel}
        </main>
      </div>
    </div>
  );
}
